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

DEFAULT_OPENAI_COMPATIBLE_MODELS: List[ModelInfo] = [
    ModelInfo(
        id="gpt-4o",
        name="GPT-4o",
        provider_id="openai_compatible",
        context_length=128000,
        description="Flagship multimodal omni model",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=2.50, completion_per_million=10.0)
        ),
        is_default=True
    ),
    ModelInfo(
        id="gpt-4o-mini",
        name="GPT-4o Mini",
        provider_id="openai_compatible",
        context_length=128000,
        description="Fast, low-cost model for lighter reasoning steps",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=0.15, completion_per_million=0.60)
        )
    ),
    ModelInfo(
        id="o3-mini",
        name="OpenAI o3-mini",
        provider_id="openai_compatible",
        context_length=200000,
        description="High-speed reasoning model with configurable effort",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=200000,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=1.10, completion_per_million=4.40)
        )
    ),
    ModelInfo(
        id="llama3",
        name="Llama 3 (Local / Ollama)",
        provider_id="openai_compatible",
        context_length=8192,
        description="Local inference model hosted via Ollama or LM Studio",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=8192,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=0.0, completion_per_million=0.0)
        )
    )
]

class OpenAICompatibleProvider(AIProvider):
    """Production adapter for OpenAI-compatible endpoints (OpenAI, Groq, Ollama, LM Studio)."""

    def __init__(
        self,
        name: str = "openai_compatible",
        display_name: str = "OpenAI Compatible",
        provider_type: str = "openai_compatible",
        api_key: Optional[str] = None,
        base_url: Optional[str] = "https://api.openai.com/v1",
        default_model: Optional[str] = "gpt-4o",
        is_active: bool = True
    ):
        super().__init__(
            name=name,
            display_name=display_name or ("OpenAI" if "openai.com" in (base_url or "") else "OpenAI Compatible"),
            provider_type=provider_type,
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1",
            default_model=default_model or "gpt-4o",
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
        chosen_model = model or self.default_model or "gpt-4o"
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
                return await client.post(url, headers=self._headers(), json=payload)

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
        chosen_model = model or self.default_model or "gpt-4o"
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
        return DEFAULT_OPENAI_COMPATIBLE_MODELS

    async def health_check(self) -> ProviderHealthResponse:
        from datetime import datetime
        now_iso = datetime.utcnow().isoformat() + "Z"
        if not self.is_configured:
            return ProviderHealthResponse(
                name=self.name,
                healthy=False,
                success=False,
                latency_ms=None,
                error=f"{self.display_name} API key or base URL is not configured.",
                message=f"{self.display_name} API key or base URL is not configured.",
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
