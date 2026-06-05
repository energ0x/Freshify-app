from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://freshify_user:secretpassword@localhost:5432/freshify_db"
    gemini_api_key: str = ""
    secret_key: str = "changeme-secret-key-for-dev"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    mailtrap_username: str = ""
    mailtrap_password: str = ""
    mailtrap_host: str = "sandbox.smtp.mailtrap.io"
    mailtrap_port: int = 2525
    charity_url: str = "https://savelife.in.ua"
    charity_name: str = "Повернись живим"
    expo_public_api_url: str = " "

    class Config:
        env_file = "../.env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()