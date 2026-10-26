import os
from pathlib import Path
import aiosqlite
from config import BASE_DIR, settings

_raw_path = Path(settings.DB_PATH)
DB_FILE = _raw_path if _raw_path.is_absolute() else (BASE_DIR / _raw_path)

async def get_db_connection() -> aiosqlite.Connection:
    """Open an async SQLite connection with WAL mode and foreign keys enabled."""
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(str(DB_FILE))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON;")
    await db.execute("PRAGMA journal_mode = WAL;")
    await db.execute("PRAGMA synchronous = NORMAL;")
    return db

async def init_db():
    """Initialize database tables from schema.sql."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    db = await get_db_connection()
    try:
        await db.executescript(schema_sql)
        await db.commit()
    finally:
        await db.close()
