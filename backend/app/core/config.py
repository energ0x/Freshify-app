from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://freshify_user:secretpassword@localhost:5435/freshify_db"
    gemini_api_key: str = ""
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    mailtrap_username: str = ""
    mailtrap_password: str = ""
    mailtrap_host: str = "sandbox.smtp.mailtrap.io"
    mailtrap_port: int = 2525
    charity_url: str = "https://savelife.in.ua"
    charity_name: str = "Повернись живим"
    expo_public_api_url: str = ""
    server_timezone: str = "Europe/Kyiv"  # Default server timezone for date calculations (IANA name)

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    class Config:
        env_file = "../.env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
