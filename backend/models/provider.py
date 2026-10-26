from typing import Optional, List, Dict, Any, Literal
from enum import Enum
from pydantic import BaseModel, Field

ProviderType = Literal["openrouter", "gemini", "openai_compatible", "local"]

# ── Error Codes & Normalization ──────────────────────────────

class ProviderErrorCode(str, Enum):
    MISSING_CONFIG = "MISSING_CONFIG"
    AUTH_FAILED = "AUTH_FAILED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    RATE_LIMITED = "RATE_LIMITED"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    INVALID_REQUEST = "INVALID_REQUEST"
    MALFORMED_RESPONSE = "MALFORMED_RESPONSE"
    UNSUPPORTED_MODEL = "UNSUPPORTED_MODEL"
    NETWORK_ERROR = "NETWORK_ERROR"
    UNKNOWN = "UNKNOWN"

class NormalizedError(BaseModel):
    code: ProviderErrorCode
    message: str
    http_status: Optional[int] = None
    retryable: bool = False
    details: Optional[Dict[str, Any]] = None

# ── Usage & Capabilities ─────────────────────────────────────

class UsageMetadata(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: Optional[float] = None

class ModelPricing(BaseModel):
    prompt_per_million: float = 0.0
    completion_per_million: float = 0.0

class ModelCapabilities(BaseModel):
    supports_reasoning: bool = Field(False, description="Whether model has native reasoning / CoT (e.g. DeepSeek-R1, o1, o3-mini)")
    supports_structured_output: bool = Field(True, description="Whether model can enforce JSON schema output")
    supports_streaming: bool = Field(True, description="Whether endpoint supports Server-Sent Events / streaming")
    context_window: int = Field(128000, description="Maximum context window in tokens")
    max_output_tokens: int = Field(4096, description="Maximum completion tokens")
    pricing: Optional[ModelPricing] = None

class ModelInfo(BaseModel):
    id: str
    name: str
    provider_id: str = "openrouter"
    description: Optional[str] = None
    context_length: Optional[int] = 128000
    capabilities: ModelCapabilities = Field(default_factory=ModelCapabilities)
    is_enabled: bool = True
    is_default: bool = False
    pricing: Optional[Dict[str, Any]] = None

# ── Normalized Provider Responses ────────────────────────────

class NormalizedResponse(BaseModel):
    provider_id: str
    model_id: str
    content: str
    status: Literal["success", "error", "rate_limited", "timeout"] = "success"
    latency_ms: float = 0.0
    usage: UsageMetadata = Field(default_factory=UsageMetadata)
    finish_reason: Optional[str] = "stop"
    request_id: Optional[str] = None
    error: Optional[NormalizedError] = None
    parsed_json: Optional[Any] = None

# ── Configuration & Management Schemas ───────────────────────

class ProviderConfigUpdate(BaseModel):
    api_key: Optional[str] = Field(None, description="Secret API Key (stored encrypted at rest, never returned)")
    base_url: Optional[str] = Field(None, description="Custom endpoint URL for OpenAI-compatible providers")
    default_model: Optional[str] = Field(None, description="Default model ID for this provider")
    is_active: bool = Field(True, description="Whether this provider is active")

class ProviderResponse(BaseModel):
    name: str
    type: str
    configured: bool
    available: bool
    masked_key: Optional[str] = None
    base_url: Optional[str] = None
    default_model: Optional[str] = None
    models: List[ModelInfo] = []
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None

class ProviderHealthResponse(BaseModel):
    name: str
    healthy: bool
    success: Optional[bool] = None
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    message: Optional[str] = None
    timestamp: str

    def model_post_init(self, __context: Any) -> None:
        if self.success is None:
            self.success = self.healthy
        if self.message is None:
            self.message = "Connectivity verified" if self.healthy else (self.error or "Health check failed")

# ── Model Testing Schemas ────────────────────────────────────

class ModelTestRequest(BaseModel):
    provider_id: str
    model_id: Optional[str] = None
    prompt: Optional[str] = Field(
        "Respond in exactly one sentence: confirm that you are online and operational.",
        description="Short prompt to test inference connectivity and latency"
    )
    temperature: float = Field(0.3, ge=0.0, le=2.0)
    timeout_seconds: float = Field(30.0, ge=2.0, le=90.0)

class ModelTestResponse(BaseModel):
    success: bool
    provider_id: str
    model_id: str
    latency_ms: float = 0.0
    content: Optional[str] = None
    usage: Optional[UsageMetadata] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
