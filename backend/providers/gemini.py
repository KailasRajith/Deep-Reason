import time
import httpx
from typing import List, Optional, Dict, Any
from providers.base import AIProvider
from models.provider import (
    ModelInfo,
    ModelCapabilities,
    ModelPricing,
    ProviderHealthResponse,
    NormalizedResponse,
    UsageMetadata
)

GEMINI_MODELS: List[ModelInfo] = [
    ModelInfo(
        id="gemini-2.0-flash",
        name="Gemini 2.0 Flash",
        provider_id="gemini",
        context_length=1048576,
        description="High-speed frontier multimodal model with sub-second latency",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=1048576,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.10, completion_per_million=0.40)
        ),
        is_default=True
    ),
    ModelInfo(
        id="gemini-2.0-flash-thinking-exp-01-21",
        name="Gemini 2.0 Flash Thinking",
        provider_id="gemini",
        context_length=1048576,
        description="Frontier reasoning model with native internal chain-of-thought",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=1048576,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.10, completion_per_million=0.40)
        )
    ),
    ModelInfo(
        id="gemini-1.5-pro",
        name="Gemini 1.5 Pro",
        provider_id="gemini",
        context_length=2097152,
        description="Frontier reasoning model with massive 2M token context",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=2097152,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=1.25, completion_per_million=5.0)
        )
    ),
    ModelInfo(
        id="gemini-1.5-flash",
        name="Gemini 1.5 Flash",
        provider_id="gemini",
        context_length=1048576,
        description="Cost-optimized fast reasoning & extraction model",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=1048576,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.075, completion_per_million=0.30)
        )
    ),
]

class GeminiProvider(AIProvider):
    """Production adapter for Google Gemini REST API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = "https://generativelanguage.googleapis.com/v1beta/openai",
        default_model: Optional[str] = "gemini-2.0-flash",
        is_active: bool = True
    ):
        super().__init__(
            name="gemini",
            display_name="Google Gemini",
            provider_type="gemini",
            api_key=api_key,
            base_url=base_url or "https://generativelanguage.googleapis.com/v1beta/openai",
            default_model=default_model or "gemini-2.0-flash",
            is_active=is_active
        )

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _parse_chat_response(self, response: httpx.Response) -> Dict[str, Any]:
        data = response.json()
        choices = data.get("choices", [])
        content = ""
        finish_reason = "stop"
        if choices and len(choices) > 0:
            msg = choices[0].get("message", {})
            content = msg.get("content", "") or ""
            finish_reason = choices[0].get("finish_reason", "stop")

        raw_usage = data.get("usage", {})
        prompt_tokens = raw_usage.get("prompt_tokens", 0)
        completion_tokens = raw_usage.get("completion_tokens", 0)
        total_tokens = raw_usage.get("total_tokens", prompt_tokens + completion_tokens)

        parsed_json = self.extract_json(content)

        return {
            "content": content,
            "finish_reason": finish_reason,
            "request_id": data.get("id"),
            "usage": UsageMetadata(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens
            ),
            "parsed_json": parsed_json
        }

    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = 2048,
        timeout_seconds: float = 45.0
    ) -> NormalizedResponse:
        chosen_model = model or self.default_model or "gemini-2.0-flash"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": chosen_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        async def _call():
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                resp = await client.post(url, headers=self._headers(), json=payload)
                # If OpenAI-compatible endpoint fails and API key is present, attempt fallback
                if resp.status_code != 200 and self.api_key:
                    alt_url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:generateContent?key={self.api_key}"
                    combined = (f"{system_prompt}\n\n" if system_prompt else "") + prompt
                    alt_payload = {
                        "contents": [{"parts": [{"text": combined}]}],
                        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}
                    }
                    alt_resp = await client.post(alt_url, json=alt_payload)
                    if alt_resp.status_code == 200:
                        alt_data = alt_resp.json()
                        candidates = alt_data.get("candidates", [])
                        text = ""
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                text = parts[0].get("text", "")
                        
                        usage_dict = alt_data.get("usageMetadata", {})
                        p_tokens = usage_dict.get("promptTokenCount", 0)
                        c_tokens = usage_dict.get("candidatesTokenCount", 0)
                        
                        # Return synthetic 200 response with OpenAI shape
                        synthetic_data = {
                            "id": "gemini-native",
                            "choices": [{"message": {"content": text}, "finish_reason": "stop"}],
                            "usage": {"prompt_tokens": p_tokens, "completion_tokens": c_tokens, "total_tokens": p_tokens + c_tokens}
                        }
                        return httpx.Response(status_code=200, json=synthetic_data, request=resp.request)
                return resp

        return await self.executor.execute_request(
            provider_id=self.name,
            model_id=chosen_model,
            request_func=_call,
            parse_func=self._parse_chat_response,
            timeout_seconds=timeout_seconds
        )

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: Optional[int] = 2048,
        timeout_seconds: float = 45.0
    ) -> NormalizedResponse:
        chosen_model = model or self.default_model or "gemini-2.0-flash"
        messages = []
        full_sys_prompt = system_prompt or "You are an analytical reasoning engine. You must output strictly valid JSON."
        if not full_sys_prompt.endswith("JSON."):
            full_sys_prompt += " Output strictly valid JSON."
        messages.append({"role": "system", "content": full_sys_prompt})
        messages.append({"role": "user", "content": prompt})

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": chosen_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"}
        }

        async def _call():
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                return await client.post(url, headers=self._headers(), json=payload)

        return await self.executor.execute_request(
            provider_id=self.name,
            model_id=chosen_model,
            request_func=_call,
            parse_func=self._parse_chat_response,
            timeout_seconds=timeout_seconds
        )

    async def list_models(self) -> List[ModelInfo]:
        return GEMINI_MODELS

    async def health_check(self) -> ProviderHealthResponse:
        from datetime import datetime
        now_iso = datetime.utcnow().isoformat() + "Z"
        if not self.is_configured:
            return ProviderHealthResponse(
                name=self.name,
                healthy=False,
                success=False,
                latency_ms=None,
                error="Gemini API key is not configured.",
                message="Gemini API key is not configured.",
                timestamp=now_iso
            )

        test_res = await self.test_connection(model=self.default_model)
        return ProviderHealthResponse(
            name=self.name,
            healthy=test_res.success,
            success=test_res.success,
            latency_ms=test_res.latency_ms if test_res.success else None,
            error=test_res.error if not test_res.success else None,
            message=test_res.message,
            timestamp=now_iso
        )
