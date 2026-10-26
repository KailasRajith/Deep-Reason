from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Tuple, Any
from pydantic import BaseModel, Field

from models.council import (
    CandidateResponse,
    CritiqueResult,
    CandidateRefinement,
    AtomicClaim
)

class CouncilMCTSNodeExpansionRequest(BaseModel):
    """Contract for MCTS Engine to request candidate expansion steps from Council models."""
    session_id: str
    parent_node_id: str
    current_state: str
    task: str
    num_candidates: int = Field(3, ge=1, le=8)
    preferred_models: Optional[List[Dict[str, str]]] = None

class CouncilMCTSEvaluationRequest(BaseModel):
    """Contract for MCTS Engine to evaluate a candidate reasoning node."""
    session_id: str
    node_id: str
    task: str
    state: str
    action: str
    critic_model: Optional[Dict[str, str]] = None

class CouncilMCTSEvaluationResult(BaseModel):
    """Result returned to MCTS backpropagation containing scalar reward and critique."""
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized reward in [0.0, 1.0]")
    is_terminal: bool = Field(False, description="Whether node achieves final resolution")
    critique_objections: List[str] = Field(default_factory=list)
    accepted_corrections: List[str] = Field(default_factory=list)
    feedback: str = ""
    claims_verified: int = 0
    claims_unverified: int = 0

class CouncilMCTSRefinementRequest(BaseModel):
    """Contract for MCTS Engine to trigger a repair / refinement on an existing branch node."""
    session_id: str
    node_id: str
    task: str
    original_action: str
    critiques: List[str]

class CouncilMCTSContract(ABC):
    """
    Abstract integration interface connecting the AI Council to future Phase 3/4
    Monte Carlo Tree Search (MCTS) exploration engines.
    """

    @abstractmethod
    async def get_initial_candidates(
        self,
        task: str,
        models: Optional[List[Dict[str, str]]] = None
    ) -> List[CandidateResponse]:
        """Provides initial root candidate branches for tree initialization."""
        pass

    @abstractmethod
    async def expand_branch(
        self,
        request: CouncilMCTSNodeExpansionRequest
    ) -> List[CandidateResponse]:
        """Generates candidate reasoning actions to expand a selected tree node."""
        pass

    @abstractmethod
    async def evaluate_candidate(
        self,
        request: CouncilMCTSEvaluationRequest
    ) -> CouncilMCTSEvaluationResult:
        """Evaluates a candidate branch node using multi-model critique rubric."""
        pass

    @abstractmethod
    async def refine_branch(
        self,
        request: CouncilMCTSRefinementRequest
    ) -> CandidateResponse:
        """Produces a repaired candidate version for an MCTS backtrack/repair step."""
        pass
