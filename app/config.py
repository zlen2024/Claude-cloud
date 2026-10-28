"""Settings from environment variables. Unset gateway credentials = messages are simulated."""
import os
import secrets
from dataclasses import dataclass, field


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass(frozen=True)
class Settings:
    database_url: str = field(default_factory=lambda: _env("DATABASE_URL", "sqlite:///./orderflow.db"))
    # Sessions are signed with this; set it in production or everyone is logged out on restart.
    secret_key: str = field(default_factory=lambda: _env("SECRET_KEY") or secrets.token_urlsafe(32))
    session_hours: int = field(default_factory=lambda: int(_env("SESSION_HOURS", "12")))
    base_url: str = field(default_factory=lambda: _env("BASE_URL", "http://localhost:8000").rstrip("/"))
    business_name: str = field(default_factory=lambda: _env("BUSINESS_NAME", "OrderFlow"))
    demo: bool = field(default_factory=lambda: _env("DEMO", "1") == "1")
    secure_cookies: bool = field(default_factory=lambda: _env("SECURE_COOKIES", "0") == "1")

    whatsapp_token: str = field(default_factory=lambda: _env("WHATSAPP_TOKEN"))
    whatsapp_phone_id: str = field(default_factory=lambda: _env("WHATSAPP_PHONE_ID"))

    smtp_host: str = field(default_factory=lambda: _env("SMTP_HOST"))
    smtp_port: int = field(default_factory=lambda: int(_env("SMTP_PORT", "587")))
    smtp_user: str = field(default_factory=lambda: _env("SMTP_USER"))
    smtp_password: str = field(default_factory=lambda: _env("SMTP_PASSWORD"))
    smtp_from: str = field(default_factory=lambda: _env("SMTP_FROM"))

    twilio_sid: str = field(default_factory=lambda: _env("TWILIO_ACCOUNT_SID"))
    twilio_token: str = field(default_factory=lambda: _env("TWILIO_AUTH_TOKEN"))
    twilio_from: str = field(default_factory=lambda: _env("TWILIO_FROM"))


settings = Settings()
