# Deep Reason — Autonomous Multi-AI Reasoning Platform

> **System-2 Deliberation via Monte Carlo Tree Search (MCTS), Multi-Model AI Council, Structured Critique, and Independent Verification.**

Deep Reason transforms AI decision-making from single-turn stochastic guessing into transparent, inspectable, and mathematically principled deliberative computation.

---

## Key Capabilities

- **Frontier Multi-Provider AI Infrastructure:** Unified access to OpenRouter (DeepSeek R1, Claude 3.5 Sonnet, GPT-4o, o3-mini), Google Gemini (Gemini 2.0 Flash / 1.5 Pro), and OpenAI-compatible endpoints (Groq LPU, Ollama, LM Studio).
- **Hardened Request Execution Layer:** Per-provider concurrency throttling via `asyncio.Semaphore`, exponential backoff with jitter for transient errors (HTTP 429, 5xx), immediate rejection for permanent client errors (401, 403), credential sanitization, and high-precision latency measurement.
- **Monte Carlo Tree Search (MCTS):** State-action search space exploration guided by the Upper Confidence Bound for Trees (UCT), supporting candidate generation, multi-criteria evaluation, backpropagation, and branch pruning.
- **Apple-Inspired Design System:** Precision-crafted Next.js 16 frontend with interactive exploration tree canvas (`@xyflow/react`), live WebSocket timeline streaming, Model Laboratory (`/models`), and dark/light adaptive aesthetics.
- **Zero-Exposure Credential Security:** Client credentials encrypted at rest using Fernet/AES-GCM; raw API keys are never leaked to logs or browser payloads.

---

## Quickstart

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) API keys for OpenRouter, Google Gemini, or local Ollama

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Start the backend server
python run.py
```
Backend runs at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm start -- -p 3000
```
Frontend runs at `http://localhost:3000`.

### 4. Running Tests
```bash
# Provider Infrastructure Test Suite (Mocked & Live Checks)
python backend/tests/test_providers.py

# Full Backend Lifecycle Test Suite (DB, MCTS, REST)
python backend/tests/test_backend.py

# Live WebSocket Streaming Test Suite
python backend/tests/test_websocket.py
```

---

## Architecture & Documentation

- [Implementation Status & Verification Matrix](file:///d:/Deep%20Reason/IMPLEMENTATION_STATUS.md)
- [System Architecture](file:///d:/Deep%20Reason/docs/ARCHITECTURE.md)
- [Data Contracts & Schemas](file:///d:/Deep%20Reason/docs/DATA_CONTRACTS.md)
- [Development Workflow & Guide](file:///d:/Deep%20Reason/docs/DEVELOPMENT.md)
- [Implementation Roadmap](file:///d:/Deep%20Reason/docs/ROADMAP.md)

---

## Roadmap Overview

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 0** | Repository Audit, Discovery & Baseline Verification | **VERIFIED** |
| **Phase 1** | Production-Grade Multi-Provider AI Infrastructure | **VERIFIED** |
| **Phase 2** | Independent AI Council Generation & Normalization | Next |
| **Phase 3** | Structured Adversarial Critique & Contradiction Analysis | Upcoming |
| **Phase 4** | Independent Multi-Domain Verification Layer | Upcoming |
| **Phase 5** | Council-Connected MCTS Exploration Engine | In Progress |
| **Phase 6** | Calibrated Synthesis & Adaptive Resource Budgeting | Upcoming |
| **Phase 7** | End-to-End Workspace Integration & Benchmarking | In Progress |
