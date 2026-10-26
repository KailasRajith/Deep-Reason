# Deep Reason — Local Development & Testing Guide

> **Developer setup, commands, testing procedures, and operational guidelines.**

---

## 1. System Prerequisites

- **Python:** Version `3.11` or higher (verified on Python 3.11.9).
- **Node.js:** Version `20.x` or higher (tested on Next.js 16.4.3 + React 19).
- **Package Managers:** `pip` (Python) and `npm` (Node.js).
- **Operating System:** Windows, macOS, or Linux.
- **Hardware Recommendation:** 8GB+ RAM, multi-core CPU for local asynchronous MCTS tree branching.

---

## 2. Quick Setup Instructions

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd "backend"
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Note:* API keys are optional for local development. If unpopulated, the engine automatically uses algorithmic heuristic generators and evaluators.

5. Start the backend server:
   ```bash
   python run.py
   ```
   *Default address:* `http://localhost:8000` (API documentation available at `http://localhost:8000/docs`).

---

### Frontend Setup (Next.js 16 App Router)

1. Navigate to the frontend directory:
   ```bash
   cd "frontend"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Default address:* `http://localhost:3000`.

---

## 3. Verification & Testing Commands

### AI Council Pipeline Test Suite (Phase 2)
Tests independent parallel generation, claim extraction, agreement/contradiction detection, cross-critique, refinement versioning, and synthesis:
```bash
python backend/tests/test_council.py
```

### AI Provider Infrastructure Test Suite (Phase 1)
Tests OpenRouter, Gemini, and OpenAI-compatible adapters, request execution layer, concurrency semaphores, retry policies, and key masking:
```bash
python backend/tests/test_providers.py
```

### Backend Automated Test Suite
Runs SQLite database initialization, Fernet encryption, provider registry checks, MCTS math & steps, and REST endpoint tests:
```bash
python backend/tests/test_backend.py
```

### WebSocket Streaming Test Suite
Verifies live bidirectional WebSocket communication and real-time event streaming:
```bash
python backend/tests/test_websocket.py
```

### Frontend Type-Checking
Runs the TypeScript compiler in no-emit mode to verify all interfaces and components:
```bash
cd frontend
npx tsc --noEmit
```

### Frontend Production Build
Compiles production Next.js artifacts using Turbopack:
```bash
cd frontend
npm run build
```

### Frontend Production Start
Runs the optimized production server on port 3000:
```bash
cd frontend
npm start -- -p 3000
```

---

## 4. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `HOST` | `0.0.0.0` | Host binding for FastAPI server. |
| `PORT` | `8000` | Port for FastAPI server. |
| `SECRET_KEY` | *(Internal default)* | Master secret used for Fernet symmetric encryption of API keys. |
| `DB_PATH` | `deep_reason.db` | Path to SQLite database file. |
| `OPENROUTER_API_KEY` | `""` | OpenRouter gateway API key (DeepSeek, Claude, GPT-4o). |
| `GEMINI_API_KEY` | `""` | Google Gemini API key. |
| `OPENAI_API_KEY` | `""` | OpenAI API key. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Endpoint URL for OpenAI-compatible providers. |
| `DEFAULT_EXPLORATION_CONSTANT`| `1.41421356` | $c$ exploration weight in UCT formula. |
| `DEFAULT_MAX_DEPTH` | `8` | Maximum reasoning depth in MCTS tree. |
| `DEFAULT_MAX_ITERATIONS` | `25` | Maximum search iterations. |
| `DEFAULT_BRANCHING_FACTOR` | `3` | Candidate expansion branches per node. |
| `DEFAULT_PRUNE_THRESHOLD` | `0.25` | Minimum $Q$-value threshold for branch pruning. |

---

## 5. Known Development Quirks & Best Practices

1. **PowerShell Path Configuration:**
   On Windows PowerShell, ensure user and system PATH environments are loaded if invoking commands in isolated subshells:
   ```powershell
   $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
   ```

2. **Database Path Consistency:**
   Always run backend commands from the `backend/` directory or ensure `DB_PATH` points to an absolute path to prevent accidental creation of disjoint database files.

3. **No-Mock Policy for Live Engine:**
   Never fabricate MCTS metrics, node visits, or reward scores in frontend components. All data must originate from the backend database or WebSocket event stream.
