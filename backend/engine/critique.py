import re
import uuid
import time
from typing import List, Dict, Optional, Tuple
from models.council import (
    CandidateResponse,
    ComparisonMatrix,
    CritiqueResult,
    CritiqueObjectionSeverity,
    CritiqueResolution
)
from providers.registry import provider_registry

class CouncilCritiqueEngine:
    """
    Coordinates targeted cross-model critiques where designated or rotating critic
    models stress-test premises, spot subtle logical fallacies, detect violated constraints,
    and formulate structured objections with proposed corrections.
    """

    @classmethod
    async def run_critiques(
        cls,
        run_id: str,
        task: str,
        candidates: List[CandidateResponse],
        comparison: ComparisonMatrix,
        critic_model: Optional[Dict[str, str]] = None,
        max_critique_rounds: int = 1
    ) -> List[CritiqueResult]:
        valid_candidates = [c for c in candidates if c.status == "success" and c.normalized_content.strip()]
        if not valid_candidates:
            return []

        critique_results: List[CritiqueResult] = []

        # Target selection: prioritize candidates involved in contradictions or unsupported assertions
        contradiction_candidate_ids = set()
        for f in comparison.findings:
            if f.category in ("contradiction", "unsupported_assertion"):
                contradiction_candidate_ids.update(f.supporting_candidate_ids)
                contradiction_candidate_ids.update(f.conflicting_candidate_ids)

        # Select up to 3 candidates to critique
        targets = [c for c in valid_candidates if c.id in contradiction_candidate_ids]
        if not targets:
            targets = valid_candidates[:2]

        for target in targets[:3]:
            # Determine critic provider & model (rotate if possible)
            other_candidates = [c for c in valid_candidates if c.id != target.id]
            if critic_model:
                critic_provider = critic_model.get("provider_id", "openrouter")
                critic_model_id = critic_model.get("model_id", "anthropic/claude-3.5-sonnet")
            elif other_candidates:
                critic_provider = other_candidates[0].provider_id
                critic_model_id = other_candidates[0].model_id
            else:
                critic_provider = target.provider_id
                critic_model_id = target.model_id

            # Execute critique
            critique = await cls._execute_single_critique(
                run_id=run_id,
                task=task,
                target_candidate=target,
                critic_provider=critic_provider,
                critic_model_id=critic_model_id,
                comparison=comparison
            )
            critique_results.append(critique)

        return critique_results

    @classmethod
    async def _execute_single_critique(
        cls,
        run_id: str,
        task: str,
        target_candidate: CandidateResponse,
        critic_provider: str,
        critic_model_id: str,
        comparison: ComparisonMatrix
    ) -> CritiqueResult:
        critique_id = f"crit_{uuid.uuid4().hex[:10]}"
        provider = provider_registry.get_provider(critic_provider)

        prompt = cls._build_critique_prompt(task, target_candidate, comparison)

        start_time = time.time()
        if provider and provider.is_configured:
            try:
                system_prompt = (
                    "You are a rigorous, impartial scientific critic. Your role is to examine "
                    "a candidate answer to a problem, find subtle fallacies, unwarranted assumptions, "
                    "or missed edge cases, and propose concrete repairs. Respond strictly in JSON."
                )
                response = await provider.generate_structured(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    model=critic_model_id,
                    temperature=0.2,
                    max_tokens=1500
                )
                latency = round((time.time() - start_time) * 1000, 2)

                parsed = response.parsed_json or {}
                if parsed:
                    objection = parsed.get("objection") or parsed.get("criticism", "Potential boundary vulnerability detected.")
                    explanation = parsed.get("explanation") or parsed.get("rationale", "")
                    severity = cls._normalize_severity(parsed.get("severity", "medium"))
                    proposed_correction = parsed.get("proposed_correction") or parsed.get("correction")
                    resolution = cls._evaluate_resolution(objection, severity, target_candidate)

                    return CritiqueResult(
                        id=critique_id,
                        run_id=run_id,
                        target_candidate_id=target_candidate.id,
                        target_claim_id=target_candidate.claims[0].id if target_candidate.claims else None,
                        critic_provider_id=critic_provider,
                        critic_model_id=critic_model_id,
                        objection_category="logical_consistency",
                        objection=objection,
                        supporting_explanation=explanation or "Critic identified tension between premise and conclusion.",
                        severity=severity,
                        proposed_correction=proposed_correction,
                        resolution=resolution,
                        resolution_rationale=f"Assessed by algorithmic evaluator: objection severity '{severity}' requires targeted refinement.",
                        latency_ms=latency
                    )
            except Exception as e:
                # Fallback to algorithmic critique
                pass

        # Algorithmic Heuristic Critique
        latency = round((time.time() - start_time) * 1000, 2)
        return cls._generate_heuristic_critique(run_id, critique_id, task, target_candidate, critic_provider, critic_model_id, latency)

    @classmethod
    def _build_critique_prompt(cls, task: str, target: CandidateResponse, comparison: ComparisonMatrix) -> str:
        contradictions_summary = "\n".join(f"- {c}" for c in comparison.contradictions[:3]) or "None observed."
        claims_summary = "\n".join(f"- [{c.category}] {c.claim_text}" for c in target.claims[:4])

        return f"""CRITIQUE REQUEST:
Problem Statement:
{task}

Candidate Answer Under Review (Model: {target.model_id}):
{target.normalized_content}

Extracted Key Claims:
{claims_summary}

Known Disagreements with Other Models:
{contradictions_summary}

Your task: Evaluate this candidate answer with senior-level scrutiny.
Identify any:
1. Mathematical errors or arithmetic slips
2. Unjustified leaps in logic or non-sequiturs
3. Violated constraints from the problem
4. Edge cases where this solution fails

Respond in valid JSON with these keys:
{{
  "objection": "Clear statement of the primary flaw or risk",
  "explanation": "Why this objection is valid with evidence or counterexample",
  "severity": "low | medium | high | critical",
  "proposed_correction": "Specific recommendation to repair the reasoning"
}}"""

    @classmethod
    def _normalize_severity(cls, raw: str) -> CritiqueObjectionSeverity:
        s = str(raw).lower()
        if "crit" in s:
            return "critical"
        if "high" in s:
            return "high"
        if "low" in s:
            return "low"
        return "medium"

    @classmethod
    def _evaluate_resolution(cls, objection: str, severity: CritiqueObjectionSeverity, candidate: CandidateResponse) -> CritiqueResolution:
        if severity in ("critical", "high"):
            return "accepted"
        if severity == "medium":
            return "partially_accepted"
        return "unresolved"

    @classmethod
    def _generate_heuristic_critique(
        cls,
        run_id: str,
        critique_id: str,
        task: str,
        candidate: CandidateResponse,
        critic_provider: str,
        critic_model_id: str,
        latency_ms: float
    ) -> CritiqueResult:
        content = candidate.normalized_content.lower()

        # Check for boundary conditions
        if any(sym in task for sym in ["limit", "maximum", "minimum", "edge", "boundary", "0", "negative"]):
            if not any(w in content for w in ["edge case", "boundary", "limit", "zero", "negative"]):
                return CritiqueResult(
                    id=critique_id,
                    run_id=run_id,
                    target_candidate_id=candidate.id,
                    target_claim_id=candidate.claims[0].id if candidate.claims else None,
                    critic_provider_id=critic_provider,
                    critic_model_id=critic_model_id,
                    objection_category="boundary_conditions",
                    objection="Missing explicit boundary condition analysis.",
                    supporting_explanation="The candidate does not verify edge cases (e.g., zero, negative inputs, asymptotic bounds) stated in the task.",
                    severity="high",
                    proposed_correction="Incorporate verification of asymptotic boundary constraints.",
                    resolution="accepted",
                    resolution_rationale="Boundary conditions omitted from core deduction.",
                    latency_ms=latency_ms
                )

        # Check for unverified mathematical assertions
        if any(c.category == "mathematical" and not c.evidence_sources for c in candidate.claims):
            return CritiqueResult(
                id=critique_id,
                run_id=run_id,
                target_candidate_id=candidate.id,
                target_claim_id=candidate.claims[0].id if candidate.claims else None,
                critic_provider_id=critic_provider,
                critic_model_id=critic_model_id,
                objection_category="claim_correctness",
                objection="Mathematical claim stated without full derivation steps.",
                supporting_explanation="The intermediate algebraic or numeric progression contains an asserted value without full symbolic proof.",
                severity="medium",
                proposed_correction="Provide explicit step-by-step arithmetic verification.",
                resolution="partially_accepted",
                resolution_rationale="Accepted for candidate refinement to strengthen derivation.",
                latency_ms=latency_ms
            )

        # General robustness critique
        return CritiqueResult(
            id=critique_id,
            run_id=run_id,
            target_candidate_id=candidate.id,
            target_claim_id=candidate.claims[0].id if candidate.claims else None,
            critic_provider_id=critic_provider,
            critic_model_id=critic_model_id,
            objection_category="logical_consistency",
            objection="General premise requires tighter justification.",
            supporting_explanation="While structurally sound, the candidate's core deduction benefits from explicit qualification of unstated assumptions.",
            severity="low",
            proposed_correction="State explicit scope and boundary assumptions.",
            resolution="partially_accepted",
            resolution_rationale="Partially accepted to enrich synthesis context.",
            latency_ms=latency_ms
        )
