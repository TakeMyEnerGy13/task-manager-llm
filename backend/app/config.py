from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./tasks.db"
    anthropic_api_key: str = ""
    llm_model: str = "claude-haiku-4-5-20251001"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
