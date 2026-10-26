import asyncio
import os
import sys
import time
import httpx
from typing import Dict, Any

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.provider import (
    ProviderErrorCode,
    ModelTestRequest,
    ModelTestResponse,
    NormalizedResponse
)
from providers.base import AIProvider
from providers.registry import ProviderRegistry
from providers.openrouter import OpenRouterProvider
from providers.gemini import GeminiProvider
from providers.openai_compatible import OpenAICompatibleProvider
from providers.executor import RequestExecutor, sanitize_error_message, classify_http_error

# ── Mock HTTP Transports for Deterministic Testing ───────────

def make_mock_transport(status_code: int, json_data: Any, headers: Dict[str, str] = None):
    """Creates an httpx.MockTransport that returns a predetermined status and body."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code=status_code,
            json=json_data,
            headers=headers or {"content-type": "application/json"}
        )
    return httpx.MockTransport(handler)

# ── 1. Provider Registry Tests ───────────────────────────────

async def test_registry_basics():
    print("\n--- 1. Testing Provider Registry ---")
    reg = ProviderRegistry()
    providers = await reg.list_providers_response()
    assert len(providers) >= 3, f"Expected at least 3 providers, got {len(providers)}"
    names = [p.name for p in providers]
    assert "openrouter" in names
    assert "gemini" in names
    assert "openai_compatible" in names
    print(f"[PASS] Registry initialized with default providers: {names}")

    # Check safe metadata (zero keys exposed)
    for p in providers:
        assert p.masked_key is None or "••••" in p.masked_key, "API keys must be masked"
        assert not (p.masked_key and p.masked_key.startswith("sk-or-v1-real")), "Never expose raw key"
    print("[PASS] Security verified: API keys are masked or None in client metadata")

    # Unknown provider lookup
    unknown = reg.get_provider("nonexistent_provider")
    assert unknown is None, "Unknown provider should return None"
    print("[PASS] Unknown provider lookup returns None cleanly")

    # List all models
    all_models = await reg.list_all_models()
    assert len(all_models) >= 10, f"Expected at least 10 models, got {len(all_models)}"
    model_ids = [m.id for m in all_models]
    assert "deepseek/deepseek-r1" in model_ids
    assert "gemini-2.0-flash" in model_ids
    print(f"[PASS] Aggregated model list contains {len(all_models)} models with capability tags")

# ── 2. Request Executor & Error Classification Tests ─────────

async def test_error_sanitization_and_classification():
    print("\n--- 2. Testing Error Sanitization & Classification ---")
    raw_leak = "Failed with Bearer sk-or-v1-9876543210abcdef9876543210 at https://api.openai.com?key=sk-secret123"
    sanitized = sanitize_error_message(raw_leak)
    assert "sk-or-v1-9876543210" not in sanitized, "Bearer token must be masked"
    assert "sk-secret123" not in sanitized, "Query key must be masked"
    print(f"[PASS] Error sanitization verified. Sanitized: {sanitized}")

    # Test HTTP Error classification
    err_401 = classify_http_error(401, "Invalid API key provided: Bearer sk-12345678")
    assert err_401.code == ProviderErrorCode.AUTH_FAILED
    assert err_401.retryable is False, "401 must not be retried"
    assert "sk-12345678" not in err_401.message

    err_429 = classify_http_error(429, "Rate limit reached. Please retry after 2 seconds.")
    assert err_429.code == ProviderErrorCode.RATE_LIMITED
    assert err_429.retryable is True, "429 must be retryable"

    err_503 = classify_http_error(503, "Service Unavailable")
    assert err_503.code == ProviderErrorCode.PROVIDER_UNAVAILABLE
    assert err_503.retryable is True, "503 must be retryable"

    print("[PASS] Error classification verified (401 non-retryable, 429/503 retryable with backoff)")

# ── 3. OpenRouter Adapter Mock Tests ─────────────────────────

async def test_openrouter_adapter_mocked():
    print("\n--- 3. Testing OpenRouter Adapter (Mocked HTTP) ---")
    adapter = OpenRouterProvider(api_key="sk-or-test-mock-key")
    assert adapter.is_configured is True

    # 3.1 Mock successful response
    mock_payload = {
        "id": "gen-mock-123",
        "choices": [
            {
                "message": {"content": '{"conclusion": "The hypothesis is sound.", "step": "Proof by induction"}'},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 42,
            "completion_tokens": 18,
            "total_tokens": 60
        }
    }

    # Inject mock transport
    transport = make_mock_transport(200, mock_payload)
    client = httpx.AsyncClient(transport=transport)

    async def mock_call():
        return await client.post("https://openrouter.ai/api/v1/chat/completions", json={})

    resp = await adapter.executor.execute_request(
        provider_id="openrouter",
        model_id="deepseek/deepseek-r1",
        request_func=mock_call,
        parse_func=adapter._parse_chat_response
    )

    assert resp.status == "success"
    assert "The hypothesis is sound" in resp.content
    assert resp.usage.total_tokens == 60
    assert resp.usage.prompt_tokens == 42
    assert resp.parsed_json is not None
    assert resp.parsed_json["step"] == "Proof by induction"
    assert resp.latency_ms > 0
    print(f"[PASS] OpenRouter success parsed: tokens={resp.usage.total_tokens}, latency={resp.latency_ms}ms")

    # 3.2 Mock 401 Unauthorized (should fail immediately without retrying)
    transport_401 = make_mock_transport(401, {"error": {"message": "Invalid API Key: Bearer sk-or-test-mock-key"}})
    client_401 = httpx.AsyncClient(transport=transport_401)
    call_count = 0

    async def mock_call_401():
        nonlocal call_count
        call_count += 1
        return await client_401.post("https://openrouter.ai/api/v1/chat/completions", json={})

    resp_401 = await adapter.executor.execute_request(
        provider_id="openrouter",
        model_id="deepseek/deepseek-r1",
        request_func=mock_call_401,
        parse_func=adapter._parse_chat_response,
        max_retries=2
    )

    assert resp_401.status == "error"
    assert resp_401.error.code == ProviderErrorCode.AUTH_FAILED
    assert call_count == 1, "Permanent 401 error must not be retried!"
    assert "sk-or-test-mock-key" not in resp_401.error.message, "Key must be sanitized from error"
    print("[PASS] OpenRouter 401 permanent error rejected without retrying; key sanitized")

# ── 4. Gemini Adapter Mock Tests ─────────────────────────────

async def test_gemini_adapter_mocked():
    print("\n--- 4. Testing Google Gemini Adapter (Mocked HTTP) ---")
    adapter = GeminiProvider(api_key="ai-za-test-gemini-key")
    assert adapter.is_configured is True

    mock_gemini_openai_payload = {
        "id": "chatcmpl-gemini-123",
        "choices": [
            {
                "message": {"content": "Gemini 2.0 Flash is operational and ready for deliberation."},
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 15,
            "completion_tokens": 12,
            "total_tokens": 27
        }
    }

    transport = make_mock_transport(200, mock_gemini_openai_payload)
    client = httpx.AsyncClient(transport=transport)

    async def mock_call():
        return await client.post("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", json={})

    resp = await adapter.executor.execute_request(
        provider_id="gemini",
        model_id="gemini-2.0-flash",
        request_func=mock_call,
        parse_func=adapter._parse_chat_response
    )

    assert resp.status == "success"
    assert "Gemini 2.0 Flash is operational" in resp.content
    assert resp.usage.total_tokens == 27
    print(f"[PASS] Gemini adapter success parsed: content='{resp.content}', latency={resp.latency_ms}ms")

# ── 5. OpenAI Compatible & Local Inference Detection ─────────

async def test_openai_compatible_and_local():
    print("\n--- 5. Testing OpenAI-Compatible & Local Inference ---")
    # Cloud endpoint without key -> unconfigured
    cloud_adapter = OpenAICompatibleProvider(name="cloud", api_key="", base_url="https://api.openai.com/v1")
    assert cloud_adapter.is_configured is False
    print("[PASS] Cloud OpenAI without API key is correctly detected as unconfigured")

    # Local Ollama endpoint without key -> configured!
    local_ollama = OpenAICompatibleProvider(name="ollama", api_key="", base_url="http://localhost:11434/v1")
    assert local_ollama.is_configured is True
    print("[PASS] Local Ollama (localhost:11434) detected as configured without API key")

# ── 6. Concurrency Control Semaphore Test ────────────────────

async def test_concurrency_semaphore():
    print("\n--- 6. Testing Concurrency Control Semaphore ---")
    executor = RequestExecutor(max_concurrent_per_provider=2)
    active_concurrent = 0
    max_observed = 0

    async def slow_mock_call():
        nonlocal active_concurrent, max_observed
        active_concurrent += 1
        if active_concurrent > max_observed:
            max_observed = active_concurrent
        await asyncio.sleep(0.05)
        active_concurrent -= 1
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    def parse_dummy(r):
        return {"content": "ok"}

    tasks = [
        executor.execute_request(
            provider_id="test_prov",
            model_id="m1",
            request_func=slow_mock_call,
            parse_func=parse_dummy
        )
        for _ in range(5)
    ]
    await asyncio.gather(*tasks)

    assert max_observed <= 2, f"Expected concurrency limit 2, but observed {max_observed}"
    print(f"[PASS] Concurrency semaphore enforced: 5 simultaneous calls throttled to max {max_observed}")

# ── 7. Live Connectivity Verification (Conditional) ──────────

async def test_live_connectivity_if_available():
    print("\n--- 7. Checking Live External Provider Connectivity ---")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")

    if openrouter_key.strip():
        print("OPENROUTER_API_KEY detected in environment. Running genuine live test...")
        adapter = OpenRouterProvider(api_key=openrouter_key)
        res = await adapter.test_connection()
        print(f"OpenRouter Live Result: success={res.success}, latency={res.latency_ms}ms, message={res.message}")
    else:
        print("[REPORT] Live OpenRouter network call skipped: OPENROUTER_API_KEY is not populated in .env.")

    if gemini_key.strip():
        print("GEMINI_API_KEY detected in environment. Running genuine live test...")
        adapter = GeminiProvider(api_key=gemini_key)
        res = await adapter.test_connection()
        print(f"Gemini Live Result: success={res.success}, latency={res.latency_ms}ms, message={res.message}")
    else:
        print("[REPORT] Live Google Gemini network call skipped: GEMINI_API_KEY is not populated in .env.")

# ── Main Test Runner ─────────────────────────────────────────

async def run_all_tests():
    print("============================================================")
    print("DEEP REASON — PHASE 1: PROVIDER INFRASTRUCTURE TEST SUITE")
    print("============================================================")
    await test_registry_basics()
    await test_error_sanitization_and_classification()
    await test_openrouter_adapter_mocked()
    await test_gemini_adapter_mocked()
    await test_openai_compatible_and_local()
    await test_concurrency_semaphore()
    await test_live_connectivity_if_available()
    print("\n============================================================")
    print("ALL PHASE 1 PROVIDER TESTS PASSED WITH 100% OPERATIONAL INTEGRITY!")
    print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
