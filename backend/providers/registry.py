from typing import Dict, List, Optional, Set
from datetime import datetime
from config import settings
from providers.base import AIProvider
from providers.openrouter import OpenRouterProvider
from providers.gemini import GeminiProvider
from providers.openai_compatible import OpenAICompatibleProvider
from providers.encryption import mask_api_key
from models.provider import (
    ProviderResponse,
    ProviderConfigUpdate,
    ProviderHealthResponse,
    ModelInfo,
    ModelTestResponse
)

class ProviderRegistry:
    """
    Centralized, thread-safe registry for AI Model Providers.
    Manages adapters, credential state, model configuration, and connectivity tests.
    """
    _instance: Optional["ProviderRegistry"] = None

    def __init__(self):
        self._providers: Dict[str, AIProvider] = {}
        self._disabled_models: Set[str] = set()
        self._health_cache: Dict[str, ProviderHealthResponse] = {}
        self._health_cache_time: Dict[str, float] = {}
        self._initialize_defaults()

    @classmethod
    def get_instance(cls) -> "ProviderRegistry":
        if cls._instance is None:
            cls._instance = ProviderRegistry()
        return cls._instance

    def _initialize_defaults(self):
        # 1. OpenRouter (Primary multi-model gateway)
        self._providers["openrouter"] = OpenRouterProvider(
            api_key=settings.OPENROUTER_API_KEY,
            default_model=settings.DEFAULT_GENERATOR_MODEL
        )

        # 2. Google Gemini (Direct high-throughput provider)
        self._providers["gemini"] = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            default_model="gemini-2.0-flash"
        )

        # 3. OpenAI Compatible (OpenAI, Groq LPU, Ollama, LM Studio)
        self._providers["openai_compatible"] = OpenAICompatibleProvider(
            name="openai_compatible",
            display_name="OpenAI Compatible",
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            default_model="gpt-4o"
        )
        # Convenience alias for OpenAI
        self._providers["openai"] = self._providers["openai_compatible"]

    def register_provider(self, provider: AIProvider):
        """Registers a new provider adapter or updates an existing one."""
        self._providers[provider.name.lower().strip()] = provider
        if provider.name == "openai_compatible":
            self._providers["openai"] = provider

    def get_provider(self, name: str) -> Optional[AIProvider]:
        """Resolves a provider instance by identifier with case-insensitive fallback."""
        key = name.lower().strip()
        if key in self._providers:
            return self._providers[key]
        return None

    def get_eligible_providers(self) -> List[AIProvider]:
        """Returns all providers that are currently active and configured with valid credentials."""
        seen = set()
        eligible = []
        for p in self._providers.values():
            if p in seen:
                continue
            seen.add(p)
            if p.is_active and p.is_configured:
                eligible.append(p)
        return eligible

    async def list_providers_response(self) -> List[ProviderResponse]:
        """Returns client-safe metadata for all registered providers (no raw keys)."""
        results: List[ProviderResponse] = []
        seen = set()
        for name, provider in self._providers.items():
            if provider in seen:
                continue
            seen.add(provider)
            models = await provider.list_models()
            # Mark disabled models
            for m in models:
                m.is_enabled = m.id not in self._disabled_models
                m.is_default = (m.id == provider.default_model)

            results.append(ProviderResponse(
                name=provider.name,
                type=provider.provider_type,
                configured=provider.is_configured,
                available=provider.is_active,
                masked_key=mask_api_key(provider.api_key),
                base_url=provider.base_url,
                default_model=provider.default_model,
                models=models
            ))
        return results

    async def list_all_models(self) -> List[ModelInfo]:
        """Aggregates all models across all registered providers into a flat list."""
        all_models: List[ModelInfo] = []
        seen_model_ids = set()
        seen_providers = set()

        for provider in self._providers.values():
            if provider in seen_providers:
                continue
            seen_providers.add(provider)
            try:
                models = await provider.list_models()
                for m in models:
                    unique_key = f"{provider.name}:{m.id}"
                    if unique_key not in seen_model_ids:
                        seen_model_ids.add(unique_key)
                        m.is_enabled = m.id not in self._disabled_models
                        m.is_default = (m.id == provider.default_model)
                        all_models.append(m)
            except Exception:
                continue

        return all_models

    async def update_provider_config(self, name: str, update: ProviderConfigUpdate) -> ProviderResponse:
        """Updates runtime configuration for a provider."""
        key = name.lower().strip()
        provider = self.get_provider(key)

        if not provider:
            # Create a dynamic OpenAI-compatible provider if unregistered
            new_provider = OpenAICompatibleProvider(
                name=key,
                display_name=name.capitalize(),
                api_key=update.api_key,
                base_url=update.base_url or "https://api.openai.com/v1",
                default_model=update.default_model or "gpt-4o",
                is_active=update.is_active
            )
            self.register_provider(new_provider)
            provider = new_provider
        else:
            if update.api_key is not None and update.api_key.strip():
                provider.api_key = update.api_key.strip()
            if update.base_url is not None and update.base_url.strip():
                provider.base_url = update.base_url.strip()
            if update.default_model is not None and update.default_model.strip():
                provider.default_model = update.default_model.strip()
            provider.is_active = update.is_active

        # Invalidate health cache on config update
        self._health_cache.pop(key, None)

        models = await provider.list_models()
        return ProviderResponse(
            name=provider.name,
            type=provider.provider_type,
            configured=provider.is_configured,
            available=provider.is_active,
            masked_key=mask_api_key(provider.api_key),
            base_url=provider.base_url,
            default_model=provider.default_model,
            models=models
        )

    async def check_health(self, name: str) -> ProviderHealthResponse:
        """Checks provider health with latency reporting."""
        provider = self.get_provider(name)
        now_iso = datetime.utcnow().isoformat() + "Z"
        if not provider:
            return ProviderHealthResponse(
                name=name,
                healthy=False,
                success=False,
                latency_ms=None,
                error=f"Provider '{name}' is not registered.",
                message=f"Provider '{name}' is not registered.",
                timestamp=now_iso
            )
        return await provider.health_check()

    async def test_model(
        self,
        provider_name: str,
        model_id: Optional[str] = None,
        test_prompt: Optional[str] = None
    ) -> ModelTestResponse:
        """Sends an active test query through the designated provider adapter."""
        provider = self.get_provider(provider_name)
        if not provider:
            return ModelTestResponse(
                success=False,
                provider_id=provider_name,
                model_id=model_id or "unknown",
                latency_ms=0.0,
                error=f"Provider '{provider_name}' is not registered in the system.",
                error_code="UNSUPPORTED_PROVIDER",
                message=f"Provider '{provider_name}' is not registered."
            )

        prompt = test_prompt or "Respond with 'Operational' in one sentence to verify connectivity."
        return await provider.test_connection(model=model_id, test_prompt=prompt)

    async def list_models(self, name: str) -> List[ModelInfo]:
        """Lists available models for a specific provider."""
        provider = self.get_provider(name)
        if not provider:
            return []
        return await provider.list_models()

provider_registry = ProviderRegistry.get_instance()
