import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from db.database import get_db_connection
from models.session import SessionResponse, MCTSConfig
from models.node import MCTSNode
from models.council import CouncilRunState
from providers.encryption import encrypt_api_key, decrypt_api_key

class Repository:
    # ------------------ SESSIONS ------------------

    async def create_session(
        self,
        session_id: str,
        title: str,
        task: str,
        config: MCTSConfig,
        status: str = "idle"
    ) -> SessionResponse:
        now_iso = datetime.utcnow().isoformat() + "Z"
        db = await get_db_connection()
        try:
            await db.execute(
                """
                INSERT INTO sessions (id, title, task, status, config, result, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    title,
                    task,
                    status,
                    json.dumps(config.model_dump()),
                    None,
                    now_iso,
                    now_iso,
                )
            )
            await db.commit()
            return SessionResponse(
                id=session_id,
                title=title,
                task=task,
                status=status,
                config=config,
                created_at=now_iso,
                updated_at=now_iso,
                result=None,
                node_count=0
            )
        finally:
            await db.close()

    async def get_session(self, session_id: str) -> Optional[SessionResponse]:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                """
                SELECT s.id, s.title, s.task, s.status, s.config, s.result, s.created_at, s.updated_at,
                       COUNT(n.id) as node_count
                FROM sessions s
                LEFT JOIN nodes n ON s.id = n.session_id
                WHERE s.id = ?
                GROUP BY s.id
                """,
                (session_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None

            config_dict = json.loads(row["config"]) if row["config"] else {}
            result_dict = json.loads(row["result"]) if row["result"] else None

            return SessionResponse(
                id=row["id"],
                title=row["title"],
                task=row["task"],
                status=row["status"],
                config=MCTSConfig(**config_dict),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                result=result_dict,
                node_count=row["node_count"]
            )
        finally:
            await db.close()

    async def list_sessions(self, limit: int = 50, offset: int = 0) -> List[SessionResponse]:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                """
                SELECT s.id, s.title, s.task, s.status, s.config, s.result, s.created_at, s.updated_at,
                       COUNT(n.id) as node_count
                FROM sessions s
                LEFT JOIN nodes n ON s.id = n.session_id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset)
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                config_dict = json.loads(row["config"]) if row["config"] else {}
                result_dict = json.loads(row["result"]) if row["result"] else None
                results.append(SessionResponse(
                    id=row["id"],
                    title=row["title"],
                    task=row["task"],
                    status=row["status"],
                    config=MCTSConfig(**config_dict),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    result=result_dict,
                    node_count=row["node_count"]
                ))
            return results
        finally:
            await db.close()

    async def update_session(
        self,
        session_id: str,
        title: Optional[str] = None,
        task: Optional[str] = None,
        status: Optional[str] = None,
        config: Optional[MCTSConfig] = None,
        result: Optional[Dict[str, Any]] = None
    ) -> Optional[SessionResponse]:
        db = await get_db_connection()
        try:
            now_iso = datetime.utcnow().isoformat() + "Z"
            updates = ["updated_at = ?"]
            params: list = [now_iso]

            if title is not None:
                updates.append("title = ?")
                params.append(title)
            if task is not None:
                updates.append("task = ?")
                params.append(task)
            if status is not None:
                updates.append("status = ?")
                params.append(status)
            if config is not None:
                updates.append("config = ?")
                params.append(json.dumps(config.model_dump()))
            if result is not None:
                updates.append("result = ?")
                params.append(json.dumps(result))

            params.append(session_id)
            query = f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?"
            await db.execute(query, tuple(params))
            await db.commit()
        finally:
            await db.close()

        return await self.get_session(session_id)

    async def delete_session(self, session_id: str) -> bool:
        db = await get_db_connection()
        try:
            await db.execute("DELETE FROM nodes WHERE session_id = ?", (session_id,))
            cursor = await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    # ------------------ NODES ------------------

    async def upsert_node(self, node: MCTSNode):
        db = await get_db_connection()
        try:
            await db.execute(
                """
                INSERT INTO nodes (
                    id, session_id, parent_id, depth, state, action, visits,
                    value, reward, status, children, evaluator_feedback, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    visits = excluded.visits,
                    value = excluded.value,
                    reward = excluded.reward,
                    status = excluded.status,
                    children = excluded.children,
                    evaluator_feedback = excluded.evaluator_feedback
                """,
                (
                    node.id,
                    node.session_id,
                    node.parent_id,
                    node.depth,
                    node.state,
                    node.action,
                    node.visits,
                    node.value,
                    node.reward,
                    node.status,
                    json.dumps(node.children),
                    node.evaluator_feedback,
                    node.created_at
                )
            )
            await db.commit()
        finally:
            await db.close()

    async def bulk_upsert_nodes(self, nodes: List[MCTSNode]):
        if not nodes:
            return
        db = await get_db_connection()
        try:
            params = [
                (
                    n.id,
                    n.session_id,
                    n.parent_id,
                    n.depth,
                    n.state,
                    n.action,
                    n.visits,
                    n.value,
                    n.reward,
                    n.status,
                    json.dumps(n.children),
                    n.evaluator_feedback,
                    n.created_at
                )
                for n in nodes
            ]
            await db.executemany(
                """
                INSERT INTO nodes (
                    id, session_id, parent_id, depth, state, action, visits,
                    value, reward, status, children, evaluator_feedback, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    visits = excluded.visits,
                    value = excluded.value,
                    reward = excluded.reward,
                    status = excluded.status,
                    children = excluded.children,
                    evaluator_feedback = excluded.evaluator_feedback
                """,
                params
            )
            await db.commit()
        finally:
            await db.close()

    async def get_node(self, node_id: str) -> Optional[MCTSNode]:
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT * FROM nodes WHERE id = ?", (node_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            return MCTSNode(
                id=row["id"],
                session_id=row["session_id"],
                parent_id=row["parent_id"],
                depth=row["depth"],
                state=row["state"],
                action=row["action"],
                visits=row["visits"],
                value=row["value"],
                reward=row["reward"],
                status=row["status"],
                children=json.loads(row["children"]) if row["children"] else [],
                evaluator_feedback=row["evaluator_feedback"],
                created_at=row["created_at"]
            )
        finally:
            await db.close()

    async def get_nodes_by_session(self, session_id: str) -> List[MCTSNode]:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                "SELECT * FROM nodes WHERE session_id = ? ORDER BY depth ASC, visits DESC",
                (session_id,)
            )
            rows = await cursor.fetchall()
            nodes = []
            for row in rows:
                nodes.append(MCTSNode(
                    id=row["id"],
                    session_id=row["session_id"],
                    parent_id=row["parent_id"],
                    depth=row["depth"],
                    state=row["state"],
                    action=row["action"],
                    visits=row["visits"],
                    value=row["value"],
                    reward=row["reward"],
                    status=row["status"],
                    children=json.loads(row["children"]) if row["children"] else [],
                    evaluator_feedback=row["evaluator_feedback"],
                    created_at=row["created_at"]
                ))
            return nodes
        finally:
            await db.close()

    async def delete_nodes_by_session(self, session_id: str):
        db = await get_db_connection()
        try:
            await db.execute("DELETE FROM nodes WHERE session_id = ?", (session_id,))
            await db.commit()
        finally:
            await db.close()

    # ------------------ PROVIDER CONFIGS ------------------

    async def save_provider_config(
        self,
        name: str,
        provider_type: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        is_active: bool = True
    ):
        now_iso = datetime.utcnow().isoformat() + "Z"
        encrypted_key = encrypt_api_key(api_key) if api_key else None
        db = await get_db_connection()
        try:
            if encrypted_key is not None:
                await db.execute(
                    """
                    INSERT INTO provider_configs (name, type, encrypted_api_key, base_url, default_model, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET
                        type = excluded.type,
                        encrypted_api_key = excluded.encrypted_api_key,
                        base_url = excluded.base_url,
                        default_model = excluded.default_model,
                        is_active = excluded.is_active,
                        updated_at = excluded.updated_at
                    """,
                    (name, provider_type, encrypted_key, base_url, default_model, 1 if is_active else 0, now_iso)
                )
            else:
                # Keep existing encrypted_api_key if new key was not provided
                await db.execute(
                    """
                    INSERT INTO provider_configs (name, type, encrypted_api_key, base_url, default_model, is_active, updated_at)
                    VALUES (?, ?, NULL, ?, ?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET
                        type = excluded.type,
                        base_url = excluded.base_url,
                        default_model = excluded.default_model,
                        is_active = excluded.is_active,
                        updated_at = excluded.updated_at
                    """,
                    (name, provider_type, base_url, default_model, 1 if is_active else 0, now_iso)
                )
            await db.commit()
        finally:
            await db.close()

    async def load_saved_provider_configs(self):
        """Loads saved provider configs from DB and updates the runtime registry."""
        from providers.registry import provider_registry
        from providers.openai_compatible import OpenAICompatibleProvider

        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT * FROM provider_configs")
            rows = await cursor.fetchall()
            for row in rows:
                name = row["name"]
                enc_key = row["encrypted_api_key"]
                raw_key = decrypt_api_key(enc_key) if enc_key else None
                base_url = row["base_url"]
                default_model = row["default_model"]
                is_active = bool(row["is_active"])

                provider = provider_registry.get_provider(name)
                if provider:
                    if raw_key:
                        provider.api_key = raw_key
                    if base_url:
                        provider.base_url = base_url
                    if default_model:
                        provider.default_model = default_model
                    provider.is_active = is_active
                else:
                    new_p = OpenAICompatibleProvider(
                        name=name,
                        api_key=raw_key,
                        base_url=base_url or "https://api.openai.com/v1",
                        default_model=default_model or "gpt-4o",
                        is_active=is_active
                    )
                    provider_registry.register_provider(new_p)
        finally:
            await db.close()

    async def get_overview_stats(self) -> dict:
        """Computes real overview metrics across all stored sessions."""
        import json
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT status, result FROM sessions")
            rows = await cursor.fetchall()
            total_sessions = len(rows)
            completed_sessions = sum(1 for r in rows if r["status"] == "completed")
            running_sessions = sum(1 for r in rows if r["status"] == "running")

            total_duration = 0.0
            total_tokens = 0
            total_iterations = 0
            measured_durations = 0

            for r in rows:
                if r["result"]:
                    try:
                        res = json.loads(r["result"])
                        dur = res.get("duration_seconds", 0)
                        if dur:
                            total_duration += float(dur)
                            measured_durations += 1
                        total_tokens += int(res.get("total_tokens_used", 0))
                        total_iterations += int(res.get("total_iterations", 0))
                    except Exception:
                        pass

            avg_duration = (total_duration / measured_durations) if measured_durations > 0 else 0.0
            avg_tokens = (total_tokens // total_sessions) if total_sessions > 0 else 0
            avg_iterations = (total_iterations / total_sessions) if total_sessions > 0 else 0.0
            success_rate = (completed_sessions / total_sessions) if total_sessions > 0 else 0.0

            return {
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "running_sessions": running_sessions,
                "avg_duration_seconds": round(avg_duration, 1),
                "avg_iterations": round(avg_iterations, 1),
                "avg_tokens": avg_tokens,
                "total_tokens": total_tokens,
                "success_rate": round(success_rate, 2)
            }
        finally:
            await db.close()

    # ------------------ COUNCIL RUNS ------------------

    async def upsert_council_run(self, run: CouncilRunState) -> None:
        db = await get_db_connection()
        try:
            now_iso = datetime.utcnow().isoformat() + "Z"
            data_json = json.dumps(run.model_dump())
            await db.execute(
                """
                INSERT INTO council_runs (id, session_id, title, task, mode, status, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    status=excluded.status,
                    data=excluded.data,
                    updated_at=excluded.updated_at
                """,
                (
                    run.run_id,
                    run.session_id,
                    run.title,
                    run.task,
                    run.mode,
                    run.status,
                    data_json,
                    run.created_at or now_iso,
                    run.updated_at or now_iso
                )
            )
            await db.commit()
        finally:
            await db.close()

    async def get_council_run(self, run_id: str) -> Optional[CouncilRunState]:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                "SELECT data FROM council_runs WHERE id = ?",
                (run_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            data = json.loads(row["data"])
            return CouncilRunState(**data)
        finally:
            await db.close()

    async def list_council_runs(self, limit: int = 50) -> List[CouncilRunState]:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                "SELECT data FROM council_runs ORDER BY created_at DESC LIMIT ?",
                (limit,)
            )
            rows = await cursor.fetchall()
            results: List[CouncilRunState] = []
            for r in rows:
                try:
                    data = json.loads(r["data"])
                    results.append(CouncilRunState(**data))
                except Exception:
                    pass
            return results
        finally:
            await db.close()

    async def delete_council_run(self, run_id: str) -> bool:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                "DELETE FROM council_runs WHERE id = ?",
                (run_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

repository = Repository()
