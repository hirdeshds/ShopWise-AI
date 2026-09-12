from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    TAVILY_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "groq/compound"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
