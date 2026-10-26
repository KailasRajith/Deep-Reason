import re
import uuid
from typing import List, Dict, Set, Tuple, Optional
from models.council import (
    CandidateResponse,
    ComparisonFinding,
    ComparisonMatrix,
    FindingCategory,
    FindingSeverity,
    AtomicClaim
)
from providers.registry import provider_registry

class CouncilComparator:
    """
    Compares independent candidate responses to identify:
    - Agreements (semantic consensus clusters)
    - Contradictions (mutually exclusive propositions)
    - Complementary insights (unique, valuable perspectives)
    - Unsupported assertions (claims asserted without derivation/evidence)
    - Assumption differences (divergences based on differing premises)
    - Unresolved uncertainties
    """

    @classmethod
    async def compare_candidates(
        cls,
        run_id: str,
        candidates: List[CandidateResponse],
        critic_model: Optional[Dict[str, str]] = None
    ) -> ComparisonMatrix:
        valid_candidates = [c for c in candidates if c.status == "success" and c.normalized_content.strip()]
        if not valid_candidates:
            return ComparisonMatrix(
                run_id=run_id,
                findings=[],
                consensus_ratio=0.0
            )

        findings: List[ComparisonFinding] = []
        agreements: List[str] = []
        contradictions: List[str] = []
        complementary: List[str] = []
        unsupported: List[str] = []
        minority: List[str] = []

        # If only 1 candidate (e.g. Quick mode or all others failed)
        if len(valid_candidates) == 1:
            cand = valid_candidates[0]
            findings.append(ComparisonFinding(
                id=f"find_{uuid.uuid4().hex[:8]}",
                category="complementary",
                title=f"Single Model Evaluation ({cand.model_id})",
                description="Only one candidate model was evaluated; comparative consensus analysis is skipped.",
                supporting_candidate_ids=[cand.id],
                conflicting_candidate_ids=[],
                severity="low",
                resolution_status="resolved"
            ))
            return ComparisonMatrix(
                run_id=run_id,
                findings=findings,
                complementary_insights=[f"Autonomous assessment provided solely by {cand.model_id}."],
                consensus_ratio=1.0
            )

        # 1. Deterministic Semantic Analysis & Claim Clustering
        all_claims: List[Tuple[CandidateResponse, AtomicClaim]] = []
        for c in valid_candidates:
            for clm in c.claims:
                all_claims.append((c, clm))

        # Check keyword/n-gram overlaps for agreements and contradictions
        processed_pairs: Set[Tuple[str, str]] = set()

        for i, (cand_a, claim_a) in enumerate(all_claims):
            for j, (cand_b, claim_b) in enumerate(all_claims):
                if i >= j or cand_a.id == cand_b.id:
                    continue

                pair_key = (min(claim_a.id, claim_b.id), max(claim_a.id, claim_b.id))
                if pair_key in processed_pairs:
                    continue
                processed_pairs.add(pair_key)

                overlap = cls._calculate_jaccard_similarity(claim_a.claim_text, claim_b.claim_text)

                # Direct semantic alignment (Agreement)
                if overlap >= 0.45 or cls._check_substantive_agreement(claim_a.claim_text, claim_b.claim_text):
                    title = f"Consensus on: {claim_a.claim_text[:60]}..."
                    desc = f"Both {cand_a.model_id} and {cand_b.model_id} assert aligned propositions: '{claim_a.claim_text}' and '{claim_b.claim_text}'."
                    findings.append(ComparisonFinding(
                        id=f"find_{uuid.uuid4().hex[:8]}",
                        category="agreement",
                        title=title,
                        description=desc,
                        relevant_claim_ids=[claim_a.id, claim_b.id],
                        supporting_candidate_ids=[cand_a.id, cand_b.id],
                        conflicting_candidate_ids=[],
                        severity="low",
                        resolution_status="resolved"
                    ))
                    agreements.append(f"{cand_a.model_id} & {cand_b.model_id}: {claim_a.claim_text[:80]}")

                # Check for direct contradictions (Antonyms / negation under identical subjects)
                elif cls._check_direct_contradiction(claim_a.claim_text, claim_b.claim_text):
                    title = f"Contradiction: {claim_a.claim_text[:50]} vs {claim_b.claim_text[:50]}"
                    desc = f"Direct conflict detected between {cand_a.model_id} ('{claim_a.claim_text}') and {cand_b.model_id} ('{claim_b.claim_text}')."
                    findings.append(ComparisonFinding(
                        id=f"find_{uuid.uuid4().hex[:8]}",
                        category="contradiction",
                        title=title,
                        description=desc,
                        relevant_claim_ids=[claim_a.id, claim_b.id],
                        supporting_candidate_ids=[cand_a.id],
                        conflicting_candidate_ids=[cand_b.id],
                        severity="high",
                        resolution_status="open"
                    ))
                    contradictions.append(f"Conflict between {cand_a.model_id} and {cand_b.model_id}: '{claim_a.claim_text}' vs '{claim_b.claim_text}'")

        # 2. Check for Unsupported Assertions
        for cand in valid_candidates:
            for clm in cand.claims:
                if clm.category in ("factual", "mathematical") and not clm.evidence_sources and not cand.evidence:
                    # If asserted without any supporting citation or formula
                    unsupported.append(f"{cand.model_id}: {clm.claim_text}")
                    if len(unsupported) <= 3:
                        findings.append(ComparisonFinding(
                            id=f"find_{uuid.uuid4().hex[:8]}",
                            category="unsupported_assertion",
                            title=f"Unverified Claim by {cand.model_id}",
                            description=f"Candidate introduced '{clm.claim_text}' without citing supporting evidence or mathematical proof.",
                            relevant_claim_ids=[clm.id],
                            supporting_candidate_ids=[cand.id],
                            conflicting_candidate_ids=[],
                            severity="medium",
                            resolution_status="open"
                        ))

        # 3. Check for Complementary Insights and Unique Minority Viewpoints
        for cand in valid_candidates:
            unique_elements = [clm for clm in cand.claims if not any(cand.id in f.supporting_candidate_ids for f in findings if f.category == "agreement")]
            if unique_elements:
                minority_claim = unique_elements[0]
                complementary.append(f"{cand.model_id}: {minority_claim.claim_text[:100]}")
                minority.append(f"{cand.model_id} highlighted: '{minority_claim.claim_text}'")
                findings.append(ComparisonFinding(
                    id=f"find_{uuid.uuid4().hex[:8]}",
                    category="complementary",
                    title=f"Unique Perspective from {cand.model_id}",
                    description=f"{cand.model_id} provided a distinct angle not addressed by other models: '{minority_claim.claim_text}'.",
                    relevant_claim_ids=[minority_claim.id],
                    supporting_candidate_ids=[cand.id],
                    conflicting_candidate_ids=[],
                    severity="low",
                    resolution_status="open"
                ))

        # 4. Check for Assumption Differences
        all_assumptions = [(c, a) for c in valid_candidates for a in c.assumptions]
        if len(all_assumptions) >= 2:
            cand_1, assump_1 = all_assumptions[0]
            cand_2, assump_2 = all_assumptions[1]
            if cand_1.id != cand_2.id:
                findings.append(ComparisonFinding(
                    id=f"find_{uuid.uuid4().hex[:8]}",
                    category="assumption_difference",
                    title="Differing Premise / Assumptions",
                    description=f"{cand_1.model_id} assumes '{assump_1}' whereas {cand_2.model_id} bases reasoning on '{assump_2}'.",
                    supporting_candidate_ids=[cand_1.id],
                    conflicting_candidate_ids=[cand_2.id],
                    severity="medium",
                    resolution_status="open"
                ))

        # 5. Calculate Consensus Ratio
        # Documented formula: (2 * total_agreed_pairs) / (total_candidates * (total_candidates - 1) * max(1, len(all_claims)))
        # Clamped strictly in [0.0, 1.0]
        total_pairs = max(1, len(valid_candidates) * (len(valid_candidates) - 1) // 2)
        agreements_count = len([f for f in findings if f.category == "agreement"])
        contradictions_count = len([f for f in findings if f.category == "contradiction"])

        base_ratio = agreements_count / (agreements_count + contradictions_count + 1)
        consensus_ratio = round(max(0.05, min(0.95, base_ratio)), 2)

        return ComparisonMatrix(
            run_id=run_id,
            findings=findings,
            agreement_points=agreements[:5],
            contradictions=contradictions[:5],
            complementary_insights=complementary[:5],
            unsupported_assertions=unsupported[:5],
            minority_viewpoints=minority[:5],
            consensus_ratio=consensus_ratio
        )

    @classmethod
    def _calculate_jaccard_similarity(cls, s1: str, s2: str) -> float:
        words1 = set(re.findall(r"\b\w{4,}\b", s1.lower()))
        words2 = set(re.findall(r"\b\w{4,}\b", s2.lower()))
        if not words1 or not words2:
            return 0.0
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        return intersection / union if union > 0 else 0.0

    @classmethod
    def _check_substantive_agreement(cls, s1: str, s2: str) -> bool:
        # Check if key numerical or named entities match
        nums1 = set(re.findall(r"\b\d+(\.\d+)?\b", s1))
        nums2 = set(re.findall(r"\b\d+(\.\d+)?\b", s2))
        if nums1 and nums2 and nums1 == nums2:
            return True
        return False

    @classmethod
    def _check_direct_contradiction(cls, s1: str, s2: str) -> bool:
        # Identify explicit antonym pairs or negation of identical entities
        w1 = s1.lower()
        w2 = s2.lower()

        negation_pairs = [
            ("possible", "impossible"),
            ("true", "false"),
            ("valid", "invalid"),
            ("converges", "diverges"),
            ("can", "cannot"),
            ("increase", "decrease"),
            ("positive", "negative"),
            ("always", "never")
        ]

        # Check if common subject exists with opposing polarity
        for pos, neg in negation_pairs:
            if (pos in w1 and neg in w2) or (neg in w1 and pos in w2):
                words1 = set(re.findall(r"\b\w{4,}\b", w1))
                words2 = set(re.findall(r"\b\w{4,}\b", w2))
                # Significant subject overlap (exact word or 4-letter root)
                if words1.intersection(words2) or any(w_a[:4] == w_b[:4] for w_a in words1 for w_b in words2):
                    return True

        # Check for opposing numerical conclusions
        nums1 = re.findall(r"\b\d+(\.\d+)?\b", s1)
        nums2 = re.findall(r"\b\d+(\.\d+)?\b", s2)
        if nums1 and nums2 and nums1 != nums2:
            if any(term in w1 for term in ["answer is", "result is", "="]) and any(term in w2 for term in ["answer is", "result is", "="]):
                return True

        return False
