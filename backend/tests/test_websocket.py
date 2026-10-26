import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from server import app

def test_websocket_streaming():
    client = TestClient(app)

    # 1. Create a session
    res = client.post("/api/sessions", json={
        "task": "Evaluate whether P=NP.",
        "title": "P vs NP Exploration",
        "config": {
            "max_iterations": 2,
            "branching_factor": 2
        }
    })
    assert res.status_code == 201
    session_id = res.json()["id"]
    print(f"[PASS] Session created for WS test: {session_id}")

    # 2. Connect to WebSocket
    with client.websocket_connect(f"/ws/reasoning/{session_id}") as websocket:
        init_msg = websocket.receive_json()
        assert init_msg["type"] == "connection_established"
        assert init_msg["session_id"] == session_id
        print("[PASS] WebSocket connected and received initial state snapshot.")

        # 3. Send step command over WebSocket
        websocket.send_json({"action": "step"})

        received_types = []
        # Receive streamed reasoning events for the step
        for _ in range(12):
            try:
                msg = websocket.receive_json()
                m_type = msg.get("type")
                received_types.append(m_type)
                if m_type == "iteration_completed":
                    break
            except Exception:
                break

        print(f"[PASS] Events streamed over WebSocket: {received_types}")
        assert "iteration_started" in received_types
        assert "node_selected" in received_types
        assert "node_expanded" in received_types
        assert "candidate_generated" in received_types
        assert "candidate_evaluated" in received_types
        assert "reward_propagated" in received_types
        assert "iteration_completed" in received_types

    print("==========================================")
    print("WEBSOCKET LIVE STREAMING FULLY VERIFIED!")
    print("==========================================")

if __name__ == "__main__":
    test_websocket_streaming()
