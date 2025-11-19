from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database - Use SQLite for development if PostgreSQL not available
    DATABASE_URL: str = "sqlite:///./mock_interview.db"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Gemini
    GEMINI_API_KEY: str = ""
    
    # Judge0
    JUDGE0_API_URL: str = "https://judge0-ce.p.rapidapi.com"
    JUDGE0_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

