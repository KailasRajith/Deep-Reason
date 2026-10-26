import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from models.council import (
    CouncilRunCreate,
    CouncilRunState,
    ModelSelection,
    CandidateResponse,
    AtomicClaim,
    CouncilBudgetConfig
)
from engine.normalizer import ResponseNormalizer
from engine.comparator import CouncilComparator
from engine.critique import CouncilCritiqueEngine
from engine.refinement import CandidateRefiner
from engine.synthesizer import CouncilSynthesizer
from engine.council import CouncilEngine
from db.database import init_db
from db.repository import repository
from starlette.testclient import TestClient
from server import app

class TestCouncilPipeline(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        await init_db()

    # -------------------------------------------------------------
    # 1. Test Claim Normalization & Classification
    # -------------------------------------------------------------
    def test_response_normalizer(self):
        print("\n--- 1. Testing Response Normalizer & Claim Extraction ---")
        raw_text = (
            "We analyze the optimization problem.\n"
            "* Therefore, the maximum value equals 42 because the derivative f'(x) = 0.\n"
            "* The historical proof was published in 1994 by Andrew Wiles.\n"
            "* This approach is arguably the most elegant solution.\n"
            "Assuming that environmental noise is zero."
        )

        cand = ResponseNormalizer.normalize_candidate(
            run_id="run_test_norm",
            provider_id="openrouter",
            model_id="deepseek/deepseek-r1",
            raw_text=raw_text,
            latency_ms=120.5
        )

        self.assertEqual(cand.provider_id, "openrouter")
        self.assertEqual(cand.model_id, "deepseek/deepseek-r1")
        self.assertEqual(cand.status, "success")
        self.assertEqual(cand.version, 1)
        self.assertIsNone(cand.parent_id)
        self.assertTrue(len(cand.claims) >= 2)

        # Check claim classification
        categories = [c.category for c in cand.claims]
        self.assertTrue(any(cat in ("mathematical", "logical") for cat in categories))
        print(f"[PASS] Normalizer extracted {len(cand.claims)} claims with categories: {categories}")

        # Check that assertions are initialized as unverified
        for clm in cand.claims:
            self.assertEqual(clm.verification_status, "unverified")
        print("[PASS] Verified integrity: model claims are strictly initialized as 'unverified'.")

    # -------------------------------------------------------------
    # 2. Test Agreement & Contradiction Analysis
    # -------------------------------------------------------------
    async def test_council_comparator(self):
        print("\n--- 2. Testing Council Comparator (Agreements & Contradictions) ---")
        cand1 = CandidateResponse(
            id="c1",
            run_id="run_comp",
            provider_id="openrouter",
            model_id="deepseek/deepseek-r1",
            original_text="The sequence converges because the limit is equal to 0.",
            normalized_content="The sequence converges because the limit is equal to 0.",
            claims=[
                AtomicClaim(id="clm_1", candidate_id="c1", claim_text="The sequence converges to 0", category="mathematical")
            ]
        )
        cand2 = CandidateResponse(
            id="c2",
            run_id="run_comp",
            provider_id="gemini",
            model_id="gemini-2.0-flash",
            original_text="The sequence diverges and cannot converge to a finite value.",
            normalized_content="The sequence diverges and cannot converge to a finite value.",
            claims=[
                AtomicClaim(id="clm_2", candidate_id="c2", claim_text="The sequence diverges and cannot converge", category="mathematical")
            ]
        )
        cand3 = CandidateResponse(
            id="c3",
            run_id="run_comp",
            provider_id="openai_compatible",
            model_id="gpt-4o",
            original_text="The sequence converges because the limit is equal to 0.",
            normalized_content="The sequence converges because the limit is equal to 0.",
            claims=[
                AtomicClaim(id="clm_3", candidate_id="c3", claim_text="The sequence converges to 0", category="mathematical")
            ]
        )

        matrix = await CouncilComparator.compare_candidates("run_comp", [cand1, cand2, cand3])

        self.assertGreater(len(matrix.findings), 0)
        # Should detect agreement between c1 and c3
        agreements = [f for f in matrix.findings if f.category == "agreement"]
        self.assertTrue(len(agreements) > 0)
        print(f"[PASS] Consensus detected: {len(agreements)} agreement finding(s).")

        # Should detect contradiction between converges and diverges
        contradictions = [f for f in matrix.findings if f.category == "contradiction"]
        self.assertTrue(len(contradictions) > 0)
        print(f"[PASS] Contradiction detected: {len(contradictions)} contradiction finding(s) between opposing claims.")

        # Check consensus ratio in [0, 1]
        self.assertTrue(0.0 <= matrix.consensus_ratio <= 1.0)
        print(f"[PASS] Documented consensus ratio calculation: {matrix.consensus_ratio}")

    # -------------------------------------------------------------
    # 3. Test Targeted Cross-Model Critique
    # -------------------------------------------------------------
    async def test_council_critique(self):
        print("\n--- 3. Testing Targeted Cross-Model Critique ---")
        cand = CandidateResponse(
            id="cand_test",
            run_id="run_crit",
            provider_id="openrouter",
            model_id="deepseek/deepseek-r1",
            original_text="Dividing by variable x yields the simplified solution.",
            normalized_content="Dividing by variable x yields the simplified solution.",
            claims=[
                AtomicClaim(id="clm_x", candidate_id="cand_test", claim_text="Dividing by variable x", category="mathematical")
            ]
        )
        comp = await CouncilComparator.compare_candidates("run_crit", [cand])

        critiques = await CouncilCritiqueEngine.run_critiques(
            run_id="run_crit",
            task="Find the limit as x approaches 0, accounting for boundary conditions.",
            candidates=[cand],
            comparison=comp
        )

        self.assertTrue(len(critiques) > 0)
        first_crit = critiques[0]
        self.assertEqual(first_crit.target_candidate_id, "cand_test")
        self.assertIn(first_crit.severity, ["low", "medium", "high", "critical"])
        self.assertIn(first_crit.resolution, ["accepted", "rejected", "partially_accepted", "unresolved"])
        self.assertTrue(len(first_crit.resolution_rationale) > 0)
        print(f"[PASS] Critique produced objection: '{first_crit.objection}' (Severity: {first_crit.severity}, Resolution: {first_crit.resolution})")

    # -------------------------------------------------------------
    # 4. Test Candidate Refinement & Versioning
    # -------------------------------------------------------------
    async def test_candidate_refinement(self):
        print("\n--- 4. Testing Candidate Refinement & Lineage Versioning ---")
        cand = CandidateResponse(
            id="cand_v1",
            run_id="run_ref",
            provider_id="openrouter",
            model_id="deepseek/deepseek-r1",
            version=1,
            original_text="Initial candidate solution.",
            normalized_content="Initial candidate solution.",
            claims=[AtomicClaim(id="c_1", candidate_id="cand_v1", claim_text="Basic step", category="logical")]
        )

        from models.council import CritiqueResult
        fake_critique = CritiqueResult(
            id="crit_1",
            run_id="run_ref",
            target_candidate_id="cand_v1",
            critic_provider_id="openrouter",
            critic_model_id="anthropic/claude-3.5-sonnet",
            objection="Failed to account for boundary case x=0.",
            supporting_explanation="x=0 creates an undefined division.",
            severity="high",
            proposed_correction="Include guard condition x != 0.",
            resolution="accepted",
            resolution_rationale="Accepted for candidate refinement."
        )

        refined_cands, records = await CandidateRefiner.refine_candidates(
            run_id="run_ref",
            task="Solve for x with boundary checks.",
            candidates=[cand],
            critiques=[fake_critique]
        )

        self.assertEqual(len(refined_cands), 1)
        ref_cand = refined_cands[0]
        self.assertEqual(ref_cand.version, 2)
        self.assertEqual(ref_cand.parent_id, "cand_v1")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].original_candidate_id, "cand_v1")
        self.assertEqual(records[0].refined_candidate_id, ref_cand.id)
        print(f"[PASS] Candidate refined to v2 ({ref_cand.id}) with preserved parent_id={ref_cand.parent_id}")

    # -------------------------------------------------------------
    # 5. Test Final Evidence-Aware Synthesis
    # -------------------------------------------------------------
    async def test_synthesis_engine(self):
        print("\n--- 5. Testing Evidence-Aware Synthesis Engine ---")
        cands = [
            CandidateResponse(
                id="c1",
                run_id="run_syn",
                provider_id="openrouter",
                model_id="deepseek/deepseek-r1",
                original_text="The solution requires dynamic programming with O(N) space.",
                normalized_content="The solution requires dynamic programming with O(N) space.",
                claims=[AtomicClaim(id="clm_1", candidate_id="c1", claim_text="O(N) space dynamic programming", category="logical")]
            )
        ]
        comp = await CouncilComparator.compare_candidates("run_syn", cands)

        # Quick Mode Synthesis
        quick_syn = await CouncilSynthesizer.synthesize(
            run_id="run_syn",
            task="Optimize memory allocation algorithm.",
            mode="quick",
            candidates=cands,
            comparison=comp,
            critiques=[],
            refinements=[]
        )
        self.assertEqual(quick_syn.mode, "quick")
        self.assertIn("deepseek/deepseek-r1", quick_syn.participating_models)
        print("[PASS] Quick Mode synthesis verified.")

        # Deep Reasoning Mode Synthesis (with MCTS pending notice)
        deep_syn = await CouncilSynthesizer.synthesize(
            run_id="run_syn",
            task="Optimize memory allocation algorithm.",
            mode="deep_reasoning",
            candidates=cands,
            comparison=comp,
            critiques=[],
            refinements=[]
        )
        self.assertEqual(deep_syn.mode, "deep_reasoning")
        self.assertIsNotNone(deep_syn.mcts_pending_notice)
        self.assertIn("Phase 3", deep_syn.mcts_pending_notice)
        print(f"[PASS] Deep Reasoning Mode verified: MCTS notice accurately displayed ({deep_syn.mcts_pending_notice[:65]}...).")

    # -------------------------------------------------------------
    # 6. Test End-to-End Council Execution Lifecycle
    # -------------------------------------------------------------
    async def test_council_engine_full_run(self):
        print("\n--- 6. Testing End-to-End Council Engine Lifecycle ---")
        events_received = []

        async def tracker(event):
            events_received.append(event["type"])

        params = CouncilRunCreate(
            task="Determine whether P equals NP under relativizing oracles.",
            mode="council",
            budget_config=CouncilBudgetConfig(
                max_parallel_models=2,
                timeout_seconds=10.0,
                max_critique_rounds=1,
                max_refinements_per_candidate=1
            )
        )

        engine = CouncilEngine(create_params=params, event_callback=tracker)
        final_state = await engine.run()

        self.assertIn(final_state.status, ["completed", "partially_completed"])
        self.assertGreater(len(final_state.candidates), 0)
        self.assertIsNotNone(final_state.comparison_matrix)
        self.assertIsNotNone(final_state.synthesis)
        self.assertIn("phase_changed", events_received)
        print(f"[PASS] Council Engine executed through all stages: status={final_state.status}, candidates={len(final_state.candidates)}")

    # -------------------------------------------------------------
    # 7. Test REST API Endpoints
    # -------------------------------------------------------------
    def test_council_rest_endpoints(self):
        print("\n--- 7. Testing Council REST API Endpoints ---")
        client = TestClient(app)

        # Create Run
        create_resp = client.post("/api/council/runs", json={
            "task": "Explain the difference between PPO and DPO in reinforcement learning.",
            "mode": "council",
            "selected_models": [
                {"provider_id": "openrouter", "model_id": "deepseek/deepseek-r1"},
                {"provider_id": "gemini", "model_id": "gemini-2.0-flash"}
            ]
        })
        self.assertEqual(create_resp.status_code, 201)
        data = create_resp.json()
        run_id = data["run_id"]
        self.assertTrue(run_id.startswith("run_"))
        print(f"[PASS] POST /api/council/runs: 201 Created run {run_id}")

        # Get Run
        get_resp = client.get(f"/api/council/runs/{run_id}")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["run_id"], run_id)
        print(f"[PASS] GET /api/council/runs/{run_id}: 200 OK")

        # List Runs
        list_resp = client.get("/api/council/runs")
        self.assertEqual(list_resp.status_code, 200)
        print(f"[PASS] GET /api/council/runs: 200 OK")

        # Cancel Run
        cancel_resp = client.post(f"/api/council/runs/{run_id}/cancel")
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.json()["status"], "cancelled")
        print(f"[PASS] POST /api/council/runs/{run_id}/cancel: 200 OK")

if __name__ == "__main__":
    unittest.main()
