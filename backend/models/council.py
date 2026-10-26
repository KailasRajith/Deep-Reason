from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field
from models.provider import UsageMetadata

OperatingMode = Literal["quick", "council", "deep_reasoning"]

RunStatus = Literal[
    "queued",
    "generating",
    "comparing",
    "critiquing",
    "refining",
    "synthesizing",
    "completed",
    "partially_completed",
    "failed",
    "cancelled"
]

ClaimCategory = Literal[
    "factual",
    "mathematical",
    "logical",
    "interpretive",
    "subjective"
]

ClaimVerificationStatus = Literal[
    "unverified",
    "pending",
    "verified",
    "refuted"
]

FindingCategory = Literal[
    "agreement",
    "contradiction",
    "complementary",
    "missing_information",
    "unsupported_assertion",
    "assumption_difference",
    "uncertainty"
]

FindingSeverity = Literal["low", "medium", "high", "critical"]

CritiqueObjectionSeverity = Literal["low", "medium", "high", "critical"]

CritiqueResolution = Literal[
    "accepted",
    "rejected",
    "partially_accepted",
    "unresolved"
]

# ── Core Claim and Evidence Schemas ──────────────────────────

class AtomicClaim(BaseModel):
    id: str
    candidate_id: str
    claim_text: str
    category: ClaimCategory = "factual"
    supporting_explanation: Optional[str] = None
    evidence_sources: List[str] = Field(default_factory=list)
    verification_required: bool = False
    verification_status: ClaimVerificationStatus = "unverified"
    verification_method: Optional[str] = None

# ── Candidate Response Schemas ────────────────────────────────

class CandidateResponse(BaseModel):
    id: str
    run_id: str
    provider_id: str
    model_id: str
    model_display_name: Optional[str] = None
    version: int = 1
    parent_id: Optional[str] = None
    original_text: str
    normalized_content: str
    claims: List[AtomicClaim] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    alternatives: List[str] = Field(default_factory=list)
    suggested_verification_methods: List[str] = Field(default_factory=list)
    status: Literal["success", "error", "timeout", "rate_limited"] = "success"
    error_message: Optional[str] = None
    latency_ms: float = 0.0
    usage: UsageMetadata = Field(default_factory=UsageMetadata)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ── Comparison & Contradiction Schemas ───────────────────────

class ComparisonFinding(BaseModel):
    id: str
    category: FindingCategory
    title: str
    description: str
    relevant_claim_ids: List[str] = Field(default_factory=list)
    supporting_candidate_ids: List[str] = Field(default_factory=list)
    conflicting_candidate_ids: List[str] = Field(default_factory=list)
    severity: FindingSeverity = "medium"
    is_heuristic: bool = True
    resolution_status: Literal["open", "resolved", "dismissed", "unresolved"] = "open"
    resolution_notes: Optional[str] = None

class ComparisonMatrix(BaseModel):
    run_id: str
    findings: List[ComparisonFinding] = Field(default_factory=list)
    agreement_points: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)
    complementary_insights: List[str] = Field(default_factory=list)
    unsupported_assertions: List[str] = Field(default_factory=list)
    minority_viewpoints: List[str] = Field(default_factory=list)
    consensus_ratio: float = Field(0.0, description="Calculated agreement ratio in [0.0, 1.0]")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ── Cross-Model Critique Schemas ─────────────────────────────

class CritiqueResult(BaseModel):
    id: str
    run_id: str
    target_candidate_id: str
    target_claim_id: Optional[str] = None
    critic_provider_id: str
    critic_model_id: str
    objection_category: Literal[
        "logical_consistency",
        "claim_correctness",
        "missing_constraints",
        "unsupported_assumptions",
        "counterexamples",
        "boundary_conditions"
    ] = "logical_consistency"
    objection: str
    supporting_explanation: str
    severity: CritiqueObjectionSeverity = "medium"
    proposed_correction: Optional[str] = None
    resolution: CritiqueResolution = "unresolved"
    resolution_rationale: str = ""
    latency_ms: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ── Candidate Refinement Schemas ─────────────────────────────

class CandidateRefinement(BaseModel):
    id: str
    run_id: str
    original_candidate_id: str
    refined_candidate_id: str
    round_number: int = 1
    accepted_critique_ids: List[str] = Field(default_factory=list)
    refinement_summary: str
    changes_made: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ── Synthesis Schemas ────────────────────────────────────────

class CouncilSynthesis(BaseModel):
    run_id: str
    mode: OperatingMode
    final_answer: str
    key_supporting_claims: List[str] = Field(default_factory=list)
    material_minority_opinions: List[str] = Field(default_factory=list)
    important_assumptions: List[str] = Field(default_factory=list)
    unresolved_disagreements: List[str] = Field(default_factory=list)
    unverified_claims: List[str] = Field(default_factory=list)
    verification_status_summary: Dict[str, Any] = Field(default_factory=dict)
    participating_models: List[str] = Field(default_factory=list)
    total_latency_ms: float = 0.0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    estimated_cost_usd: Optional[float] = None
    confidence_assessment: str = "Medium"
    mcts_pending_notice: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

# ── Council Run Configuration and State ───────────────────────

class ModelSelection(BaseModel):
    provider_id: str
    model_id: str
    display_name: Optional[str] = None

class CouncilBudgetConfig(BaseModel):
    max_parallel_models: int = 4
    timeout_seconds: float = 60.0
    max_critique_rounds: int = 1
    max_refinements_per_candidate: int = 1
    total_token_ceiling: int = 32000
    allow_fallbacks: bool = True

class CouncilRunCreate(BaseModel):
    task: str = Field(..., min_length=3, max_length=12000, description="User problem or question to reason through")
    title: Optional[str] = None
    mode: OperatingMode = "council"
    selected_models: Optional[List[ModelSelection]] = None
    critic_model: Optional[ModelSelection] = None
    synthesizer_model: Optional[ModelSelection] = None
    budget_config: Optional[CouncilBudgetConfig] = Field(default_factory=CouncilBudgetConfig)
    session_id: Optional[str] = None

class CouncilRunState(BaseModel):
    run_id: str
    session_id: Optional[str] = None
    title: str
    task: str
    mode: OperatingMode
    status: RunStatus = "queued"
    selected_models: List[ModelSelection] = Field(default_factory=list)
    critic_model: Optional[ModelSelection] = None
    synthesizer_model: Optional[ModelSelection] = None
    budget_config: CouncilBudgetConfig = Field(default_factory=CouncilBudgetConfig)
    candidates: List[CandidateResponse] = Field(default_factory=list)
    comparison_matrix: Optional[ComparisonMatrix] = None
    critiques: List[CritiqueResult] = Field(default_factory=list)
    refinements: List[CandidateRefinement] = Field(default_factory=list)
    synthesis: Optional[CouncilSynthesis] = None
    errors: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    completed_at: Optional[str] = None
