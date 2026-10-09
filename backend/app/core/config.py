from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_JWT_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    app_name: str = "Fire Hazardous Vegetation Portal API"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+psycopg://fhv:fhv_dev_pw@localhost:5432/fire_hazard_veg"
    test_database_url: str = (
        "postgresql+psycopg://fhv:fhv_dev_pw@localhost:5432/fire_hazard_veg_test"
    )
    db_echo: bool = False

    # auth - access token is a JWT stored in an HttpOnly cookie
    jwt_secret_key: str = DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    auth_cookie_name: str = "fhv_access_token"
    auth_cookie_secure: bool = False  # True in production (HTTPS only)
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # browser origins allowed to call the API with cookies (JSON list in .env)
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def check_production_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.jwt_secret_key == DEV_JWT_SECRET or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY must be set to a 32+ char secret in production")
            if not self.auth_cookie_secure:
                raise ValueError("AUTH_COOKIE_SECURE must be true in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
