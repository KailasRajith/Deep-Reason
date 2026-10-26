import math
import uuid
import time
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Callable, Awaitable, Any

from models.node import MCTSNode
from models.session import MCTSConfig
from models.events import ReasoningEvent, EventType
from providers.registry import provider_registry
from engine.evaluator import NodeEvaluator
from engine.prompts import build_candidate_prompt
from db.repository import repository

class MCTSEngine:
    def __init__(
        self,
        session_id: str,
        task: str,
        config: MCTSConfig,
        event_callback: Optional[Callable[[ReasoningEvent], Awaitable[None]]] = None
    ):
        self.session_id = session_id
        self.task = task
        self.config = config
        self.event_callback = event_callback

        self.nodes: Dict[str, MCTSNode] = {}
        self.root_id: str = f"node_{uuid.uuid4().hex[:12]}"
        self.current_iteration: int = 0
        self.is_running: bool = False
        self.is_paused: bool = False
        self.is_stopped: bool = False

        self.evaluator = NodeEvaluator(
            provider_name=self.config.evaluator_provider,
            model=self.config.evaluator_model
        )

    async def emit_event(self, event_type: EventType, data: Dict[str, Any]):
        """Emit real-time WebSocket event and trigger callback."""
        event = ReasoningEvent(
            type=event_type,
            session_id=self.session_id,
            data=data
        )
        if self.event_callback:
            try:
                await self.event_callback(event)
            except Exception as e:
                # Do not let client disconnect crash the engine
                pass

    async def initialize(self):
        """Initialize the root node and persist to database."""
        now_iso = datetime.utcnow().isoformat() + "Z"
        root_node = MCTSNode(
            id=self.root_id,
            parent_id=None,
            session_id=self.session_id,
            depth=0,
            state=f"Problem Statement: {self.task}",
            action="Initial Problem Definition",
            visits=0,
            value=0.0,
            reward=0.0,
            status="active",
            children=[],
            evaluator_feedback="Root node initialized.",
            created_at=now_iso
        )
        self.nodes[self.root_id] = root_node
        await repository.upsert_node(root_node)
        await self.emit_event("session_started", {
            "session_id": self.session_id,
            "root_id": self.root_id,
            "task": self.task,
            "config": self.config.model_dump()
        })

    def _calculate_uct(self, parent: MCTSNode, child: MCTSNode) -> float:
        """
        Upper Confidence Bound applied to Trees:
        UCT(s,a) = Q(s,a) + c * sqrt(ln(N(s) + 1) / (N(s,a) + epsilon))
        """
        if child.visits == 0:
            return float("inf")
        c = self.config.exploration_constant
        q_value = child.q_value
        exploration = c * math.sqrt(math.log(parent.visits + 1) / child.visits)
        return q_value + exploration

    def _select_child(self, parent: MCTSNode) -> Optional[MCTSNode]:
        """Select child node with highest UCT score among active/unpruned children."""
        valid_children = [
            self.nodes[cid] for cid in parent.children
            if cid in self.nodes and self.nodes[cid].status != "pruned"
        ]
        if not valid_children:
            return None

        # Prioritize completely unvisited nodes
        unvisited = [c for c in valid_children if c.visits == 0]
        if unvisited:
            return unvisited[0]

        best_score = -float("inf")
        best_child = None
        for child in valid_children:
            uct = self._calculate_uct(parent, child)
            if uct > best_score:
                best_score = uct
                best_child = child
        return best_child

    async def selection(self) -> MCTSNode:
        """
        Tree Policy: Traverse down the tree selecting the highest UCT child
        until reaching an expandable or leaf node.
        """
        current = self.nodes[self.root_id]
        while current.children and current.status != "terminal" and current.status != "pruned":
            # If current node has children that are not yet expanded or visited, pick one
            next_node = self._select_child(current)
            if not next_node or next_node.id == current.id:
                break
            current = next_node
            if current.status == "unvisited" or not current.children:
                break

        await self.emit_event("node_selected", {
            "node_id": current.id,
            "depth": current.depth,
            "visits": current.visits,
            "q_value": round(current.q_value, 4),
            "action": current.action
        })
        return current

    async def expansion(self, node: MCTSNode) -> List[MCTSNode]:
        """
        Expand a node by generating candidate reasoning steps using the AI Generator.
        """
        if node.status == "terminal" or node.depth >= self.config.max_depth:
            return []

        branching_factor = self.config.branching_factor
        provider = provider_registry.get_provider(self.config.generator_provider)

        prompt = build_candidate_prompt(self.task, node.state, n=branching_factor)
        candidates: List[str] = []

        if provider and provider.is_configured:
            try:
                candidates = await provider.generate_candidates(
                    prompt=prompt,
                    n=branching_factor,
                    temperature=self.config.temperature,
                    model=self.config.generator_model
                )
            except Exception as e:
                candidates = self._generate_heuristic_candidates(node, branching_factor)
        else:
            candidates = self._generate_heuristic_candidates(node, branching_factor)

        new_children: List[MCTSNode] = []
        now_iso = datetime.utcnow().isoformat() + "Z"

        for cand in candidates:
            child_id = f"node_{uuid.uuid4().hex[:12]}"
            next_state = f"{node.state}\n- {cand}" if node.state else cand
            child_node = MCTSNode(
                id=child_id,
                parent_id=node.id,
                session_id=self.session_id,
                depth=node.depth + 1,
                state=next_state,
                action=cand,
                visits=0,
                value=0.0,
                reward=0.0,
                status="unvisited",
                children=[],
                evaluator_feedback=None,
                created_at=now_iso
            )
            self.nodes[child_id] = child_node
            node.children.append(child_id)
            new_children.append(child_node)

            await self.emit_event("candidate_generated", {
                "candidate_id": child_id,
                "parent_id": node.id,
                "action": cand,
                "depth": child_node.depth
            })

        node.status = "expanded"
        await self.emit_event("node_expanded", {
            "node_id": node.id,
            "children_ids": [c.id for c in new_children],
            "depth": node.depth
        })

        return new_children

    def _generate_heuristic_candidates(self, node: MCTSNode, n: int) -> List[str]:
        """Fallback candidate generator when provider API key is not configured."""
        depth = node.depth
        templates = [
            f"Step {depth+1}.A: Break down problem statement into foundational mathematical axioms and constraints.",
            f"Step {depth+1}.B: Analyze boundary conditions and test counter-examples against initial hypothesis.",
            f"Step {depth+1}.C: Derive direct logical deduction leading toward concluding synthesis.",
            f"Step {depth+1}.D: Perform proof-by-contradiction assuming opposing premise.",
            f"Step {depth+1}.E: Verify intermediate conclusions and finalize complete solution."
        ]
        return templates[:n]

    async def simulation(self, node: MCTSNode) -> float:
        """
        Simulate / Evaluate the candidate node using the AI Evaluator.
        """
        score, feedback, is_terminal = await self.evaluator.evaluate(
            task=self.task,
            state=node.state,
            action=node.action
        )
        node.reward = score
        node.evaluator_feedback = feedback
        if is_terminal:
            node.status = "terminal"
        else:
            node.status = "active"

        await self.emit_event("candidate_evaluated", {
            "node_id": node.id,
            "score": round(score, 4),
            "feedback": feedback,
            "is_terminal": is_terminal
        })

        await self.emit_event("simulation_completed", {
            "node_id": node.id,
            "reward": round(score, 4),
            "is_terminal": is_terminal
        })

        return score

    async def backpropagation(self, node: MCTSNode, reward: float):
        """
        Traverse up the tree propagating reward and incrementing visit counts.
        """
        curr: Optional[MCTSNode] = node
        while curr is not None:
            curr.visits += 1
            curr.value += reward
            await self.emit_event("reward_propagated", {
                "node_id": curr.id,
                "visits": curr.visits,
                "value": round(curr.value, 4),
                "q_value": round(curr.q_value, 4)
            })
            if curr.parent_id and curr.parent_id in self.nodes:
                curr = self.nodes[curr.parent_id]
            else:
                curr = None

    async def prune_branches(self):
        """
        Prune low-value branches whose Q-value falls below the configured threshold
        after accumulating exploratory visits. Guarantees that at least the top child
        is preserved.
        """
        for parent_id, parent in self.nodes.items():
            if not parent.children:
                continue
            candidates_to_prune = []
            for cid in parent.children:
                if cid not in self.nodes:
                    continue
                node = self.nodes[cid]
                if node.status in ("pruned", "terminal"):
                    continue
                if node.visits >= 2 and node.q_value < self.config.prune_threshold:
                    candidates_to_prune.append(node)

            # Preserve at least one highest-performing child from being pruned
            if len(candidates_to_prune) >= len(parent.children):
                candidates_to_prune.sort(key=lambda n: (n.q_value, n.visits))
                candidates_to_prune = candidates_to_prune[:-1]

            for node in candidates_to_prune:
                node.status = "pruned"
                await self.emit_event("branch_pruned", {
                    "node_id": node.id,
                    "parent_id": node.parent_id,
                    "visits": node.visits,
                    "q_value": round(node.q_value, 4),
                    "threshold": self.config.prune_threshold
                })

    async def step(self) -> Dict[str, Any]:
        """
        Execute exactly ONE full MCTS iteration step:
        Selection -> Expansion -> Evaluation -> Backpropagation -> Pruning -> Save
        """
        self.current_iteration += 1
        iter_num = self.current_iteration

        await self.emit_event("iteration_started", {
            "iteration": iter_num,
            "max_iterations": self.config.max_iterations,
            "total_nodes": len(self.nodes)
        })

        # 1. Selection
        selected = await self.selection()

        # 2. Expansion
        children: List[MCTSNode] = []
        if selected.status != "terminal" and selected.depth < self.config.max_depth:
            if not selected.children:
                children = await self.expansion(selected)
            else:
                # If already expanded, find unvisited child
                children = [self.nodes[cid] for cid in selected.children if cid in self.nodes]

        # 3. Simulation / Evaluation
        target_node = children[0] if children else selected
        reward = await self.simulation(target_node)

        # 4. Backpropagation
        await self.backpropagation(target_node, reward)

        # 5. Pruning
        await self.prune_branches()

        # 6. Persist nodes to SQLite in batch
        all_nodes_list = list(self.nodes.values())
        await repository.bulk_upsert_nodes(all_nodes_list)

        step_result = {
            "iteration": iter_num,
            "selected_node_id": selected.id,
            "evaluated_node_id": target_node.id,
            "reward": round(reward, 4),
            "total_nodes": len(self.nodes),
            "is_terminal": target_node.status == "terminal"
        }

        await self.emit_event("iteration_completed", step_result)
        return step_result

    def get_best_path(self) -> List[MCTSNode]:
        """
        Extract the best reasoning path from root to leaf by maximizing visit count (N)
        and average reward (Q).
        """
        path: List[MCTSNode] = []
        curr = self.nodes.get(self.root_id)
        if not curr:
            return path

        path.append(curr)
        while curr and curr.children:
            valid_children = [
                self.nodes[cid] for cid in curr.children
                if cid in self.nodes and self.nodes[cid].status != "pruned"
            ]
            if not valid_children:
                valid_children = [self.nodes[cid] for cid in curr.children if cid in self.nodes]
            if not valid_children:
                break
            # Standard MCTS selection for final policy: most visited child
            best_child = max(valid_children, key=lambda c: (c.visits, c.q_value))
            path.append(best_child)
            curr = best_child
            if curr.status == "terminal":
                break

        # Mark nodes on best path
        for pnode in path:
            if pnode.status != "terminal":
                pnode.status = "best_path"

        return path

    async def synthesize_final_solution(self, best_path: List[MCTSNode]) -> str:
        """Synthesize the final answer from the optimal path actions."""
        actions = [p.action for p in best_path if p.id != self.root_id]
        if not actions:
            return "No valid reasoning steps were established."

        provider = provider_registry.get_provider(self.config.evaluator_provider)
        if provider and provider.is_configured:
            try:
                return await provider.synthesize_solution(
                    task=self.task,
                    best_path_actions=actions,
                    model=self.config.evaluator_model
                )
            except Exception as e:
                pass

        # Offline fallback synthesis
        sol = f"### Synthesized Reasoning Solution\n\n**Problem:** {self.task}\n\n**Logical Derivation Trajectory:**\n"
        for i, step in enumerate(actions, 1):
            sol += f"\n{i}. {step}"
        sol += "\n\n**Final Conclusion:**\nThe reasoning search trajectory completed with high confidence."
        return sol

    async def run(self) -> Dict[str, Any]:
        """
        Run the MCTS search until max_iterations, terminal condition, or pause/stop.
        """
        self.is_running = True
        self.is_paused = False
        self.is_stopped = False
        start_time = time.time()

        try:
            while self.current_iteration < self.config.max_iterations and not self.is_stopped:
                if self.is_paused:
                    await asyncio.sleep(0.5)
                    continue

                step_res = await self.step()
                if step_res.get("is_terminal"):
                    break

                # Brief yield to permit event loop processing
                await asyncio.sleep(0.01)

            # Execution completed
            best_path = self.get_best_path()
            solution_text = await self.synthesize_final_solution(best_path)
            exec_time = round(time.time() - start_time, 2)

            best_node = best_path[-1] if best_path else self.nodes[self.root_id]
            final_result = {
                "best_node_id": best_node.id,
                "best_path": [p.id for p in best_path],
                "best_path_actions": [p.action for p in best_path],
                "best_reward": round(best_node.q_value, 4),
                "solution": solution_text,
                "total_iterations": self.current_iteration,
                "total_nodes": len(self.nodes),
                "execution_time_seconds": exec_time
            }

            # Update session status in SQLite
            status = "completed" if not self.is_stopped else "stopped"
            await repository.update_session(
                session_id=self.session_id,
                status=status,
                result=final_result
            )
            await repository.bulk_upsert_nodes(list(self.nodes.values()))

            await self.emit_event("search_completed", final_result)
            return final_result

        except Exception as e:
            await self.emit_event("error", {
                "message": str(e),
                "iteration": self.current_iteration
            })
            await repository.update_session(
                session_id=self.session_id,
                status="failed"
            )
            raise
        finally:
            self.is_running = False

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def stop(self):
        self.is_stopped = True
        self.is_running = False
