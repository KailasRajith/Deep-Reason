from typing import Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field

EventType = Literal[
    "session_started",
    "iteration_started",
    "node_selected",
    "node_expanded",
    "candidate_generated",
    "candidate_evaluated",
    "simulation_completed",
    "reward_propagated",
    "branch_pruned",
    "iteration_completed",
    "search_completed",
    "error"
]

class ReasoningEvent(BaseModel):
    type: EventType = Field(..., description="The event type identifier")
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat() + "Z",
        description="ISO 8601 UTC timestamp"
    )
    session_id: str = Field(..., description="Associated reasoning session id")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event payload data")

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
