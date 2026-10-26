import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # Secret key for server-side API key encryption
    SECRET_KEY: str = "deep-reason-super-secure-internal-master-key-32b"
    
    # SQLite Database File
    DB_PATH: str = str(BASE_DIR / "deep_reason.db")
    
    # Default Provider Keys (optional, can be passed in .env or via API)
    OPENROUTER_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    
    # Default MCTS Hyperparameters
    DEFAULT_EXPLORATION_CONSTANT: float = 1.41421356  # sqrt(2)
    DEFAULT_MAX_DEPTH: int = 8
    DEFAULT_MAX_ITERATIONS: int = 25
    DEFAULT_BRANCHING_FACTOR: int = 3
    DEFAULT_PRUNE_THRESHOLD: float = 0.25
    DEFAULT_TEMPERATURE: float = 0.7
    
    # Default Reasoning Model Providers
    DEFAULT_GENERATOR_PROVIDER: str = "openrouter"
    DEFAULT_GENERATOR_MODEL: str = "deepseek/deepseek-r1"
    DEFAULT_EVALUATOR_PROVIDER: str = "openrouter"
    DEFAULT_EVALUATOR_MODEL: str = "deepseek/deepseek-r1"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
