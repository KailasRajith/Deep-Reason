-- Deep Reason SQLite Database Schema

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL,
    config TEXT NOT NULL,
    result TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_id TEXT,
    depth INTEGER NOT NULL,
    state TEXT NOT NULL,
    action TEXT NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0,
    value REAL NOT NULL DEFAULT 0.0,
    reward REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL,
    children TEXT NOT NULL,
    evaluator_feedback TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nodes_session_id ON nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_nodes_parent_id ON nodes(parent_id);

CREATE TABLE IF NOT EXISTS provider_configs (
    name TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    encrypted_api_key TEXT,
    base_url TEXT,
    default_model TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS council_runs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    title TEXT NOT NULL,
    task TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_council_runs_session_id ON council_runs(session_id);
