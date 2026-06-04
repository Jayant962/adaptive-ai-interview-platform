from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = ""

    # Groq
    GROQ_API_KEY: str = ""

    # Clerk
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_WEBHOOK_SECRET: str = ""

    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # SMTP (Email)
    SMTP_HOST: str = "mock"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "mock"
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@ai-interviewer.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_allowed_origins(self) -> list[str]:
        origins = []
        for origin in self.ALLOWED_ORIGINS.split(","):
            clean = origin.strip()
            if clean.endswith("/"):
                clean = clean[:-1]
            origins.append(clean)
        return origins


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
