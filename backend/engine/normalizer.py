import re
import uuid
from typing import List, Dict, Any, Optional
from models.council import CandidateResponse, AtomicClaim, ClaimCategory, ClaimVerificationStatus
from models.provider import UsageMetadata

class ResponseNormalizer:
    """
    Normalizes diverse unstructured or structured LLM outputs into a unified
    CandidateResponse containing atomic claims, explicit assumptions, evidence,
    and verification flags.
    """

    @classmethod
    def normalize_candidate(
        cls,
        run_id: str,
        provider_id: str,
        model_id: str,
        raw_text: str,
        usage: Optional[UsageMetadata] = None,
        latency_ms: float = 0.0,
        model_display_name: Optional[str] = None,
        parent_id: Optional[str] = None,
        version: int = 1
    ) -> CandidateResponse:
        candidate_id = f"cand_{uuid.uuid4().hex[:12]}"
        clean_text = raw_text.strip() if raw_text else ""

        # Check if output contains embedded JSON
        extracted_data = cls._try_parse_structured(clean_text)

        if extracted_data:
            content = extracted_data.get("conclusion") or extracted_data.get("answer") or clean_text
            raw_claims = extracted_data.get("claims", [])
            assumptions = extracted_data.get("assumptions", [])
            evidence = extracted_data.get("evidence", [])
            uncertainties = extracted_data.get("uncertainties", [])
            alternatives = extracted_data.get("alternatives", [])
            verification_methods = extracted_data.get("verification_methods", [])
        else:
            content = clean_text
            raw_claims, assumptions, evidence, uncertainties = cls._extract_heuristic_elements(clean_text)
            alternatives = []
            verification_methods = []

        # Convert raw claims into typed AtomicClaim objects
        atomic_claims: List[AtomicClaim] = []
        for idx, rc in enumerate(raw_claims):
            claim_text = rc if isinstance(rc, str) else str(rc.get("text", rc))
            if len(claim_text.strip()) < 5:
                continue

            category = cls._classify_claim(claim_text)
            verifiable = category in ("factual", "mathematical")

            atomic_claims.append(AtomicClaim(
                id=f"claim_{candidate_id}_{idx+1}",
                candidate_id=candidate_id,
                claim_text=claim_text.strip(),
                category=category,
                verification_required=verifiable,
                verification_status="unverified",
                evidence_sources=evidence if idx == 0 else []
            ))

        return CandidateResponse(
            id=candidate_id,
            run_id=run_id,
            provider_id=provider_id,
            model_id=model_id,
            model_display_name=model_display_name or model_id,
            version=version,
            parent_id=parent_id,
            original_text=clean_text,
            normalized_content=content,
            claims=atomic_claims,
            assumptions=assumptions,
            evidence=evidence,
            uncertainties=uncertainties,
            alternatives=alternatives,
            suggested_verification_methods=verification_methods,
            status="success",
            latency_ms=latency_ms,
            usage=usage or UsageMetadata()
        )

    @classmethod
    def _try_parse_structured(cls, text: str) -> Optional[Dict[str, Any]]:
        import json
        if not text:
            return None
        # Try straight json parse
        try:
            return json.loads(text)
        except Exception:
            pass

        # Try markdown code block extraction
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
        return None

    @classmethod
    def _extract_heuristic_elements(cls, text: str) -> tuple[List[str], List[str], List[str], List[str]]:
        claims: List[str] = []
        assumptions: List[str] = []
        evidence: List[str] = []
        uncertainties: List[str] = []

        lines = text.split("\n")
        current_section = "general"

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            lower_line = line_str.lower()
            if "assumption" in lower_line or "assuming" in lower_line:
                current_section = "assumptions"
            elif "evidence" in lower_line or "source" in lower_line or "citation" in lower_line:
                current_section = "evidence"
            elif "uncertain" in lower_line or "limitation" in lower_line or "caveat" in lower_line:
                current_section = "uncertainties"
            elif "claim" in lower_line or "key point" in lower_line:
                current_section = "claims"

            # Clean bullet markers
            cleaned = re.sub(r"^(\*|-|\d+\.|\•)\s*", "", line_str)

            if current_section == "assumptions":
                if any(w in lower_line for w in ["assume", "assuming", "suppose", "if we"]):
                    assumptions.append(cleaned)
            elif current_section == "evidence":
                if any(w in lower_line for w in ["according", "study", "data", "source", "cite"]):
                    evidence.append(cleaned)
            elif current_section == "uncertainties":
                if any(w in lower_line for w in ["uncertain", "unclear", "risk", "depends", "variable"]):
                    uncertainties.append(cleaned)
            else:
                # Default extraction for sentences/bullets
                if re.match(r"^(\*|-|\d+\.|\•)\s*", line_str) and len(cleaned) > 15:
                    claims.append(cleaned)

        # If no bullet points were found, extract sentences as candidate claims
        if not claims and len(text) > 20:
            sentences = re.split(r"(?<=[.!?])\s+", text)
            for s in sentences:
                s_clean = s.strip()
                if 20 <= len(s_clean) <= 250 and not s_clean.startswith("#"):
                    claims.append(s_clean)
                    if len(claims) >= 5:
                        break

        return claims[:8], assumptions[:4], evidence[:4], uncertainties[:4]

    @classmethod
    def _classify_claim(cls, text: str) -> ClaimCategory:
        lower = text.lower()

        # Math / Numerical Proofs
        math_symbols = ["=", "+", "-", "*", "/", "<", ">", "^", "√", "∈", "∑", "%", "formula", "equation"]
        if any(sym in text for sym in math_symbols) or re.search(r"\b\d+(\.\d+)?\b", text):
            if any(term in lower for term in ["equal", "calculate", "sum", "product", "derive", "solve"]):
                return "mathematical"

        # Logical deduction
        logical_terms = ["therefore", "because", "implies", "contradicts", "sufficient", "necessary", "iff", "thus", "hence"]
        if any(term in lower for term in logical_terms):
            return "logical"

        # Factual verification
        factual_terms = ["published", "born", "founded", "century", "located in", "released in", "measured at", "invented by"]
        if any(term in lower for term in factual_terms):
            return "factual"

        # Subjective / Interpretive
        subjective_terms = ["arguably", "best", "preferable", "recommended", "elegant", "aesthetic", "opinion", "feels"]
        if any(term in lower for term in subjective_terms):
            return "subjective"

        return "interpretive"
