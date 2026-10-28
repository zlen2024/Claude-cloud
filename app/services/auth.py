"""Staff sign-in with HMAC-signed session cookies (stdlib only)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..domain.errors import DomainError
from ..domain.models import Staff


class Unauthorized(DomainError):
    status_code = 401


class Forbidden(DomainError):
    status_code = 403


class SessionSigner:
    def __init__(self, secret: str, max_age_s: int):
        self.key, self.max_age = secret.encode(), max_age_s

    def _sig(self, payload: str) -> str:
        return base64.urlsafe_b64encode(hmac.new(self.key, payload.encode(), hashlib.sha256).digest()).decode().rstrip("=")

    def issue(self, staff_id: int, now: float | None = None) -> str:
        payload = f"{staff_id}.{int((now or time.time()) + self.max_age)}"
        return f"{payload}.{self._sig(payload)}"

    def verify(self, token: str, now: float | None = None) -> int | None:
        try:
            staff_id, exp, sig = token.split(".")
        except (ValueError, AttributeError):
            return None
        if not hmac.compare_digest(sig, self._sig(f"{staff_id}.{exp}")) or int(exp) < (now or time.time()):
            return None
        return int(staff_id)


class AuthService:
    def __init__(self, db: Session, signer: SessionSigner):
        self.db, self.signer = db, signer

    def login(self, username: str, password: str) -> tuple[Staff, str]:
        staff = self.db.scalar(select(Staff).where(Staff.username == username.strip().lower()))
        if not staff or not staff.check_password(password):
            raise Unauthorized("Username atau password salah")
        return staff, self.signer.issue(staff.id)

    def staff_for(self, token: str | None) -> Staff:
        staff_id = self.signer.verify(token or "")
        staff = self.db.get(Staff, staff_id) if staff_id else None
        if not staff or not staff.active:
            raise Unauthorized("Sila log masuk")
        return staff
