import os
import sys
import uvicorn
from config import settings

def main():
    print("=" * 60)
    print("Deep Reason - Autonomous Multi-Model AI Reasoning Server")
    print(f"Host: {settings.HOST}:{settings.PORT}")
    print(f"Database: {settings.DB_PATH}")
    print(f"Default Provider: {settings.DEFAULT_GENERATOR_PROVIDER} ({settings.DEFAULT_GENERATOR_MODEL})")
    print("=" * 60)
    
    uvicorn.run(
        "server:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()
