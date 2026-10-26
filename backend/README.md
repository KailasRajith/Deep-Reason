# Deep Reason Backend

Production-ready FastAPI backend for **Deep Reason**, an autonomous multi-model AI reasoning platform powered by Monte Carlo Tree Search (MCTS), secure AI provider integration, SQLite persistence, and live WebSocket streaming.

---

## Architecture Overview

```
backend/
├── .env.example              # Template environment configuration
├── .env                      # Active environment settings
├── requirements.txt          # Production dependencies
├── config.py                 # Pydantic Settings configuration
├── run.py                    # Server startup entrypoint (Port 8000)
├── server.py                 # FastAPI application, REST endpoints, and WebSocket manager
├── models/
│   ├── __init__.py
│   ├── session.py            # Session and MCTSConfig Pydantic schemas
│   ├── node.py               # MCTSNode schema with state, visits, reward, and UCT
│   ├── provider.py           # Provider, model info, and health response models
│   └── events.py             # WebSocket streaming event schemas
├── providers/
│   ├── __init__.py
│   ├── base.py               # Abstract base AIProvider class
│   ├── encryption.py         # Fernet symmetric encryption and key masking
│   ├── openrouter.py         # OpenRouter integration (Primary)
│   ├── gemini.py             # Google Gemini REST & OpenAI-compatible integration
│   ├── openai_compatible.py  # Generic OpenAI-compatible endpoint (Ollama, Groq, etc.)
│   └── registry.py           # Dynamic provider registry and management
├── engine/
│   ├── __init__.py
│   ├── mcts.py               # Complete MCTS engine (UCT selection, expansion, simulation, backpropagation, pruning)
│   ├── evaluator.py          # Node critical evaluator with fallback heuristic scoring
│   └── prompts.py            # Prompt engineering for generation, evaluation, and synthesis
├── db/
│   ├── __init__.py
│   ├── schema.sql            # SQLite relational database schema (WAL mode enabled)
│   ├── database.py           # aiosqlite async database connection management
│   └── repository.py         # Async repository for sessions, nodes, and encrypted configs
└── tests/
    ├── test_backend.py       # End-to-end integration and mathematical MCTS tests
    └── test_websocket.py     # Live WebSocket bidirectional streaming tests
```

---

## Key Features

1. **Autonomous MCTS Reasoning Engine (`engine/mcts.py`)**:
   - **UCT-based selection**:
     $$UCT(s, a) = \frac{Q(s, a)}{N(s, a)} + c \times \sqrt{\frac{\ln(N(s) + 1)}{N(s, a) + \epsilon}}$$
   - **Candidate Expansion**: Calls AI models to generate $B$ diverse reasoning hypotheses.
   - **Critical Evaluation**: Evaluates logical soundness, scoring each step between $0.0$ and $1.0$ with detailed critique.
   - **Backpropagation**: Traverses ancestor chain, incrementing visit count $N$ and accumulating total value $W$.
   - **Branch Pruning**: Prunes low-value branches ($Q < \text{threshold}$) after exploratory visits, while preserving high-performing trajectories.
   - **Step-by-step & Continuous Execution**: Full support for step-by-step stepping or run-to-completion with pause/resume/stop.

2. **Secure AI Provider Layer (`providers/`)**:
   - Built-in support for **OpenRouter**, **Google Gemini**, and **OpenAI-compatible** endpoints (Ollama, Groq, LMStudio, etc.).
   - **Zero Leaks**: API keys are encrypted at rest using AES-GCM / Fernet and are **never** returned to the frontend.
   - Dynamic model listing and latency/health check testing.

3. **WebSocket Live Streaming (`/ws/reasoning/{session_id}`)**:
   - Real-time event streaming of every search phase:
     - `session_started`
     - `iteration_started`
     - `node_selected`
     - `node_expanded`
     - `candidate_generated`
     - `candidate_evaluated`
     - `simulation_completed`
     - `reward_propagated`
     - `branch_pruned`
     - `iteration_completed`
     - `search_completed`
     - `error`

4. **Async SQLite Persistence (`db/`)**:
   - Async SQLite using `aiosqlite` with WAL (`Write-Ahead Logging`) mode.
   - Complete history of sessions, full node trees, and encrypted provider credentials.

---

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your API keys (optional; keys can also be configured dynamically from the web frontend):

```bash
cp .env.example .env
```

### 3. Start the Server

```bash
python run.py
```

The server starts on `http://0.0.0.0:8000`.

Interactive Swagger API documentation:
- `http://localhost:8000/docs`

---

## Running Automated Tests

Run the backend verification suite:

```bash
python tests/test_backend.py
python tests/test_websocket.py
```
