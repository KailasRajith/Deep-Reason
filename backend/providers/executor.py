import time
import random
import asyncio
import re
import httpx
from typing import Dict, Any, Optional, Callable, Awaitable
from models.provider import (
    NormalizedResponse,
    NormalizedError,
    ProviderErrorCode,
    UsageMetadata
)

# ── Masking & Sanitization Helpers ───────────────────────────

def sanitize_error_message(msg: str) -> str:
    """Strips API keys, bearer tokens, or query parameter keys from error messages."""
    if not msg:
        return "Unknown error"
    # Mask Bearer sk-... or key=...
    msg = re.sub(r"(Bearer\s+)[A-Za-z0-9_\-\.]{8,}", r"\1[MASKED]", msg, flags=re.IGNORECASE)
    msg = re.sub(r"([?&]key=)[A-Za-z0-9_\-\.]{8,}", r"\1[MASKED]", msg, flags=re.IGNORECASE)
    msg = re.sub(r"(sk-[A-Za-z0-9_\-\.]{8,})", r"[MASKED_KEY]", msg, flags=re.IGNORECASE)
    return msg.strip()

def classify_http_error(status_code: int, response_text: str) -> NormalizedError:
    """Classifies an HTTP status code and response body into a normalized error."""
    clean_text = sanitize_error_message(response_text)
    
    if status_code in (401, 403):
        code = ProviderErrorCode.AUTH_FAILED if status_code == 401 else ProviderErrorCode.PERMISSION_DENIED
        return NormalizedError(
            code=code,
            message=f"Authentication or permission failed ({status_code}): {clean_text[:180]}",
            http_status=status_code,
            retryable=False
        )
    elif status_code == 429:
        return NormalizedError(
            code=ProviderErrorCode.RATE_LIMITED,
            message=f"Rate limit exceeded (429): {clean_text[:180]}",
            http_status=429,
            retryable=True
        )
    elif status_code in (500, 502, 503, 504):
        return NormalizedError(
            code=ProviderErrorCode.PROVIDER_UNAVAILABLE,
            message=f"Provider server error ({status_code}): {clean_text[:180]}",
            http_status=status_code,
            retryable=True
        )
    elif status_code == 400:
        return NormalizedError(
            code=ProviderErrorCode.INVALID_REQUEST,
            message=f"Invalid model request (400): {clean_text[:180]}",
            http_status=400,
            retryable=False
        )
    else:
        return NormalizedError(
            code=ProviderErrorCode.UNKNOWN,
            message=f"Provider request failed ({status_code}): {clean_text[:180]}",
            http_status=status_code,
            retryable=False
        )

# ── Reliable Request Executor ────────────────────────────────

class RequestExecutor:
    """
    Manages outbound HTTP model inference requests with concurrency control,
    timeout management, transient retry with exponential backoff & jitter,
    and normalized error classification.
    """
    def __init__(self, max_concurrent_per_provider: int = 6):
        self._semaphores: Dict[str, asyncio.Semaphore] = {}
        self._max_concurrent = max_concurrent_per_provider

    def _get_semaphore(self, provider_id: str) -> asyncio.Semaphore:
        if provider_id not in self._semaphores:
            self._semaphores[provider_id] = asyncio.Semaphore(self._max_concurrent)
        return self._semaphores[provider_id]

    async def execute_request(
        self,
        provider_id: str,
        model_id: str,
        request_func: Callable[[], Awaitable[httpx.Response]],
        parse_func: Callable[[httpx.Response], Dict[str, Any]],
        max_retries: int = 2,
        initial_backoff: float = 1.0,
        timeout_seconds: float = 45.0
    ) -> NormalizedResponse:
        """
        Executes an inference HTTP call guarded by concurrency semaphore,
        timeout, and retries.
        """
        semaphore = self._get_semaphore(provider_id)
        start_time = time.perf_counter()
        last_error: Optional[NormalizedError] = None

        for attempt in range(max_retries + 1):
            try:
                async with semaphore:
                    response = await asyncio.wait_for(
                        request_func(),
                        timeout=timeout_seconds
                    )

                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                # Check HTTP Status
                if response.status_code == 200:
                    parsed_data = parse_func(response)
                    return NormalizedResponse(
                        provider_id=provider_id,
                        model_id=model_id,
                        content=parsed_data.get("content", ""),
                        status="success",
                        latency_ms=latency_ms,
                        usage=parsed_data.get("usage", UsageMetadata()),
                        finish_reason=parsed_data.get("finish_reason", "stop"),
                        request_id=parsed_data.get("request_id"),
                        parsed_json=parsed_data.get("parsed_json")
                    )
                else:
                    norm_err = classify_http_error(response.status_code, response.text)
                    last_error = norm_err

                    # If not retryable, break immediately
                    if not norm_err.retryable or attempt >= max_retries:
                        break

                    # Check for Retry-After header
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        sleep_time = min(float(retry_after), 10.0)
                    else:
                        sleep_time = initial_backoff * (2 ** attempt) + random.uniform(0.1, 0.5)

                    await asyncio.sleep(sleep_time)

            except asyncio.TimeoutError:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                last_error = NormalizedError(
                    code=ProviderErrorCode.TIMEOUT,
                    message=f"Request to {provider_id}:{model_id} timed out after {timeout_seconds}s.",
                    retryable=False
                )
                break

            except httpx.ConnectError as e:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                last_error = NormalizedError(
                    code=ProviderErrorCode.NETWORK_ERROR,
                    message=f"Network connectivity error contacting {provider_id}: {sanitize_error_message(str(e))}",
                    retryable=True
                )
                if attempt >= max_retries:
                    break
                await asyncio.sleep(initial_backoff * (2 ** attempt) + random.uniform(0.1, 0.4))

            except asyncio.CancelledError:
                raise

            except Exception as e:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                last_error = NormalizedError(
                    code=ProviderErrorCode.UNKNOWN,
                    message=f"Unexpected exception during call to {provider_id}: {sanitize_error_message(str(e))}",
                    retryable=False
                )
                break

        total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return NormalizedResponse(
            provider_id=provider_id,
            model_id=model_id,
            content="",
            status="error",
            latency_ms=total_latency_ms,
            usage=UsageMetadata(),
            error=last_error or NormalizedError(
                code=ProviderErrorCode.UNKNOWN,
                message="Unknown execution error occurred."
            )
        )

# Global singleton executor
request_executor = RequestExecutor()
