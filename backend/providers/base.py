import json
import re
import time
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional, Dict, Any
from models.provider import (
    ModelInfo,
    ModelTestResponse,
    ProviderHealthResponse,
    NormalizedResponse,
    NormalizedError,
    ProviderErrorCode,
    UsageMetadata
)
from providers.executor import request_executor, sanitize_error_message

class AIProvider(ABC):
    """
    Standardized Abstract Base Class for AI Model Providers.
    Encapsulates provider communication, credential protection, response normalization,
    and structured generation.
    """
    def __init__(
        self,
        name: str,
        display_name: str,
        provider_type: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        is_active: bool = True
    ):
        self.name = name
        self.display_name = display_name
        self.provider_type = provider_type
        self.api_key = api_key.strip() if api_key else None
        self.base_url = base_url.strip() if base_url else None
        self.default_model = default_model.strip() if default_model else None
        self.is_active = is_active
        self.executor = request_executor

    @property
    def is_configured(self) -> bool:
        """True if the provider has necessary credentials or is a local service."""
        if self.base_url and ("localhost" in self.base_url or "127.0.0.1" in self.base_url):
            return True
        return bool(self.api_key and len(self.api_key.strip()) > 0)

    # ── Core Inference Interfaces ────────────────────────────────

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = 2048,
        timeout_seconds: float = 45.0
    ) -> NormalizedResponse:
        """Executes a text completion request and returns a normalized response."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: Optional[int] = 2048,
        timeout_seconds: float = 45.0
    ) -> NormalizedResponse:
        """Executes a structured JSON completion request and parses output."""
        pass

    @abstractmethod
    async def list_models(self) -> List[ModelInfo]:
        """Returns verified list of supported models with metadata & capabilities."""
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealthResponse:
        """Checks connectivity, latency, and operational health of the provider."""
        pass

    async def test_connection(
        self,
        model: Optional[str] = None,
        test_prompt: str = "Respond with 'Operational' in one sentence to verify connectivity."
    ) -> ModelTestResponse:
        """
        Sends a lightweight real test inference request to verify credentials
        and calculate round-trip latency.
        """
        chosen_model = model or self.default_model or "default"
        if not self.is_configured:
            return ModelTestResponse(
                success=False,
                provider_id=self.name,
                model_id=chosen_model,
                latency_ms=0.0,
                error="API key is not configured.",
                error_code=ProviderErrorCode.MISSING_CONFIG.value,
                message=f"{self.display_name} API key is not configured."
            )

        resp = await self.generate_text(
            prompt=test_prompt,
            model=chosen_model,
            temperature=0.2,
            max_tokens=64,
            timeout_seconds=20.0
        )

        if resp.status == "success" and resp.content:
            return ModelTestResponse(
                success=True,
                provider_id=self.name,
                model_id=chosen_model,
                latency_ms=resp.latency_ms,
                content=resp.content.strip(),
                usage=resp.usage,
                message=f"Connected successfully ({resp.latency_ms}ms)"
            )
        else:
            err_msg = resp.error.message if resp.error else "Unknown test failure"
            err_code = resp.error.code.value if resp.error else ProviderErrorCode.UNKNOWN.value
            return ModelTestResponse(
                success=False,
                provider_id=self.name,
                model_id=chosen_model,
                latency_ms=resp.latency_ms,
                error=err_msg,
                error_code=err_code,
                message=sanitize_error_message(err_msg)
            )

    # ── Backward Compatibility with Existing MCTS Engine ─────────

    async def generate_candidates(
        self,
        prompt: str,
        system_prompt: str,
        n: int = 3,
        temperature: float = 0.7,
        model: Optional[str] = None
    ) -> List[str]:
        """Compatibility wrapper for MCTS node expansion."""
        resp = await self.generate_structured(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature
        )
        if resp.status == "success" and resp.parsed_json:
            parsed = resp.parsed_json
            candidates = []
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, str) and item.strip():
                        candidates.append(item.strip())
                    elif isinstance(item, dict) and "step" in item:
                        candidates.append(str(item["step"]).strip())
            elif isinstance(parsed, dict) and "candidates" in parsed:
                for item in parsed["candidates"]:
                    if isinstance(item, str):
                        candidates.append(item.strip())
            if candidates:
                return candidates[:n]
        elif resp.status == "success" and resp.content:
            # Fallback line splitting
            lines = [l.strip("- *0123456789.") for l in resp.content.split("\n") if len(l.strip()) > 10]
            if lines:
                return lines[:n]

        raise RuntimeError(f"Failed to generate candidate steps from {self.name}: {resp.error.message if resp.error else 'Empty response'}")

    async def evaluate_node(
        self,
        task: str,
        state: str,
        action: str,
        model: Optional[str] = None
    ) -> Tuple[float, str, bool]:
        """Compatibility wrapper for MCTS node evaluation."""
        from engine.prompts import build_evaluation_prompt, SYSTEM_NODE_EVALUATOR
        prompt = build_evaluation_prompt(task, state, action)
        resp = await self.generate_structured(
            prompt=prompt,
            system_prompt=SYSTEM_NODE_EVALUATOR,
            model=model,
            temperature=0.2
        )
        if resp.status == "success" and isinstance(resp.parsed_json, dict):
            pj = resp.parsed_json
            score = float(pj.get("score", 0.5))
            score = max(0.0, min(1.0, score))
            feedback = str(pj.get("feedback", "No feedback provided."))
            is_terminal = bool(pj.get("is_terminal", False))
            return score, feedback, is_terminal

        raise RuntimeError(f"Evaluation failed from {self.name}: {resp.error.message if resp.error else 'Invalid output'}")

    async def synthesize_solution(
        self,
        task: str,
        best_path_actions: List[str],
        model: Optional[str] = None
    ) -> str:
        """Compatibility wrapper for MCTS trajectory synthesis."""
        from engine.prompts import build_synthesis_prompt, SYSTEM_SYNTHESIZER
        prompt = build_synthesis_prompt(task, best_path_actions)
        resp = await self.generate_text(
            prompt=prompt,
            system_prompt=SYSTEM_SYNTHESIZER,
            model=model,
            temperature=0.4
        )
        if resp.status == "success" and resp.content:
            return resp.content.strip()
        raise RuntimeError(f"Synthesis failed from {self.name}: {resp.error.message if resp.error else 'Empty response'}")

    # ── Utility Helpers ──────────────────────────────────────────

    def extract_json(self, text: str) -> Optional[Any]:
        """Extracts structured JSON payload from an LLM response string."""
        if not text:
            return None
        text = text.strip()
        # Direct JSON match
        try:
            return json.loads(text)
        except Exception:
            pass

        # Match markdown ```json ... ``` blocks
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except Exception:
                pass

        # Match between first { and last } or first [ and last ]
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace : last_brace + 1])
            except Exception:
                pass

        first_bracket = text.find("[")
        last_bracket = text.rfind("]")
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            try:
                return json.loads(text[first_bracket : last_bracket + 1])
            except Exception:
                pass

        return None
