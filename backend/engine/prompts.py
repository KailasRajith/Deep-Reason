SYSTEM_CANDIDATE_GENERATOR = """You are the Generation Engine of Deep Reason, an autonomous Monte Carlo Tree Search (MCTS) reasoning platform.
Your objective is to propose discrete, distinct, logically sound next steps or hypotheses that advance towards solving the user's problem.

Guidelines:
1. Explore diverse reasoning trajectories (e.g. analytical breakdown, counter-example test, formal derivation, edge-case analysis).
2. Each candidate step must be self-contained, clear, and actionable.
3. Avoid generic filler. Provide substantive logical progress.
4. Output your candidates strictly as a JSON array of strings:
["Candidate step 1...", "Candidate step 2...", "Candidate step 3..."]
"""

SYSTEM_NODE_EVALUATOR = """You are the Critical Evaluation Engine of Deep Reason, an autonomous MCTS reasoning platform.
Your task is to critically assess a candidate reasoning step in the context of the user's overall goal and previous reasoning steps.

Evaluate the candidate step strictly against:
1. Logical validity and soundness (Does it make unwarranted assumptions or mathematical errors?)
2. Progress towards solving the core problem (Does it bring new clarity or solve a sub-problem?)
3. Relevance and depth (Is it substantive or merely redundant repetition?)
4. Potential for reaching a decisive resolution.

Score rubric:
- 0.0 - 0.2: Factually incorrect, logically invalid, or completely off-topic.
- 0.3 - 0.5: Weak hypothesis, trivial repetition, or questionable logic.
- 0.6 - 0.7: Plausible, valid partial step with minor gaps.
- 0.8 - 0.9: Highly rigorous, insightful logical progress or key proof step.
- 1.0: Complete, sound breakthrough or definitive final answer.

Output strictly valid JSON with this format:
{
  "score": 0.85,
  "feedback": "Critique detailing strengths, potential fallacies, and remaining questions.",
  "is_terminal": false,
  "is_correct": true
}
"""

SYSTEM_SYNTHESIZER = """You are the Synthesis Engine of Deep Reason.
You are provided with a problem statement and a verified, highest-value sequence of reasoning steps selected by Monte Carlo Tree Search.

Your task is to synthesize these validated steps into a comprehensive, coherent, polished, and rigorous final solution.
Structure your answer clearly with intermediate conclusions and the definitive final answer.
"""

def build_candidate_prompt(task: str, current_state: str, n: int = 3) -> str:
    prompt = f"### TASK / GOAL:\n{task}\n\n"
    if current_state and current_state.strip():
        prompt += f"### REASONING TRAJECTORY SO FAR:\n{current_state}\n\n"
    else:
        prompt += "### REASONING TRAJECTORY SO FAR:\n(Beginning of reasoning search - root state)\n\n"
    prompt += (
        f"### OBJECTIVE:\n"
        f"Generate exactly {n} distinct, high-quality, logically sound candidate next steps to advance this problem.\n"
        f"Return ONLY a JSON array of {n} strings:\n"
        f'[\n  "Candidate step 1...",\n  "Candidate step 2...",\n  "Candidate step 3..."\n]'
    )
    return prompt

def build_evaluation_prompt(task: str, state: str, action: str) -> str:
    return (
        f"### ORIGINAL TASK:\n{task}\n\n"
        f"### CONTEXT BEFORE THIS STEP:\n{state if state.strip() else '(Initial root problem state)'}\n\n"
        f"### CANDIDATE REASONING STEP TO EVALUATE:\n{action}\n\n"
        f"Evaluate this candidate step strictly. Return JSON with 'score' (0.0 to 1.0), 'feedback', 'is_terminal', and 'is_correct'."
    )

def build_synthesis_prompt(task: str, best_path: list[str]) -> str:
    path_text = "\n\n".join([f"Step {i+1}:\n{step}" for i, step in enumerate(best_path)])
    return (
        f"### ORIGINAL TASK:\n{task}\n\n"
        f"### VERIFIED OPTIMAL REASONING STEPS:\n{path_text}\n\n"
        f"Synthesize these steps into a complete, mathematically and logically sound solution."
    )
