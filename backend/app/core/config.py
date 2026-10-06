"""Rankace backend settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Rankace"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./data/rankace.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-to-a-long-random-string"
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
    crawl_respect_robots: bool = True
    crawl_delay_seconds: float = 0.5

    enable_ml: bool = True

    demo_email: str = "demo@rankace.local"
    demo_password: str = "demo1234"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
