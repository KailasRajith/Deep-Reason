/* ============================================================
   DEEP REASON — Core Type Definitions
   All types match the backend schema exactly.
   ============================================================ */

// ── Session Types ─────────────────────────────────────────

export type SessionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MCTSConfig {
  exploration_constant: number;  // UCT exploration parameter (c)
  max_iterations: number;
  max_depth: number;
  branching_factor: number;       // candidates per expansion
  evaluation_strategy: 'single' | 'majority' | 'weighted';
  generator_model: string;
  evaluator_model: string;
  generator_provider: string;
  evaluator_provider: string;
  temperature: number;
  max_tokens: number;
  stop_on_score?: number;         // stop if score exceeds threshold
  time_limit_seconds?: number;
}

export interface Session {
  id: string;
  title: string;
  task: string;
  context?: string;
  constraints?: string;
  desired_format?: string;
  status: SessionStatus;
  config: MCTSConfig;
  result?: SessionResult;
  created_at: string;
  updated_at: string;
  duration_seconds?: number;
  iteration_count?: number;
  total_tokens?: number;
  node_count?: number;
}

export interface SessionResult {
  best_path: string[];
  best_answer: string;
  best_score: number;
  total_iterations: number;
  total_nodes: number;
  total_tokens_used: number;
  duration_seconds: number;
  completed_at: string;
}

export interface CreateSessionRequest {
  title: string;
  task: string;
  context?: string;
  constraints?: string;
  desired_format?: string;
  config: Partial<MCTSConfig>;
}

// ── MCTS Node Types ──────────────────────────────────────

export type NodeStatus =
  | 'unexplored'
  | 'exploring'
  | 'expanded'
  | 'evaluated'
  | 'completed'
  | 'pruned'
  | 'failed';

export interface MCTSNode {
  id: string;
  session_id: string;
  parent_id: string | null;
  depth: number;
  state: string;              // The reasoning content at this node
  action: string | null;      // The action that led to this node
  visits: number;
  total_value: number;
  avg_value: number;          // total_value / visits
  reward?: number;
  status: NodeStatus;
  children_ids: string[];
  evaluator_feedback?: string;
  evaluator_score?: number;
  uct_score?: number;
  created_at: string;
  is_terminal: boolean;
  is_best_path: boolean;
}

export interface TreeData {
  nodes: MCTSNode[];
  edges: TreeEdge[];
  root_id: string;
  best_path_ids: string[];
  stats: TreeStats;
}

export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  action?: string;
}

export interface TreeStats {
  total_nodes: number;
  max_depth: number;
  avg_branching_factor: number;
  pruned_count: number;
  explored_count: number;
  total_visits: number;
}

// ── Provider Types ───────────────────────────────────────

export type ProviderType =
  | 'openrouter'
  | 'gemini'
  | 'openai'
  | 'openai_compatible'
  | 'groq'
  | 'mistral'
  | 'huggingface'
  | 'nvidia'
  | 'local';

export interface Provider {
  name: string;
  type: ProviderType;
  display_name: string;
  configured: boolean;
  available: boolean;
  models: ModelInfo[];
  last_checked?: string;
  error?: string;
  base_url?: string;
}

export interface ModelCapabilities {
  supports_reasoning?: boolean;
  supports_structured_output?: boolean;
  supports_streaming?: boolean;
  context_window?: number;
  max_output_tokens?: number;
  pricing?: {
    prompt_per_million: number;
    completion_per_million: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider?: string;
  provider_id?: string;
  description?: string;
  context_length?: number;
  context_window?: number;
  max_output_tokens?: number;
  capabilities?: string[] | ModelCapabilities;
  pricing?: {
    prompt_per_million: number;
    completion_per_million: number;
  } | null;
  is_enabled?: boolean;
  is_default?: boolean;
  is_free?: boolean;
}

export interface ProviderConfigRequest {
  api_key: string;
  base_url?: string;
}

// ── WebSocket Event Types ────────────────────────────────

export type WSEventType =
  | 'session_started'
  | 'iteration_started'
  | 'node_selected'
  | 'node_expanded'
  | 'candidate_generated'
  | 'candidate_evaluated'
  | 'simulation_completed'
  | 'reward_propagated'
  | 'branch_pruned'
  | 'iteration_completed'
  | 'search_completed'
  | 'error'
  | 'heartbeat';

export interface WSEvent {
  type: WSEventType;
  timestamp: string;
  data: Record<string, unknown>;
  session_id: string;
  iteration?: number;
  node_id?: string;
}

// ── Execution Timeline ───────────────────────────────────

export interface TimelineEvent {
  id: string;
  type: WSEventType;
  timestamp: string;
  message: string;
  node_id?: string;
  iteration?: number;
  metadata?: Record<string, unknown>;
}

// ── Stats / Metrics ──────────────────────────────────────

export interface OverviewStats {
  total_sessions: number;
  completed_sessions: number;
  running_sessions: number;
  avg_duration_seconds: number;
  avg_iterations: number;
  avg_tokens: number;
  total_tokens: number;
  success_rate: number;
}

// ── Benchmark Types ──────────────────────────────────────

export interface BenchmarkRun {
  id: string;
  session_id: string;
  task: string;
  config: MCTSConfig;
  result: SessionResult;
  created_at: string;
}

export interface BenchmarkComparison {
  runs: BenchmarkRun[];
  metrics: string[];
}

// ── Settings Types ───────────────────────────────────────

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  default_config: Partial<MCTSConfig>;
  show_advanced_controls: boolean;
  notifications_enabled: boolean;
  auto_scroll_timeline: boolean;
}

// ── AI Council Types (Phase 2) ───────────────────────────

export type OperatingMode = 'quick' | 'council' | 'deep_reasoning';

export type CouncilRunStatus =
  | 'queued'
  | 'generating'
  | 'comparing'
  | 'critiquing'
  | 'refining'
  | 'synthesizing'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled';

export type ClaimCategory =
  | 'factual'
  | 'mathematical'
  | 'logical'
  | 'interpretive'
  | 'subjective';

export type ClaimVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'refuted';

export interface AtomicClaim {
  id: string;
  candidate_id: string;
  claim_text: string;
  category: ClaimCategory;
  supporting_explanation?: string;
  evidence_sources?: string[];
  verification_required: boolean;
  verification_status: ClaimVerificationStatus;
  verification_method?: string;
}

export interface CandidateResponse {
  id: string;
  run_id: string;
  provider_id: string;
  model_id: string;
  model_display_name?: string;
  version: number;
  parent_id?: string;
  original_text: string;
  normalized_content: string;
  claims: AtomicClaim[];
  assumptions: string[];
  evidence: string[];
  uncertainties: string[];
  alternatives: string[];
  suggested_verification_methods: string[];
  status: 'success' | 'error' | 'timeout' | 'rate_limited';
  error_message?: string;
  latency_ms: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd?: number;
  };
  created_at: string;
}

export type FindingCategory =
  | 'agreement'
  | 'contradiction'
  | 'complementary'
  | 'missing_information'
  | 'unsupported_assertion'
  | 'assumption_difference'
  | 'uncertainty';

export interface ComparisonFinding {
  id: string;
  category: FindingCategory;
  title: string;
  description: string;
  relevant_claim_ids: string[];
  supporting_candidate_ids: string[];
  conflicting_candidate_ids: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_heuristic: boolean;
  resolution_status: 'open' | 'resolved' | 'dismissed' | 'unresolved';
  resolution_notes?: string;
}

export interface ComparisonMatrix {
  run_id: string;
  findings: ComparisonFinding[];
  agreement_points: string[];
  contradictions: string[];
  complementary_insights: string[];
  unsupported_assertions: string[];
  minority_viewpoints: string[];
  consensus_ratio: number;
  generated_at: string;
}

export interface CritiqueResult {
  id: string;
  run_id: string;
  target_candidate_id: string;
  target_claim_id?: string;
  critic_provider_id: string;
  critic_model_id: string;
  objection_category:
    | 'logical_consistency'
    | 'claim_correctness'
    | 'missing_constraints'
    | 'unsupported_assumptions'
    | 'counterexamples'
    | 'boundary_conditions';
  objection: string;
  supporting_explanation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  proposed_correction?: string;
  resolution: 'accepted' | 'rejected' | 'partially_accepted' | 'unresolved';
  resolution_rationale: string;
  latency_ms: number;
  created_at: string;
}

export interface CandidateRefinement {
  id: string;
  run_id: string;
  original_candidate_id: string;
  refined_candidate_id: string;
  round_number: number;
  accepted_critique_ids: string[];
  refinement_summary: string;
  changes_made: string[];
  created_at: string;
}

export interface CouncilSynthesis {
  run_id: string;
  mode: OperatingMode;
  final_answer: string;
  key_supporting_claims: string[];
  material_minority_opinions: string[];
  important_assumptions: string[];
  unresolved_disagreements: string[];
  unverified_claims: string[];
  verification_status_summary: Record<string, unknown>;
  participating_models: string[];
  total_latency_ms: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  estimated_cost_usd?: number;
  confidence_assessment: string;
  mcts_pending_notice?: string;
  created_at: string;
}

export interface ModelSelection {
  provider_id: string;
  model_id: string;
  display_name?: string;
}

export interface CouncilRunCreate {
  task: string;
  title?: string;
  mode: OperatingMode;
  selected_models?: ModelSelection[];
  critic_model?: ModelSelection;
  synthesizer_model?: ModelSelection;
  budget_config?: {
    max_parallel_models?: number;
    timeout_seconds?: number;
    max_critique_rounds?: number;
    max_refinements_per_candidate?: number;
    total_token_ceiling?: number;
    allow_fallbacks?: boolean;
  };
  session_id?: string;
}

export interface CouncilRunState {
  run_id: string;
  session_id?: string;
  title: string;
  task: string;
  mode: OperatingMode;
  status: CouncilRunStatus;
  selected_models: ModelSelection[];
  critic_model?: ModelSelection;
  synthesizer_model?: ModelSelection;
  candidates: CandidateResponse[];
  comparison_matrix?: ComparisonMatrix;
  critiques: CritiqueResult[];
  refinements: CandidateRefinement[];
  synthesis?: CouncilSynthesis;
  errors: string[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
