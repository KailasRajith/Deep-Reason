import re
import time
from typing import List, Dict, Optional, Any
from models.council import (
    OperatingMode,
    CandidateResponse,
    ComparisonMatrix,
    CritiqueResult,
    CandidateRefinement,
    CouncilSynthesis
)
from providers.registry import provider_registry

class CouncilSynthesizer:
    """
    Synthesizes the multi-model deliberation pipeline into a coherent, evidence-aware
    final answer that combines complementary insights, states explicit assumptions,
    preserves credible minority perspectives, and transparently identifies unverified assertions.
    """

    @classmethod
    async def synthesize(
        cls,
        run_id: str,
        task: str,
        mode: OperatingMode,
        candidates: List[CandidateResponse],
        comparison: Optional[ComparisonMatrix],
        critiques: List[CritiqueResult],
        refinements: List[CandidateRefinement],
        synthesizer_model: Optional[Dict[str, str]] = None
    ) -> CouncilSynthesis:
        start_time = time.time()
        participating_models = list({c.model_id for c in candidates if c.status == "success"})

        # Total usage aggregation
        total_prompt_tokens = sum(c.usage.prompt_tokens for c in candidates)
        total_completion_tokens = sum(c.usage.completion_tokens for c in candidates)
        total_latency = sum(c.latency_ms for c in candidates) + sum(cr.latency_ms for cr in critiques)

        mcts_notice = None
        if mode == "deep_reasoning":
            mcts_notice = (
                "Deep Reasoning Mode Notice: Multi-Model Council generation, peer critique, and evidence "
                "synthesis are operational. Formal Monte Carlo Tree Search (MCTS) state-action graph "
                "rollouts and UCT backpropagation will be integrated in Phase 3 & Phase 4."
            )

        # In Quick Mode (or single candidate)
        if mode == "quick" or len(candidates) == 1:
            best_cand = candidates[0] if candidates else None
            answer = best_cand.normalized_content if best_cand else "No candidate response generated."
            claims = [c.claim_text for c in (best_cand.claims if best_cand else [])[:4]]
            assumptions = best_cand.assumptions if best_cand else []

            return CouncilSynthesis(
                run_id=run_id,
                mode=mode,
                final_answer=answer,
                key_supporting_claims=claims,
                material_minority_opinions=[],
                important_assumptions=assumptions,
                unresolved_disagreements=[],
                unverified_claims=[c for c in claims if not best_cand.evidence],
                verification_status_summary={
                    "mode": mode,
                    "verified_count": 0,
                    "unverified_count": len(claims),
                    "note": f"{mode.capitalize()} Mode executed with single candidate model."
                },
                participating_models=participating_models,
                total_latency_ms=round(total_latency, 2),
                total_prompt_tokens=total_prompt_tokens,
                total_completion_tokens=total_completion_tokens,
                confidence_assessment="Direct Model Inference",
                mcts_pending_notice=mcts_notice,
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            )

        # Multi-model Council Mode or Deep Reasoning Mode
        synth_provider = "openrouter"
        synth_model_id = "deepseek/deepseek-r1"
        if synthesizer_model:
            synth_provider = synthesizer_model.get("provider_id", "openrouter")
            synth_model_id = synthesizer_model.get("model_id", "deepseek/deepseek-r1")
        elif candidates:
            # Prefer a frontier reasoning model if available
            preferred = ["deepseek/deepseek-r1", "anthropic/claude-3.5-sonnet", "openai/gpt-4o", "gemini-2.0-flash"]
            chosen = next((c for c in candidates if c.model_id in preferred), candidates[0])
            synth_provider = chosen.provider_id
            synth_model_id = chosen.model_id

        # Compile deliberation context
        comparison_findings = comparison.findings if comparison else []
        agreements = comparison.agreement_points if comparison else []
        contradictions = comparison.contradictions if comparison else []
        minority = comparison.minority_viewpoints if comparison else []
        unsupported = comparison.unsupported_assertions if comparison else []

        # Effective candidates: prefer refined candidates over their originals
        refined_ids = {r.original_candidate_id: r.refined_candidate_id for r in refinements}
        active_candidates = [
            next((c for c in candidates if c.id == refined_ids.get(c.id)), c)
            for c in candidates
            if c.status == "success"
        ]

        # Extract all assumptions
        all_assumptions = list({a for c in active_candidates for a in c.assumptions})[:6]
        all_key_claims = list({clm.claim_text for c in active_candidates for clm in c.claims})[:8]

        # Prompt for synthesis
        synth_prompt = cls._build_synthesis_prompt(
            task=task,
            candidates=active_candidates,
            agreements=agreements,
            contradictions=contradictions,
            minority=minority,
            critiques=critiques
        )

        final_answer = ""
        provider = provider_registry.get_provider(synth_provider)

        if provider and provider.is_configured:
            try:
                system_prompt = (
                    "You are a master synthesis editor and senior adjudicator for Deep Reason. "
                    "Your mission is to synthesize the council's diverse findings into one coherent, "
                    "unambiguous final answer. Do not produce meta-commentary; directly solve the problem "
                    "drawing on the strongest peer-reviewed points."
                )
                resp = await provider.generate_text(
                    prompt=synth_prompt,
                    system_prompt=system_prompt,
                    model=synth_model_id,
                    temperature=0.3,
                    max_tokens=3000
                )
                final_answer = resp.content.strip()
                total_prompt_tokens += resp.usage.prompt_tokens
                total_completion_tokens += resp.usage.completion_tokens
                total_latency += resp.latency_ms
            except Exception:
                pass

        if not final_answer:
            final_answer = cls._heuristic_synthesis(task, active_candidates, agreements, contradictions, minority)

        # MCTS Pending notice for Deep Reasoning Mode
        mcts_notice = None
        if mode == "deep_reasoning":
            mcts_notice = (
                "Deep Reasoning Mode Notice: Multi-Model Council generation, peer critique, and evidence "
                "synthesis are operational. Formal Monte Carlo Tree Search (MCTS) state-action graph "
                "rollouts and UCT backpropagation will be integrated in Phase 3 & Phase 4."
            )

        duration = round((time.time() - start_time) * 1000, 2) + total_latency

        return CouncilSynthesis(
            run_id=run_id,
            mode=mode,
            final_answer=final_answer,
            key_supporting_claims=all_key_claims[:6],
            material_minority_opinions=minority[:4],
            important_assumptions=all_assumptions[:4],
            unresolved_disagreements=contradictions[:4],
            unverified_claims=unsupported[:4],
            verification_status_summary={
                "total_participating_models": len(participating_models),
                "unresolved_contradictions": len(contradictions),
                "consensus_ratio": comparison.consensus_ratio if comparison else 0.0,
                "refinements_applied": len(refinements),
                "verification_layer": "Heuristic Rubric + Council Cross-Critique"
            },
            participating_models=participating_models,
            total_latency_ms=round(duration, 2),
            total_prompt_tokens=total_prompt_tokens,
            total_completion_tokens=total_completion_tokens,
            confidence_assessment="High (Multi-Model Verified)" if (comparison and comparison.consensus_ratio > 0.6 and not contradictions) else "Moderate (Active Contradictions Noted)",
            mcts_pending_notice=mcts_notice,
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        )

    @classmethod
    def _build_synthesis_prompt(
        cls,
        task: str,
        candidates: List[CandidateResponse],
        agreements: List[str],
        contradictions: List[str],
        minority: List[str],
        critiques: List[CritiqueResult]
    ) -> str:
        candidates_block = "\n\n".join(
            f"--- Candidate by {c.model_id} (v{c.version}) ---\n{c.normalized_content}"
            for c in candidates
        )
        agreements_block = "\n".join(f"- {a}" for a in agreements) or "No universal agreement found."
        contradictions_block = "\n".join(f"- {c}" for c in contradictions) or "No direct contradictions detected."
        minority_block = "\n".join(f"- {m}" for m in minority) or "No distinct minority insights."
        critiques_block = "\n".join(
            f"- Critic {cr.critic_model_id} objected to candidate #{cr.target_candidate_id[-6:]}: {cr.objection} (Resolution: {cr.resolution})"
            for cr in critiques[:4]
        ) or "None."

        return f"""SYNTHESIS MISSION:
Original Task:
{task}

Candidate Answers:
{candidates_block}

Consensus Points:
{agreements_block}

Identified Contradictions / Disputes:
{contradictions_block}

Valuable Unique Perspectives:
{minority_block}

Accepted Peer Review Objections:
{critiques_block}

Instructions:
1. Provide a definitive, clear, and comprehensive final answer to the task.
2. Integrate the validated points where models agree.
3. Address and resolve disputed points using sound logic and evidence. If a dispute cannot be resolved with certainty, state the remaining nuance.
4. Retain valuable minority details that add accuracy or completeness.
5. Do NOT include phrases like 'Based on the candidates' or 'The models say'. Speak directly with authority and scientific clarity."""

    @classmethod
    def _heuristic_synthesis(
        cls,
        task: str,
        candidates: List[CandidateResponse],
        agreements: List[str],
        contradictions: List[str],
        minority: List[str]
    ) -> str:
        primary = candidates[0].normalized_content if candidates else "No reasoning candidates available."

        synthesis_lines = [
            primary,
            "",
            "### Deliberation & Synthesis Summary",
            f"- **Consensus:** {agreements[0] if agreements else 'Independent candidate models explored alternative reasoning trajectories.'}"
        ]

        if contradictions:
            synthesis_lines.append(f"- **Nuance / Disagreement:** {contradictions[0]}")
        if minority:
            synthesis_lines.append(f"- **Complementary Finding:** {minority[0]}")

        return "\n".join(synthesis_lines)
