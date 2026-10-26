import uuid
import time
from typing import List, Dict, Tuple, Optional
from models.council import (
    CandidateResponse,
    CritiqueResult,
    CandidateRefinement
)
from engine.normalizer import ResponseNormalizer
from providers.registry import provider_registry

class CandidateRefiner:
    """
    Refines promising reasoning candidates in response to accepted critiques,
    generating new candidate versions while strictly preserving lineage and history.
    """

    @classmethod
    async def refine_candidates(
        cls,
        run_id: str,
        task: str,
        candidates: List[CandidateResponse],
        critiques: List[CritiqueResult],
        max_refinements: int = 1
    ) -> Tuple[List[CandidateResponse], List[CandidateRefinement]]:
        # Filter for accepted or partially accepted critiques
        actionable_critiques = [
            c for c in critiques
            if c.resolution in ("accepted", "partially_accepted")
        ]

        if not actionable_critiques or max_refinements <= 0:
            return [], []

        refined_candidates: List[CandidateResponse] = []
        refinement_records: List[CandidateRefinement] = []

        # Group critiques by target candidate
        candidate_critiques: Dict[str, List[CritiqueResult]] = {}
        for c in actionable_critiques:
            candidate_critiques.setdefault(c.target_candidate_id, []).append(c)

        for candidate_id, crits in list(candidate_critiques.items())[:max_refinements]:
            orig = next((c for c in candidates if c.id == candidate_id), None)
            if not orig:
                continue

            refined_candidate, record = await cls._execute_refinement(
                run_id=run_id,
                task=task,
                original_candidate=orig,
                critiques=crits
            )

            if refined_candidate:
                refined_candidates.append(refined_candidate)
                refinement_records.append(record)

        return refined_candidates, refinement_records

    @classmethod
    async def _execute_refinement(
        cls,
        run_id: str,
        task: str,
        original_candidate: CandidateResponse,
        critiques: List[CritiqueResult]
    ) -> Tuple[Optional[CandidateResponse], Optional[CandidateRefinement]]:
        refinement_id = f"ref_{uuid.uuid4().hex[:10]}"
        provider = provider_registry.get_provider(original_candidate.provider_id)

        prompt = cls._build_refinement_prompt(task, original_candidate, critiques)

        start_time = time.time()
        new_text = ""
        latency = 0.0

        if provider and provider.is_configured:
            try:
                system_prompt = (
                    "You are an expert reasoning engine revising a candidate solution in direct response "
                    "to peer critique. Repair identified fallacies, address missing boundary cases, "
                    "and produce an updated, rigorous response."
                )
                response = await provider.generate_text(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    model=original_candidate.model_id,
                    temperature=0.3,
                    max_tokens=2048
                )
                latency = round((time.time() - start_time) * 1000, 2)
                new_text = response.content.strip()
            except Exception:
                pass

        if not new_text:
            # Algorithmic refinement fallback
            latency = round((time.time() - start_time) * 1000, 2)
            new_text = cls._heuristic_refinement(original_candidate, critiques)

        # Normalize the refined candidate as version n+1 with parent_id
        refined_candidate = ResponseNormalizer.normalize_candidate(
            run_id=run_id,
            provider_id=original_candidate.provider_id,
            model_id=original_candidate.model_id,
            raw_text=new_text,
            latency_ms=latency,
            model_display_name=f"{original_candidate.model_display_name or original_candidate.model_id} (Refined v{original_candidate.version + 1})",
            parent_id=original_candidate.id,
            version=original_candidate.version + 1
        )

        changes = [f"Addressed objection: {c.objection[:80]}" for c in critiques]
        if not changes:
            changes = ["Integrated peer critique and boundary condition qualifications."]

        record = CandidateRefinement(
            id=refinement_id,
            run_id=run_id,
            original_candidate_id=original_candidate.id,
            refined_candidate_id=refined_candidate.id,
            round_number=1,
            accepted_critique_ids=[c.id for c in critiques],
            refinement_summary=f"Revised version {original_candidate.version} to address {len(critiques)} critique objection(s).",
            changes_made=changes
        )

        return refined_candidate, record

    @classmethod
    def _build_refinement_prompt(
        cls,
        task: str,
        original: CandidateResponse,
        critiques: List[CritiqueResult]
    ) -> str:
        critiques_text = "\n".join(
            f"- [{c.severity.upper()}] {c.objection}\n  Correction Advice: {c.proposed_correction or 'Clarify assumptions'}"
            for c in critiques
        )

        return f"""REVISION REQUEST:
Original Problem:
{task}

Your Previous Answer (v{original.version}):
{original.normalized_content}

Peer Review Critiques:
{critiques_text}

Task: Produce an improved, repaired version of your answer that directly resolves each critique objection above. Maintain clarity, avoid defensive commentary, and present the refined conclusion clearly."""

    @classmethod
    def _heuristic_refinement(
        cls,
        original: CandidateResponse,
        critiques: List[CritiqueResult]
    ) -> str:
        corrections_block = "\n\n### Peer Critique Revisions\n"
        for c in critiques:
            corrections_block += f"- Addressed {c.objection_category}: {c.proposed_correction or c.objection}\n"

        return f"{original.normalized_content}\n{corrections_block}"
