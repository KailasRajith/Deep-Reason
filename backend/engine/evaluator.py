import math
import re
from typing import Tuple, Optional
from providers.registry import provider_registry

class NodeEvaluator:
    """Evaluates candidate reasoning nodes using selected AI providers with robust heuristic fallback."""

    def __init__(self, provider_name: str = "openrouter", model: Optional[str] = None):
        self.provider_name = provider_name
        self.model = model

    async def evaluate(
        self,
        task: str,
        state: str,
        action: str
    ) -> Tuple[float, str, bool]:
        provider = provider_registry.get_provider(self.provider_name)
        if provider and provider.is_configured:
            try:
                score, feedback, is_terminal = await provider.evaluate_node(
                    task=task,
                    state=state,
                    action=action,
                    model=self.model
                )
                return score, feedback, is_terminal
            except Exception as e:
                # If provider API fails (e.g. rate limit, network timeout), fallback to heuristic
                score, feedback, is_terminal = self._heuristic_evaluation(task, state, action)
                feedback = f"[Fallback Evaluator due to: {str(e)[:80]}] {feedback}"
                return score, feedback, is_terminal

        # Provider not configured: use intelligent heuristic evaluator
        return self._heuristic_evaluation(task, state, action)

    def _heuristic_evaluation(self, task: str, state: str, action: str) -> Tuple[float, str, bool]:
        """
        Algorithmic heuristic evaluation based on logical structure, deduction markers,
        length sanity, clarity, and terminal resolution indicators.
        """
        action_clean = action.strip()
        if len(action_clean) < 15:
            return 0.2, "Candidate step is too brief and lacks substantive reasoning.", False

        score = 0.5
        reasons = []

        # Check for logical deduction connectors
        logical_markers = ["therefore", "because", "implies", "since", "consequently", "thus", "let", "given", "assume", "proves"]
        matches = [m for m in logical_markers if m in action_clean.lower()]
        if len(matches) >= 2:
            score += 0.2
            reasons.append(f"Demonstrates clear logical progression with markers ({', '.join(matches[:3])}).")

        # Check for mathematical or formal operators
        math_symbols = ["=", "+", "-", "*", "/", "<", ">", "^", "√", "∈", "∀", "∃", "∑", "∏"]
        if any(sym in action_clean for sym in math_symbols):
            score += 0.1
            reasons.append("Employs formal mathematical notation.")

        # Check for contradiction / negative qualifiers
        if "contradiction" in action_clean.lower() or "impossible" in action_clean.lower():
            score += 0.05
            reasons.append("Identifies boundary constraints or contradictions.")

        # Check for terminal keywords
        terminal_keywords = ["conclusion", "final answer", "q.e.d.", "proven", "therefore the answer is", "in summary", "hence the solution is"]
        is_terminal = any(kw in action_clean.lower() for kw in terminal_keywords)
        if is_terminal:
            score += 0.15
            reasons.append("Proposes a definitive terminal solution.")

        # Penalize excessive repetition
        if state and action_clean[:40] in state:
            score -= 0.3
            reasons.append("Redundant with previous reasoning steps.")

        # Clamp score in [0.1, 0.95]
        score = max(0.1, min(0.95, round(score, 2)))
        feedback = " ".join(reasons) if reasons else "Step provides a moderate reasoning hypothesis."
        return score, feedback, is_terminal
