# Deep Reason — System Architecture Specification

> **Autonomous Multi-AI Reasoning & Decision-Making Platform**  
> **Core Mathematical Concept:** Monte Carlo Tree Search (MCTS) with Multi-Model AI Council, Structured Critique, and Independent Verification.

---

## 1. System Overview & Philosophy

Deep Reason is engineered to solve complex, high-stakes reasoning problems by replacing opaque single-turn LLM generation with **System-2 style deliberative computation**.

Rather than relying on raw model confidence or majority consensus, the platform operates on five foundational principles:
1. **Ask Broadly:** Query diverse, independent frontier AI models in parallel without cross-contamination.
2. **Deconstruct & Cluster:** Normalize answers into atomic claims, assumptions, and solution steps, clustering agreements and isolating contradictions.
3. **Cross-Model Adversarial Critique:** Deploy rotating critic models to stress-test premises, spot subtle logical fallacies, and identify violated constraints.
4. **MCTS State-Action Exploration:** Organize alternative reasoning paths, repair steps, and contradiction resolutions into a formal Monte Carlo Tree Search graph guided by the Upper Confidence Bound for Trees (UCT).
5. **Deterministic Verification & Calibrated Synthesis:** Validate verifiable claims using sandboxed computation, symbolic math, or static rule engines, synthesizing a final answer that explicitly states assumptions, limitations, and remaining uncertainties.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend Application (Next.js 16 + React 19)"]
        UI["App Shell (Apple-inspired UI Tokens)"]
        TreeVis["MCTS Tree Graph (@xyflow/react)"]
        Inspector["Node Inspector & Critique Feed"]
        CouncilUI["Council Comparison & Contradiction Matrix"]
    end

    subgraph Backend["FastAPI Orchestration & Engine (Python 3.11)"]
        API["REST & WebSocket Server (Port 8000)"]
        Router["Task Understanding & Router"]
        CouncilEngine["AI Council Coordinator"]
        Normalizer["Response Normalizer & Claim Extractor"]
        CritiqueEngine["Cross-Model Critique Matrix"]
        MCTSEngine["MCTS Exploration Engine (UCT Search)"]
        Verifier["Independent Verification Layer"]
        Synthesizer["Calibrated Synthesis Engine"]
        Registry["Provider Registry & Vault"]
    end

    subgraph Storage["Persistence & Security"]
        DB[(SQLite WAL Database)]
        Vault["Fernet Encrypted Key Vault"]
    end

    subgraph Providers["External AI Inference"]
        OpenRouter["OpenRouter Gateway\n(DeepSeek-R1, Claude 3.5, GPT-4o)"]
        Gemini["Google Gemini API\n(Gemini 2.0 Flash / 1.5 Pro)"]
        OpenAIComp["OpenAI-Compatible / Local\n(Ollama, Groq, LM Studio)"]
    end

    UI <-->|HTTP / REST| API
    TreeVis <-->|Live WS Stream| API
    Inspector <-->|Live WS Stream| API
    CouncilUI <-->|Live WS Stream| API

    API --> Router
    Router --> CouncilEngine
    CouncilEngine --> Registry
    Registry <--> Vault
    Registry --> OpenRouter & Gemini & OpenAIComp

    CouncilEngine --> Normalizer
    Normalizer --> CritiqueEngine
    CritiqueEngine --> MCTSEngine
    MCTSEngine --> Verifier
    Verifier --> Synthesizer
    Synthesizer --> API

    API <--> DB
    MCTSEngine <--> DB
```

---

## 3. Core Component Responsibilities

### A. Task Understanding & Routing (`engine/router.py`)
- Analyzes incoming user queries, context, constraints, and requested format.
- Classifies problem into domain categories:
  - *Mathematical & Numerical Proofs*
  - *Software & Algorithmic Design*
  - *Factual Research & Synthesis*
  - *Constrained Planning & Optimization*
  - *Logical Deduction & Constraint Satisfaction*
  - *Open-Ended / Subjective Reasoning*
- Determines execution mode:
  - **Quick Mode:** Single high-speed model with optional deterministic verification.
  - **Council Mode:** Parallel multi-model consultation, contradiction matrix, critique, and synthesis.
  - **Deep Reasoning Mode:** Full multi-model council + MCTS state-action exploration + cross-critique + verification + calibrated synthesis.
- Allocates resource budget (max iterations, token ceiling, latency timeout, concurrency cap).

### B. AI Provider Registry, Adapters & Request Execution Layer (`providers/`)
- Unified interface for diverse inference endpoints:
  - `openrouter`: Gateway to DeepSeek R1, Claude 3.5 Sonnet, GPT-4o, Llama 3.3, and 200+ models with reasoning & structured JSON support.
  - `gemini`: Direct Google AI Gemini endpoint supporting Gemini 2.0 Flash and 1.5 Pro with native 2M context windows.
  - `openai_compatible`: Standardized adapter for cloud OpenAI, Groq LPU, and local inference (Ollama, LM Studio, vLLM) with automatic localhost unconfigured bypass.
- **Request Execution Layer (`providers/executor.py`):**
  - Per-provider concurrency throttling via `asyncio.Semaphore` (max 6 concurrent requests per provider).
  - Exponential backoff with jitter retry engine for transient HTTP errors ($429$, $500$, $502$, $503$, $504$, connection timeouts).
  - Immediate fail-fast rejection for non-retryable authentication and client errors ($400$, $401$, $403$, $404$).
  - High-precision wall-clock latency measurement (`latency_ms`) and token usage tracking (`UsageMetadata`).
- **Security & Masking:**
  - API keys are encrypted at rest using AES-GCM / Fernet with SHA-256 derived keys and are **never** transmitted to browser clients.
  - Automatic error message sanitization strips authorization headers, bearer tokens, and raw keys from logs and client responses.
- **Server Endpoints:**
  - `GET /api/providers`: Returns registered provider statuses with masked keys and available models.
  - `GET /api/models`: Aggregates all reasoning models across providers with capability flags.
  - `POST /api/models/test`: Live model testing probe returning normalized latency, tokens, and errors.
  - `POST /api/providers/{name}/test` and `/health`: Live provider connectivity and latency probe.

### C. Parallel AI Council & Normalizer (`engine/council.py`, `engine/normalizer.py`)
- Dispatches identical task prompts independently to all enabled, eligible models in parallel.
- Disables model cross-talk during generation to avoid groupthink and premature convergence.
- Normalizes disparate unstructured responses into structured candidate schemas:
  - Main proposed conclusion
  - Discrete atomic claims
  - Explicit assumptions
  - Proposed logical steps
  - Supporting evidence
  - Unresolved uncertainties
- Constructs a **Comparison Matrix**:
  - Semantic consensus clusters (points of agreement)
  - Direct logical or factual contradictions
  - Unique minority hypotheses
  - Unsupported assertions requiring verification

### D. Structured Adversarial Critique Engine (`engine/critique.py`)
- Implements rotating cross-model evaluation where Model $B$ inspects Model $A$'s candidate.
- Scrutinizes steps against specific failure modes:
  - Logical non-sequiturs
  - Violated task constraints
  - Factual misstatements
  - Missing boundary conditions
- Isolates disputed claims and generates targeted probe queries rather than rerunning the whole prompt.

### E. MCTS Exploration Engine (`engine/mcts.py`)
- Operates on formal search states and actions:
  - **State ($s$):** Cumulative reasoning trajectory, validated facts, active constraints, and remaining contradictions.
  - **Action ($a$):** Discrete next reasoning step, hypothesis repair, contradiction resolution, or boundary test.
  - **Selection:** Traverses tree via UCT formula:
    $$UCT(s, a) = Q(s, a) + c \times \sqrt{\frac{\ln(N(s) + 1)}{N(s, a) + \epsilon}}$$
    where $c$ is the exploration constant (default $\sqrt{2} \approx 1.414$), $Q(s, a)$ is the accumulated mean reward, and $N(s, a)$ is the visit count.
  - **Expansion:** Draws candidates from the multi-model candidate pool or requests targeted step completions.
  - **Simulation / Evaluation:** Assigns reward $R \in [0.0, 1.0]$ based on evaluator critique and independent verification outcomes.
  - **Backpropagation:** Propagates scalar rewards along the selected path, updating ancestor $N$ and $W$ statistics.
  - **Pruning:** Prunes suboptimal branches ($N \ge 2, Q < \theta_{\text{prune}}$) while preserving the top trajectory.

### F. Independent Verification Layer (`engine/verifier.py`)
- Separates subjective model confidence from verifiable objective proof:
  - **Math:** Deterministic computation and algebraic checking (e.g. `SymPy`, Python arithmetic).
  - **Code:** Sandboxed static analysis, syntax validation, and unit-test execution.
  - **Logic:** Formal propositional checks, constraint satisfaction checking.
  - **Research:** Claim-level source attribution and citation checking.
- Returns a distinct `VerificationResult` recording pass/fail, error trace, and verification method.

### G. Calibrated Synthesis Engine (`engine/synthesizer.py`)
- Ingests optimal MCTS path, council consensus points, resolved contradictions, and verification logs.
- Produces a single, coherent, polished final answer.
- Explicitly states:
  - Verified assertions vs. heuristic conclusions
  - Governing assumptions and boundary limitations
  - Calibrated uncertainty interval (does not fabricate consensus if evidence is split)

---

## 4. Data Flow Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Next.js UI
    participant Backend as FastAPI Server
    participant Council as AI Council
    participant MCTS as MCTS Engine
    participant Verifier as Verification Layer
    participant DB as SQLite WAL

    User->>Frontend: Submit reasoning task & configuration
    Frontend->>Backend: POST /api/sessions (Task, Mode, Config)
    Backend->>DB: Persist Session (status="idle")
    Backend-->>Frontend: 201 Created (Session ID)
    Frontend->>Backend: Connect WebSocket /ws/sessions/{id}
    Backend-->>Frontend: WS "connection_established" (snapshot)

    User->>Frontend: Click "Start Reasoning" / "Resume"
    Frontend->>Backend: WS {"action": "start"}
    Backend->>Council: Parallel Model Fan-Out (OpenRouter, Gemini, etc.)
    Council-->>Backend: Independent Structured Candidates
    Backend-->>Frontend: WS "council_generation_completed"

    Backend->>Backend: Response Normalization & Contradiction Matrix
    Backend-->>Frontend: WS "comparison_matrix_ready"

    loop MCTS Iterations (until max_iter or terminal condition)
        Backend->>MCTS: 1. UCT Selection
        Backend-->>Frontend: WS "node_selected"
        Backend->>MCTS: 2. Candidate Expansion
        Backend-->>Frontend: WS "node_expanded"
        Backend->>Verifier: 3. Targeted Verification & Critique
        Verifier-->>Backend: VerificationResult (math/code/logic)
        Backend->>MCTS: 4. Simulation (Reward Calculation)
        Backend-->>Frontend: WS "candidate_evaluated"
        Backend->>MCTS: 5. Backpropagation
        Backend-->>Frontend: WS "reward_propagated"
        Backend->>MCTS: 6. Branch Pruning
        Backend-->>Frontend: WS "iteration_completed"
        Backend->>DB: Batch Upsert Nodes
    end

    Backend->>Backend: Final Solution Synthesis
    Backend->>DB: Update Session (status="completed", result)
    Backend-->>Frontend: WS "search_completed" (Best Path, Solution, Calibrated Score)
```

---

## 5. Security & Isolation Architecture

1. **API Key Encryption at Rest:**
   Keys are never stored in plaintext in SQLite or logs. Symmetric Fernet encryption keys are derived from `SECRET_KEY` using SHA-256. Plaintext keys are decrypted only in-memory immediately prior to external HTTP requests.
2. **Client-Side Key Masking:**
   Any API response transmitting provider details strips the key or returns a secure mask (e.g. `sk-or-••••7890`).
3. **CORS & Network Boundaries:**
   Restricted to designated local and production web origins (`CORS_ORIGINS`).
4. **Sandboxed Verification Safety:**
   Code-execution verification runs with strict timeout constraints and restricted environments to prevent arbitrary host code execution.
5. **Rate-Limiting & Cost Guardrails:**
   Configurable token limits, maximum iterations, and concurrency ceilings prevent infinite recursive tree expansions and runaway provider charges.
