"""
Core configuration module for the Freshify application.

This module handles loading settings from environment variables and dotenv (.env) files
using Pydantic Settings. It validates critical configuration parameters such as the
application secret key.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and fallback default values.
    Uses pydantic-settings to validate types and presence of required environment variables.
    """
    
    # PostgreSQL database connection URL (default is local container port mapping)
    database_url: str = "postgresql://freshify_user:secretpassword@localhost:5435/freshify_db"
    
    # API key for the Gemini model integration (google.genai SDK)
    gemini_api_key: str = ""
    
    # Secret key used for JWT signing and verification. MUST be set in environment/.env.
    secret_key: str
    
    # Algorithm used to sign the JWT access tokens
    algorithm: str = "HS256"
    
    # Default expiration period for access tokens in minutes (10080 minutes = 7 days)
    access_token_expire_minutes: int = 10080  # 7 days
    
    # Mailtrap SMTP server username for development emails
    mailtrap_username: str = ""
    
    # Mailtrap SMTP server password for development emails
    mailtrap_password: str = ""
    
    # Mailtrap SMTP host
    mailtrap_host: str = "sandbox.smtp.mailtrap.io"
    
    # Mailtrap SMTP port
    mailtrap_port: int = 2525
    
    # URL of the default charity organization for donation suggestions
    charity_url: str = "https://savelife.in.ua"
    
    # Name of the default charity organization for donation suggestions
    charity_name: str = "Повернись живим"
    
    # Expo public API URL for push notifications or mobile integration
    expo_public_api_url: str = ""
    
    # Default server timezone for date calculations (IANA timezone name)
    server_timezone: str = "Europe/Kyiv"

    @field_validator("secret_key")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        """
        Validator to ensure that a secure and non-empty SECRET_KEY is set.
        
        Args:
            v (str): The provided secret key.
            
        Returns:
            str: The validated secret key.
            
        Raises:
            ValueError: If the key is empty or shorter than 32 characters.
        """
        # Ensure the secret key is provided and meets the minimum length requirement for security
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v

    class Config:
        # Relative path to the environment file
        env_file = "../.env"
        # Ignore extra variables not explicitly defined in the Settings class
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Retrieve cached Settings instance using lru_cache.
    This avoids re-reading configuration files and instantiating the class multiple times.
    
    Returns:
        Settings: The singleton application settings instance.
    """
    return Settings()
