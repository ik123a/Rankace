"""Rankace backend settings."""
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore", hide_input_in_errors=True)

    app_name: str = "Rankace"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./data/rankace.db"
    jwt_secret: str = Field(min_length=32, repr=False)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080
    # Dev origins for both loopback spellings and the ports this project is
    # actually served on. `localhost` and `127.0.0.1` are DIFFERENT origins to
    # a browser, so listing one does not permit the other -- an app reached at
    # 127.0.0.1:3100 while this lists only localhost:3000 gets every /api call
    # blocked by CORS while the backend is perfectly healthy. Override in
    # .env for a real deployment.
    cors_origins: str = (
        "http://localhost:3000,http://localhost:3100,"
        "http://127.0.0.1:3000,http://127.0.0.1:3100"
    )


    crawl_max_pages: int = 50
    crawl_max_depth: int = 3
    crawl_timeout_seconds: int = 15
    crawl_user_agent: str = "RankaceBot/1.0 (+https://rankace.local/bot)"
    crawl_delay_seconds: float = 0.5

    enable_ml: bool = True

    demo_enabled: bool = False
    demo_email: str = "demo@rankace.local"
    demo_password: str = Field(default="", repr=False)

    @model_validator(mode="after")
    def validate_credentials(self):
        if self.jwt_secret == "change-me-to-a-long-random-string" or len(self.jwt_secret.strip()) < 32:
            raise ValueError("Set JWT_SECRET to a generated secret at least 32 characters long")
        if self.demo_enabled and (
            len(self.demo_password.strip()) < 12 or len(self.demo_password.encode("utf-8")) > 72
        ):
            raise ValueError("Set DEMO_PASSWORD to at least 12 characters and at most 72 UTF-8 bytes")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
