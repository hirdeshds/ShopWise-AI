from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    COHERE_API_KEY: str = ""
    COHERE_MODEL: str = "command-r-plus-08-2024"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
