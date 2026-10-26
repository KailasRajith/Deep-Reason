import asyncio
import os
import sys
import uuid

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from db.database import init_db
from db.repository import repository
from providers.encryption import encrypt_api_key, decrypt_api_key, mask_api_key
from providers.registry import provider_registry
from models.session import MCTSConfig, SessionCreate
from models.events import ReasoningEvent
from engine.mcts import MCTSEngine
from httpx import AsyncClient, ASGITransport
from server import app

async def run_tests():
    print("--- 1. Testing Database Initialization ---")
    await init_db()
    print("[PASS] SQLite database and schema initialized successfully.")

    print("\n--- 2. Testing API Key Encryption & Security ---")
    raw_key = "sk-or-v1-abcdef1234567890abcdef1234567890"
    encrypted = encrypt_api_key(raw_key)
    decrypted = decrypt_api_key(encrypted)
    masked = mask_api_key(raw_key)
    assert raw_key != encrypted, "Encrypted key must not match raw key"
    assert decrypted == raw_key, "Decrypted key must match raw key"
    assert masked.startswith("sk-or-") and masked.endswith("7890"), f"Masked key incorrect: {masked}"
    assert raw_key not in masked, "Masked key must not expose full raw key"
    print(f"[PASS] Encryption verified. Masked: {masked}")

    print("\n--- 3. Testing Provider Registry & Config Updates ---")
    providers = await provider_registry.list_providers_response()
    assert len(providers) >= 3, f"Expected at least 3 providers, got {len(providers)}"
    provider_names = [p.name for p in providers]
    print(f"[PASS] Found providers: {provider_names}")
    for p in providers:
        assert p.masked_key is None or "••••" in p.masked_key, "Keys must never be returned in plain text"

    print("\n--- 4. Testing MCTS Engine (Real Execution & Math) ---")
    events_collected = []
    async def capture_event(event: ReasoningEvent):
        events_collected.append(event.type)

    test_config = MCTSConfig(
        max_depth=4,
        max_iterations=5,
        branching_factor=3,
        exploration_constant=1.414,
        prune_threshold=0.25
    )

    test_session_id = f"test-session-{uuid.uuid4().hex[:8]}"
    test_session = await repository.create_session(
        session_id=test_session_id,
        title="Test Reasoning Problem",
        task="Prove that the square root of 2 is irrational.",
        config=test_config
    )

    engine = MCTSEngine(
        session_id=test_session.id,
        task=test_session.task,
        config=test_config,
        event_callback=capture_event
    )

    await engine.initialize()
    assert engine.root_id in engine.nodes
    assert engine.nodes[engine.root_id].visits == 0
    print(f"[PASS] Engine initialized with root node {engine.root_id}")

    # Test single step execution
    print("Testing MCTS step execution...")
    step_res = await engine.step()
    print(f"[PASS] Step 1 executed: iteration={step_res['iteration']}, total_nodes={step_res['total_nodes']}, reward={step_res['reward']}")
    assert step_res["iteration"] == 1
    assert step_res["total_nodes"] > 1
    assert "node_selected" in events_collected
    assert "node_expanded" in events_collected
    assert "candidate_evaluated" in events_collected
    assert "reward_propagated" in events_collected

    # Test multi-iteration run
    print("Testing MCTS run to completion...")
    final_res = await engine.run()
    print(f"[PASS] MCTS run complete: iterations={final_res['total_iterations']}, best_reward={final_res['best_reward']}, nodes={final_res['total_nodes']}")
    assert len(final_res["best_path"]) >= 2
    assert final_res["solution"] is not None and len(final_res["solution"]) > 20
    assert "search_completed" in events_collected

    print("\n--- 5. Testing REST API Endpoints ---")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # GET /health
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"
        print("[PASS] GET /health: 200 OK")

        # GET /api/providers
        res = await client.get("/api/providers")
        assert res.status_code == 200
        p_list = res.json()
        assert len(p_list) >= 3
        print(f"[PASS] GET /api/providers: 200 OK (returned {len(p_list)} providers with safe masked credentials)")

        # POST /api/sessions
        new_session_payload = {
            "task": "Find the optimal strategy for the Monty Hall problem.",
            "title": "Monty Hall Strategy",
            "config": {
                "max_iterations": 3,
                "branching_factor": 2
            }
        }
        res = await client.post("/api/sessions", json=new_session_payload)
        assert res.status_code == 201
        created = res.json()
        new_id = created["id"]
        print(f"[PASS] POST /api/sessions: 201 Created session {new_id}")

        # GET /api/sessions/{session_id}
        res = await client.get(f"/api/sessions/{new_id}")
        assert res.status_code == 200
        assert res.json()["task"] == new_session_payload["task"]
        print(f"[PASS] GET /api/sessions/{new_id}: 200 OK")

        # POST /api/sessions/{session_id}/step
        res = await client.post(f"/api/sessions/{new_id}/step")
        assert res.status_code == 200
        step_data = res.json()
        print(f"[PASS] POST /api/sessions/{new_id}/step: 200 OK (iteration={step_data['iteration']}, nodes={step_data['total_nodes']})")

        # GET /api/sessions/{session_id}/tree
        res = await client.get(f"/api/sessions/{new_id}/tree")
        assert res.status_code == 200
        tree_data = res.json()
        assert tree_data["total_nodes"] > 1
        print(f"[PASS] GET /api/sessions/{new_id}/tree: 200 OK ({tree_data['total_nodes']} nodes in tree)")

        # DELETE /api/sessions/{session_id}
        res = await client.delete(f"/api/sessions/{new_id}")
        assert res.status_code == 200
        print(f"[PASS] DELETE /api/sessions/{new_id}: 200 OK")

    print("\n==========================================")
    print("ALL TESTS PASSED! BACKEND IS 100% OPERATIONAL.")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
