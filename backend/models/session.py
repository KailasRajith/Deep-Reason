from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from config import settings

class MCTSConfig(BaseModel):
    exploration_constant: float = Field(
        default_factory=lambda: settings.DEFAULT_EXPLORATION_CONSTANT,
        description="Exploration weight c in UCT formula (sqrt(2) approx 1.414)"
    )
    max_depth: int = Field(
        default_factory=lambda: settings.DEFAULT_MAX_DEPTH,
        description="Maximum reasoning depth in tree"
    )
    max_iterations: int = Field(
        default_factory=lambda: settings.DEFAULT_MAX_ITERATIONS,
        description="Number of MCTS iterations to perform"
    )
    branching_factor: int = Field(
        default_factory=lambda: settings.DEFAULT_BRANCHING_FACTOR,
        description="Number of candidate reasoning paths generated per expansion"
    )
    prune_threshold: float = Field(
        default_factory=lambda: settings.DEFAULT_PRUNE_THRESHOLD,
        description="Minimum Q value below which branches are pruned"
    )
    generator_provider: str = Field(
        default_factory=lambda: settings.DEFAULT_GENERATOR_PROVIDER,
        description="AI Provider used for generating reasoning candidates"
    )
    generator_model: str = Field(
        default_factory=lambda: settings.DEFAULT_GENERATOR_MODEL,
        description="Model name used for generating reasoning candidates"
    )
    evaluator_provider: str = Field(
        default_factory=lambda: settings.DEFAULT_EVALUATOR_PROVIDER,
        description="AI Provider used for evaluating reasoning nodes"
    )
    evaluator_model: str = Field(
        default_factory=lambda: settings.DEFAULT_EVALUATOR_MODEL,
        description="Model name used for evaluating reasoning nodes"
    )
    temperature: float = Field(
        default_factory=lambda: settings.DEFAULT_TEMPERATURE,
        description="Sampling temperature for LLM generations"
    )

class SessionCreate(BaseModel):
    task: str = Field(..., description="The query, problem statement, or goal to reason through")
    title: Optional[str] = Field(None, description="Optional human-friendly title for the session")
    config: Optional[MCTSConfig] = Field(default_factory=MCTSConfig)

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    task: Optional[str] = None
    config: Optional[MCTSConfig] = None
    status: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    title: str
    task: str
    status: str
    config: MCTSConfig
    created_at: str
    updated_at: str
    result: Optional[Dict[str, Any]] = None
    node_count: int = 0
