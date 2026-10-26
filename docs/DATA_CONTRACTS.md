# Deep Reason — Shared Data Contracts & Schemas

> **Strict, typed data structures for multi-model council deliberation, MCTS state-action search, cross-critique, and deterministic verification.**

---

## 1. Provider & Model Capabilities Contracts

### `ProviderConfig`
```python
class ProviderConfig(BaseModel):
    name: str = Field(..., description="Unique provider identifier (e.g. 'openrouter', 'gemini')")
    provider_type: Literal["openrouter", "gemini", "openai_compatible", "local"]
    api_key: Optional[str] = Field(None, description="Plaintext API key (in-memory only, encrypted at rest)")
    base_url: Optional[str] = Field(None, description="Custom endpoint URL for OpenAI-compatible providers")
    default_model: Optional[str] = Field(None, description="Default model ID for this provider")
    is_active: bool = Field(True, description="Whether this provider is currently enabled")
    rate_limit_rpm: Optional[int] = Field(60, description="Requests per minute ceiling")
    timeout_seconds: float = Field(45.0, description="Per-request timeout")
```

### `ModelCapabilities`
```python
class ModelCapabilities(BaseModel):
    model_id: str = Field(..., description="Full model identifier (e.g. 'deepseek/deepseek-r1')")
    display_name: str
    provider: str
    context_window: int = Field(128000, description="Maximum context tokens")
    max_output_tokens: int = Field(4096, description="Maximum completion tokens")
    supports_reasoning: bool = Field(False, description="Whether model has native chain-of-thought (e.g. R1, o1)")
    supports_json_mode: bool = Field(True, description="Whether provider enforces strict JSON output")
    cost_per_million_input: float = Field(0.0, description="USD per 1M input tokens")
    cost_per_million_output: float = Field(0.0, description="USD per 1M output tokens")
```

### `ProviderRequest` & `ProviderResponse`
```python
class ProviderRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(2048)
    response_format: Optional[Literal["text", "json"]] = "json"
    timeout_seconds: Optional[float] = 45.0

class ProviderResponse(BaseModel):
    model: str
    provider: str
    content: str
    parsed_json: Optional[Any] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: float = 0.0
    finish_reason: Optional[str] = "stop"
    error: Optional[str] = None
```

---

## 2. Multi-Model Council & Normalization Contracts

### `Claim` & `Evidence`
```python
class Evidence(BaseModel):
    evidence_type: Literal["derivation", "citation", "computation", "counter_example", "assumption"]
    content: str
    source_url: Optional[str] = None
    is_verified: bool = False

class Claim(BaseModel):
    claim_id: str
    statement: str = Field(..., description="Atomic factual or logical assertion")
    is_essential: bool = Field(True, description="Whether conclusion depends on this claim")
    supporting_evidence: List[Evidence] = Field(default_factory=list)
    confidence: float = Field(0.5, ge=0.0, le=1.0, description="Model self-reported confidence (uncalibrated)")
    verification_status: Literal["unverified", "verified_true", "verified_false", "inconclusive"] = "unverified"
```

### `CandidateAnswer`
```python
class CandidateAnswer(BaseModel):
    candidate_id: str
    provider: str
    model: str
    main_conclusion: str
    reasoning_steps: List[str]
    claims: List[Claim]
    assumptions: List[str]
    unresolved_questions: List[str]
    raw_response: str
    latency_ms: float
    token_usage: Dict[str, int]
```

### `Contradiction` & `ComparisonMatrix`
```python
class Contradiction(BaseModel):
    contradiction_id: str
    claim_a: str
    claim_b: str
    source_model_a: str
    source_model_b: str
    disagreement_nature: Literal["direct_logical_negation", "numerical_discrepancy", "conflicting_premises", "constraint_violation"]
    crucial_question: str = Field(..., description="The exact question that would resolve this conflict")

class ComparisonMatrix(BaseModel):
    consensus_claims: List[Claim] = Field(default_factory=list, description="Points of agreement across models")
    contradictions: List[Contradiction] = Field(default_factory=list, description="Direct disagreements")
    unique_contributions: Dict[str, List[str]] = Field(default_factory=dict, description="Novel insights by specific models")
    unsupported_assertions: List[str] = Field(default_factory=list, description="Claims lacking evidence")
```

---

## 3. Structured Critique & Verification Contracts

### `CritiqueResult`
```python
class CritiqueResult(BaseModel):
    critique_id: str
    target_candidate_id: str
    critic_model: str
    critic_provider: str
    logical_validity_score: float = Field(..., ge=0.0, le=1.0)
    soundness_issues: List[str] = Field(default_factory=list)
    unwarranted_assumptions: List[str] = Field(default_factory=list)
    violated_constraints: List[str] = Field(default_factory=list)
    suggested_corrections: List[str] = Field(default_factory=list)
    overall_critique: str
```

### `VerificationResult`
```python
class VerificationResult(BaseModel):
    verification_id: str
    claim_id: Optional[str] = None
    method: Literal["deterministic_arithmetic", "symbolic_math", "sandboxed_code", "logic_solver", "static_rules", "none"]
    passed: bool
    verified_output: Optional[str] = None
    error_trace: Optional[str] = None
    execution_time_ms: float = 0.0
    is_objective_truth: bool = Field(True, description="True if proven by deterministic computation; False if heuristic")
```

---

## 4. MCTS Search Graph Contracts

### `MCTSState` & `MCTSAction`
```python
class MCTSState(BaseModel):
    problem_statement: str
    active_hypotheses: List[str]
    established_facts: List[str]
    active_constraints: List[str]
    unresolved_contradictions: List[str]
    cumulative_text: str

class MCTSAction(BaseModel):
    action_type: Literal[
        "explore_alternative_strategy",
        "resolve_contradiction",
        "repair_failed_step",
        "test_boundary_condition",
        "synthesize_milestone"
    ]
    description: str
    originating_model: Optional[str] = None
```

### `MCTSNodeStats` & `TreeEdgeStats`
```python
class MCTSNodeStats(BaseModel):
    node_id: str
    depth: int
    visits: int
    total_reward: float
    avg_reward: float  # Q(s)
    uct_score: float
    is_pruned: bool
    is_terminal: bool
    is_best_path: bool

class TreeEdgeStats(BaseModel):
    source_id: str
    target_id: str
    action_type: str
    is_best_path: bool
```

---

## 5. Budget, Run & Final Synthesis Contracts

### `ResourceBudget`
```python
class ResourceBudget(BaseModel):
    max_council_models: int = 5
    max_mcts_iterations: int = 25
    max_mcts_depth: int = 8
    branching_factor: int = 3
    max_total_tokens: int = 50000
    max_wall_time_seconds: float = 120.0
    max_spending_usd: Optional[float] = 0.50
    allow_early_stopping: bool = True
    stop_score_threshold: float = 0.95
```

### `ReasoningRun` & `RunEvent`
```python
class RunEvent(BaseModel):
    event_id: str
    session_id: str
    phase: Literal[
        "task_routing",
        "council_generation",
        "response_normalization",
        "critique_matrix",
        "mcts_selection",
        "mcts_expansion",
        "verification_check",
        "mcts_backpropagation",
        "mcts_pruning",
        "synthesis_completion",
        "budget_limit_reached",
        "error"
    ]
    timestamp: str
    payload: Dict[str, Any]

class ReasoningRun(BaseModel):
    run_id: str
    session_id: str
    mode: Literal["QUICK", "COUNCIL", "DEEP_REASONING"]
    budget: ResourceBudget
    participating_models: List[str]
    started_at: str
    completed_at: Optional[str] = None
    status: Literal["running", "paused", "completed", "failed", "stopped"]
    tokens_consumed: int = 0
    estimated_cost_usd: float = 0.0
    final_solution: Optional["SynthesizedSolution"] = None
```

### `SynthesizedSolution`
```python
class SynthesizedSolution(BaseModel):
    solution_id: str
    session_id: str
    final_answer: str = Field(..., description="Direct, definitive response to the user's task")
    executive_summary: str
    optimal_reasoning_path: List[str]
    verified_claims: List[str] = Field(default_factory=list, description="Claims verified by deterministic computation")
    unverified_assumptions: List[str] = Field(default_factory=list, description="Plausible assumptions lacking deterministic proof")
    preserved_disagreements: List[str] = Field(default_factory=list, description="Legitimate minority viewpoints preserved")
    calibrated_confidence: float = Field(..., ge=0.0, le=1.0, description="Calibrated evidence score, not raw LLM self-confidence")
    total_iterations: int
    total_nodes_explored: int
    execution_duration_seconds: float
```
