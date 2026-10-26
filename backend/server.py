import uuid
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Dict, List, Set, Optional, Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from db.database import init_db
from db.repository import repository
from models.session import SessionCreate, SessionUpdate, SessionResponse, MCTSConfig
from models.node import MCTSNode
from models.provider import (
    ProviderConfigUpdate,
    ProviderResponse,
    ProviderHealthResponse,
    ModelInfo,
    ModelTestRequest,
    ModelTestResponse
)
from models.council import (
    CouncilRunCreate,
    CouncilRunState,
    CandidateResponse,
    ComparisonMatrix,
    CritiqueResult,
    CouncilSynthesis
)
from models.events import ReasoningEvent
from providers.registry import provider_registry
from engine.mcts import MCTSEngine
from engine.council import CouncilEngine

# Active engine instances per session_id
active_engines: Dict[str, MCTSEngine] = {}
# Background execution tasks
active_tasks: Dict[str, asyncio.Task] = {}
# Active Council engines and tasks per run_id
active_council_engines: Dict[str, CouncilEngine] = {}
active_council_tasks: Dict[str, asyncio.Task] = {}

class ConnectionManager:
    def __init__(self):
        # session_id -> Set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead_sockets = set()
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.add(ws)
            for dead in dead_sockets:
                self.active_connections[session_id].discard(dead)

ws_manager = ConnectionManager()

async def get_or_create_engine(session_id: str) -> MCTSEngine:
    """Retrieve existing engine or load from persistence and initialize."""
    if session_id in active_engines:
        return active_engines[session_id]

    session = await repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_streamer(event: ReasoningEvent):
        await ws_manager.broadcast(session_id, event.to_dict())

    engine = MCTSEngine(
        session_id=session.id,
        task=session.task,
        config=session.config,
        event_callback=event_streamer
    )

    # Load existing nodes from database
    nodes = await repository.get_nodes_by_session(session_id)
    if nodes:
        for node in nodes:
            engine.nodes[node.id] = node
            if node.parent_id is None:
                engine.root_id = node.id
        engine.current_iteration = max((n.visits for n in nodes), default=0)
    else:
        await engine.initialize()

    active_engines[session_id] = engine
    return engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and load provider keys
    await init_db()
    await repository.load_saved_provider_configs()
    yield
    # Shutdown: Cancel all running reasoning tasks gracefully
    for task in active_tasks.values():
        if not task.done():
            task.cancel()

app = FastAPI(
    title="Deep Reason Backend API",
    description="Autonomous Multi-Model AI Reasoning Platform with MCTS Engine and WebSocket Streaming",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local and remote frontend dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# System & Health
# -------------------------------------------------------------

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Deep Reason MCTS Engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/stats/overview", tags=["System"])
async def get_overview_stats():
    return await repository.get_overview_stats()

# -------------------------------------------------------------
# Session Management Endpoints
# -------------------------------------------------------------

@app.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED, tags=["Sessions"])
async def create_session(payload: SessionCreate):
    session_id = str(uuid.uuid4())
    title = payload.title.strip() if payload.title else f"Reasoning Session {datetime.utcnow().strftime('%b %d, %H:%M')}"
    config = payload.config or MCTSConfig()

    session = await repository.create_session(
        session_id=session_id,
        title=title,
        task=payload.task,
        config=config,
        status="idle"
    )

    # Initialize the engine and root node immediately
    engine = await get_or_create_engine(session_id)
    session.node_count = len(engine.nodes)
    return session

@app.get("/api/sessions", response_model=List[SessionResponse], tags=["Sessions"])
async def list_sessions(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    return await repository.list_sessions(limit=limit, offset=offset)

@app.get("/api/sessions/{session_id}", response_model=SessionResponse, tags=["Sessions"])
async def get_session(session_id: str):
    session = await repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.put("/api/sessions/{session_id}", response_model=SessionResponse, tags=["Sessions"])
async def update_session(session_id: str, payload: SessionUpdate):
    session = await repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    updated = await repository.update_session(
        session_id=session_id,
        title=payload.title,
        task=payload.task,
        status=payload.status,
        config=payload.config
    )

    # If engine is in memory and config changed, update it
    if session_id in active_engines and payload.config:
        active_engines[session_id].config = payload.config

    return updated

@app.delete("/api/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: str):
    # Stop running task if any
    if session_id in active_tasks:
        active_tasks[session_id].cancel()
        del active_tasks[session_id]

    if session_id in active_engines:
        del active_engines[session_id]

    deleted = await repository.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully", "session_id": session_id}

@app.get("/api/sessions/{session_id}/tree", tags=["Tree Visualization"])
async def get_tree(session_id: str):
    """Retrieve all nodes in the MCTS tree formatted for graph/tree visualization."""
    session = await repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    nodes = await repository.get_nodes_by_session(session_id)
    node_dicts = [n.to_dict() for n in nodes]

    root_id = ""
    edges = []
    max_depth = 0
    pruned_count = 0
    explored_count = 0
    total_visits = 0
    parents_with_children = 0
    total_child_branches = 0

    for n in nodes:
        if n.parent_id is None:
            root_id = n.id
        else:
            edges.append({
                "id": f"{n.parent_id}-{n.id}",
                "source": n.parent_id,
                "target": n.id,
                "action": n.action
            })
        if n.depth > max_depth:
            max_depth = n.depth
        if n.status == "pruned":
            pruned_count += 1
        if n.visits > 0:
            explored_count += 1
            total_visits += n.visits
        if n.children:
            parents_with_children += 1
            total_child_branches += len(n.children)

    avg_branching = (total_child_branches / parents_with_children) if parents_with_children > 0 else 0.0

    # Determine best trajectory
    best_path_ids = []
    if session_id in active_engines:
        try:
            best_nodes = active_engines[session_id].get_best_path()
            best_path_ids = [n.id for n in best_nodes]
        except Exception:
            best_path_ids = []
    
    if not best_path_ids and root_id:
        curr_id = root_id
        best_path_ids.append(curr_id)
        node_map = {n.id: n for n in nodes}
        while curr_id in node_map and node_map[curr_id].children:
            children_nodes = [node_map[cid] for cid in node_map[curr_id].children if cid in node_map]
            if not children_nodes:
                break
            best_child = max(children_nodes, key=lambda c: (c.q_value, c.visits))
            best_path_ids.append(best_child.id)
            curr_id = best_child.id

    for nd in node_dicts:
        if nd["id"] in best_path_ids:
            nd["is_best_path"] = True

    return {
        "session_id": session_id,
        "total_nodes": len(nodes),
        "root_id": root_id,
        "nodes": node_dicts,
        "edges": edges,
        "best_path_ids": best_path_ids,
        "stats": {
            "total_nodes": len(nodes),
            "max_depth": max_depth,
            "avg_branching_factor": round(avg_branching, 2),
            "pruned_count": pruned_count,
            "explored_count": explored_count,
            "total_visits": total_visits
        }
    }

@app.get("/api/sessions/{session_id}/node/{node_id}", tags=["Tree Visualization"])
@app.get("/api/sessions/{session_id}/nodes/{node_id}", tags=["Tree Visualization"])
async def get_node(session_id: str, node_id: str):
    node = await repository.get_node(node_id)
    if not node or node.session_id != session_id:
        raise HTTPException(status_code=404, detail="Node not found")
    return node.to_dict()

# -------------------------------------------------------------
# MCTS Execution Endpoints (Step, Run, Pause, Stop, Reset)
# -------------------------------------------------------------

@app.post("/api/sessions/{session_id}/step", tags=["Reasoning Execution"])
async def step_session(session_id: str):
    """Perform exactly ONE MCTS iteration step manually."""
    engine = await get_or_create_engine(session_id)
    await repository.update_session(session_id=session_id, status="running")
    try:
        step_result = await engine.step()
        await repository.update_session(session_id=session_id, status="paused")
        return step_result
    except Exception as e:
        await repository.update_session(session_id=session_id, status="failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}/run", tags=["Reasoning Execution"])
async def run_session(session_id: str):
    """Start continuous MCTS search in the background until completion."""
    engine = await get_or_create_engine(session_id)
    if engine.is_running:
        return {"status": "already_running", "session_id": session_id}

    await repository.update_session(session_id=session_id, status="running")

    async def _runner():
        try:
            await engine.run()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            await repository.update_session(session_id=session_id, status="failed")

    task = asyncio.create_task(_runner())
    active_tasks[session_id] = task

    return {"status": "started", "session_id": session_id}

@app.post("/api/sessions/{session_id}/pause", tags=["Reasoning Execution"])
async def pause_session(session_id: str):
    """Pause continuous execution."""
    if session_id in active_engines:
        active_engines[session_id].pause()
    await repository.update_session(session_id=session_id, status="paused")
    return {"status": "paused", "session_id": session_id}

@app.post("/api/sessions/{session_id}/resume", tags=["Reasoning Execution"])
async def resume_session(session_id: str):
    """Resume paused execution."""
    if session_id in active_engines:
        active_engines[session_id].resume()
    await repository.update_session(session_id=session_id, status="running")
    return {"status": "resumed", "session_id": session_id}

@app.post("/api/sessions/{session_id}/stop", tags=["Reasoning Execution"])
async def stop_session(session_id: str):
    """Stop continuous execution and finalize current best path."""
    if session_id in active_tasks:
        active_tasks[session_id].cancel()
    if session_id in active_engines:
        active_engines[session_id].stop()
    await repository.update_session(session_id=session_id, status="stopped")
    return {"status": "stopped", "session_id": session_id}

@app.post("/api/sessions/{session_id}/reset", tags=["Reasoning Execution"])
async def reset_session(session_id: str):
    """Reset the tree and recreate initial root node."""
    if session_id in active_tasks:
        active_tasks[session_id].cancel()
        del active_tasks[session_id]

    if session_id in active_engines:
        del active_engines[session_id]

    await repository.delete_nodes_by_session(session_id)
    await repository.update_session(session_id=session_id, status="idle", result=None)

    # Reinitialize root
    engine = await get_or_create_engine(session_id)
    return {"status": "reset", "session_id": session_id, "root_id": engine.root_id}

# -------------------------------------------------------------
# AI Provider Endpoints
# -------------------------------------------------------------

@app.get("/api/providers", response_model=List[ProviderResponse], tags=["AI Providers"])
async def list_providers():
    """List all AI providers. API keys are NEVER returned to client."""
    return await provider_registry.list_providers_response()

@app.post("/api/providers/{provider_name}/config", response_model=ProviderResponse, tags=["AI Providers"])
@app.post("/api/providers/{provider_name}/configure", response_model=ProviderResponse, tags=["AI Providers"])
async def update_provider_config(provider_name: str, payload: ProviderConfigUpdate):
    """Update API key or settings. Keys are encrypted server-side and never returned."""
    provider_name = provider_name.lower().strip()
    updated_response = await provider_registry.update_provider_config(provider_name, payload)

    # Persist encrypted configuration into database
    await repository.save_provider_config(
        name=provider_name,
        provider_type=updated_response.type,
        api_key=payload.api_key,
        base_url=payload.base_url,
        default_model=payload.default_model,
        is_active=payload.is_active
    )

    return updated_response

@app.post("/api/providers/{provider_name}/health", response_model=ProviderHealthResponse, tags=["AI Providers"])
@app.post("/api/providers/{provider_name}/test", response_model=ProviderHealthResponse, tags=["AI Providers"])
async def test_provider_health(provider_name: str):
    """Perform a live latency and connectivity health check on the specified provider."""
    return await provider_registry.check_health(provider_name)

@app.get("/api/providers/{provider_name}/models", response_model=List[ModelInfo], tags=["AI Providers"])
async def list_provider_models(provider_name: str):
    """List available reasoning models for the specified provider."""
    return await provider_registry.list_models(provider_name)

@app.get("/api/models", response_model=List[ModelInfo], tags=["AI Providers"])
async def list_all_models():
    """List all available AI reasoning models across all registered providers."""
    return await provider_registry.list_all_models()

@app.post("/api/models/test", response_model=ModelTestResponse, tags=["AI Providers"])
async def test_model_endpoint(payload: ModelTestRequest):
    """Execute a real, normalized test prompt against a selected provider and model."""
    return await provider_registry.test_model(
        provider_name=payload.provider_id,
        model_id=payload.model_id,
        test_prompt=payload.prompt
    )

# -------------------------------------------------------------
# Multi-AI Council Endpoints (Phase 2)
# -------------------------------------------------------------

@app.post("/api/council/runs", response_model=CouncilRunState, status_code=status.HTTP_201_CREATED, tags=["AI Council"])
async def create_council_run(payload: CouncilRunCreate):
    """
    Intake, validate, and launch an autonomous Multi-AI Council deliberation run.
    Queries eligible models independently, compares claims, executes peer critique,
    and synthesizes a coherent final answer.
    """
    run_id = f"run_{uuid.uuid4().hex[:12]}"

    async def _council_event_streamer(event: dict):
        await ws_manager.broadcast(run_id, event)
        if payload.session_id:
            await ws_manager.broadcast(payload.session_id, event)

    engine = CouncilEngine(
        create_params=payload,
        event_callback=_council_event_streamer,
        run_id=run_id
    )
    active_council_engines[run_id] = engine

    # Spawn asynchronous background task
    task = asyncio.create_task(engine.run())
    active_council_tasks[run_id] = task

    return engine.state

@app.get("/api/council/runs", response_model=List[CouncilRunState], tags=["AI Council"])
async def list_council_runs(limit: int = Query(50, ge=1, le=100)):
    """List historical and active Council deliberation runs."""
    return await repository.list_council_runs(limit=limit)

@app.get("/api/council/runs/{run_id}", response_model=CouncilRunState, tags=["AI Council"])
async def get_council_run(run_id: str):
    """Retrieve full execution state, candidates, comparison matrix, critiques, and synthesis."""
    if run_id in active_council_engines:
        return active_council_engines[run_id].state
    persisted = await repository.get_council_run(run_id)
    if not persisted:
        raise HTTPException(status_code=404, detail="Council run not found")
    return persisted

@app.get("/api/council/runs/{run_id}/candidates", response_model=List[CandidateResponse], tags=["AI Council"])
async def get_council_candidates(run_id: str):
    """Retrieve candidate responses from all participating models."""
    run = await get_council_run(run_id)
    return run.candidates

@app.get("/api/council/runs/{run_id}/comparison", response_model=Optional[ComparisonMatrix], tags=["AI Council"])
async def get_council_comparison(run_id: str):
    """Retrieve agreement, contradiction, and uncertainty findings across candidates."""
    run = await get_council_run(run_id)
    return run.comparison_matrix

@app.get("/api/council/runs/{run_id}/critiques", response_model=List[CritiqueResult], tags=["AI Council"])
async def get_council_critiques(run_id: str):
    """Retrieve structured cross-model peer critiques and resolution rationale."""
    run = await get_council_run(run_id)
    return run.critiques

@app.get("/api/council/runs/{run_id}/synthesis", response_model=Optional[CouncilSynthesis], tags=["AI Council"])
async def get_council_synthesis(run_id: str):
    """Retrieve the synthesized final answer, supporting claims, and unverified assumptions."""
    run = await get_council_run(run_id)
    return run.synthesis

@app.post("/api/council/runs/{run_id}/cancel", tags=["AI Council"])
async def cancel_council_run(run_id: str):
    """Cancel an ongoing Council deliberation run."""
    if run_id in active_council_engines:
        active_council_engines[run_id].cancel()
    if run_id in active_council_tasks:
        active_council_tasks[run_id].cancel()
    return {"status": "cancelled", "run_id": run_id}

# -------------------------------------------------------------
# WebSocket Live Streaming Endpoint
# -------------------------------------------------------------

@app.websocket("/ws/council/{run_id}")
async def websocket_council_endpoint(websocket: WebSocket, run_id: str):
    """WebSocket endpoint for live Council run event streaming."""
    await ws_manager.connect(run_id, websocket)
    if run_id in active_council_engines:
        state = active_council_engines[run_id].state
        await websocket.send_json({
            "type": "council_snapshot",
            "run_id": run_id,
            "status": state.status,
            "data": state.model_dump()
        })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(run_id, websocket)
    except Exception:
        ws_manager.disconnect(run_id, websocket)

@app.websocket("/ws/reasoning/{session_id}")
@app.websocket("/ws/sessions/{session_id}")
async def websocket_reasoning_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for live reasoning execution, event streaming, and bidirectional control.
    """
    await ws_manager.connect(session_id, websocket)
    engine = await get_or_create_engine(session_id)

    # Send initial state snapshot upon connection
    nodes = list(engine.nodes.values())
    await websocket.send_json({
        "type": "connection_established",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "session_id": session_id,
        "data": {
            "root_id": engine.root_id,
            "total_nodes": len(nodes),
            "current_iteration": engine.current_iteration,
            "is_running": engine.is_running,
            "is_paused": engine.is_paused,
            "nodes": [n.to_dict() for n in nodes]
        }
    })

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                command = json.loads(data_text)
                action = command.get("action", "").lower()

                if action in ("run", "start"):
                    if not engine.is_running:
                        await repository.update_session(session_id=session_id, status="running")
                        asyncio.create_task(engine.run())
                        await websocket.send_json({"type": "status_change", "status": "running"})

                elif action == "step":
                    await repository.update_session(session_id=session_id, status="running")
                    step_res = await engine.step()
                    await repository.update_session(session_id=session_id, status="paused")
                    await websocket.send_json({"type": "step_finished", "data": step_res})

                elif action == "pause":
                    engine.pause()
                    await repository.update_session(session_id=session_id, status="paused")
                    await websocket.send_json({"type": "status_change", "status": "paused"})

                elif action == "resume":
                    engine.resume()
                    await repository.update_session(session_id=session_id, status="running")
                    await websocket.send_json({"type": "status_change", "status": "running"})

                elif action == "stop":
                    engine.stop()
                    await repository.update_session(session_id=session_id, status="stopped")
                    await websocket.send_json({"type": "status_change", "status": "stopped"})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON payload received"})

    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, websocket)
    except Exception:
        ws_manager.disconnect(session_id, websocket)
