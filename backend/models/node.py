from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MCTSNode(BaseModel):
    id: str = Field(..., description="Unique node identifier")
    parent_id: Optional[str] = Field(None, description="Parent node id or None for root")
    session_id: str = Field(..., description="Associated reasoning session id")
    depth: int = Field(0, description="Depth level from root")
    state: str = Field(..., description="Cumulative reasoning context / state")
    action: str = Field(..., description="The reasoning action/step leading to this state")
    visits: int = Field(0, description="Visit count N(s)")
    value: float = Field(0.0, description="Accumulated backpropagated reward W(s)")
    reward: float = Field(0.0, description="Immediate evaluation reward score Q(s,a) in [0.0, 1.0]")
    status: str = Field("unvisited", description="Node status: unvisited, active, expanded, pruned, terminal, best_path")
    children: List[str] = Field(default_factory=list, description="IDs of child nodes")
    evaluator_feedback: Optional[str] = Field(None, description="Critique and evaluation reasoning from AI evaluator")
    created_at: str = Field(..., description="ISO 8601 timestamp of node creation")

    @property
    def q_value(self) -> float:
        """Average reward Q = W / N"""
        return self.value / self.visits if self.visits > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        d = self.model_dump()
        d["q_value"] = round(self.q_value, 4)
        d["avg_value"] = round(self.q_value, 4)
        d["total_value"] = self.value
        d["children_ids"] = list(self.children)
        d["is_terminal"] = self.status == "terminal"
        d["is_best_path"] = self.status == "best_path"
        return d
