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

OPENROUTER_MODELS: List[ModelInfo] = [
    ModelInfo(
        id="deepseek/deepseek-r1",
        name="DeepSeek R1 (Reasoning)",
        provider_id="openrouter",
        context_length=128000,
        description="Frontier open reasoning model with chain-of-thought",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.55, completion_per_million=2.19)
        ),
        is_default=True
    ),
    ModelInfo(
        id="deepseek/deepseek-chat",
        name="DeepSeek V3",
        provider_id="openrouter",
        context_length=128000,
        description="High-speed flagship non-reasoning LLM",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=0.14, completion_per_million=0.28)
        )
    ),
    ModelInfo(
        id="anthropic/claude-3.5-sonnet",
        name="Claude 3.5 Sonnet",
        provider_id="openrouter",
        context_length=200000,
        description="Exceptional analytical reasoning and coding",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=200000,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=3.0, completion_per_million=15.0)
        )
    ),
    ModelInfo(
        id="openai/o3-mini",
        name="OpenAI o3-mini",
        provider_id="openrouter",
        context_length=200000,
        description="High-speed frontier reasoning model",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=200000,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=1.10, completion_per_million=4.40)
        )
    ),
    ModelInfo(
        id="openai/gpt-4o",
        name="GPT-4o",
        provider_id="openrouter",
        context_length=128000,
        description="Omni multimodal flagship model",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=2.50, completion_per_million=10.0)
        )
    ),
    ModelInfo(
        id="meta-llama/llama-3.3-70b-instruct",
        name="Llama 3.3 70B Instruct",
        provider_id="openrouter",
        context_length=128000,
        description="Leading open-weights instruction model",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=128000,
            max_output_tokens=4096,
            pricing=ModelPricing(prompt_per_million=0.12, completion_per_million=0.30)
        )
    ),
    ModelInfo(
        id="google/gemini-2.0-flash-001",
        name="Gemini 2.0 Flash",
        provider_id="openrouter",
        context_length=1000000,
        description="Ultra-low latency multimodal model",
        capabilities=ModelCapabilities(
            supports_reasoning=False,
            supports_structured_output=True,
            context_window=1000000,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.10, completion_per_million=0.40)
        )
    ),
    ModelInfo(
        id="qwen/qwq-32b",
        name="Qwen QwQ 32B (Reasoning)",
        provider_id="openrouter",
        context_length=32768,
        description="Specialized math and logic reasoning model",
        capabilities=ModelCapabilities(
            supports_reasoning=True,
            supports_structured_output=True,
            context_window=32768,
            max_output_tokens=8192,
            pricing=ModelPricing(prompt_per_million=0.18, completion_per_million=0.18)
        )
    ),
]

class OpenRouterProvider(AIProvider):
    """Production adapter for OpenRouter API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = "https://openrouter.ai/api/v1",
        default_model: Optional[str] = "deepseek/deepseek-r1",
        is_active: bool = True
    ):
        super().__init__(
            name="openrouter",
            display_name="OpenRouter",
            provider_type="openrouter",
            api_key=api_key,
            base_url=base_url or "https://openrouter.ai/api/v1",
            default_model=default_model or "deepseek/deepseek-r1",
            is_active=is_active
        )

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": "https://deepreason.local",
            "X-Title": "Deep Reason Deliberation Platform"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _parse_chat_response(self, response: httpx.Response) -> Dict[str, Any]:
        data = response.json()
        choices = data.get("choices", [])
        content = ""
        finish_reason = "stop"
        if choices and len(choices) > 0:
            first_choice = choices[0]
            msg = first_choice.get("message", {})
            content = msg.get("content", "") or ""
            finish_reason = first_choice.get("finish_reason", "stop")

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
        chosen_model = model or self.default_model or "deepseek/deepseek-r1"
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
        chosen_model = model or self.default_model or "deepseek/deepseek-r1"
        messages = []
        full_sys_prompt = system_prompt or "You are an analytical AI reasoning engine. You must output strictly valid JSON."
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
        return OPENROUTER_MODELS

    async def health_check(self) -> ProviderHealthResponse:
        from datetime import datetime
        now_iso = datetime.utcnow().isoformat() + "Z"
        if not self.is_configured:
            return ProviderHealthResponse(
                name=self.name,
                healthy=False,
                success=False,
                latency_ms=None,
                error="OpenRouter API key is not configured.",
                message="OpenRouter API key is not configured.",
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
