from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./screening.db"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    MAX_QUESTIONS_PER_SESSION: int = 8

    class Config:
        env_file = ".env"


settings = Settings()
