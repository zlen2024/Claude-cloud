from fastapi import BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .domain.enums import Permission
from .domain.models import Staff
from .services.auth import AuthService, Forbidden, SessionSigner
from .services.notifiers import Dispatcher, NotificationCenter, build_notifiers
from .services.services import (CampaignService, CustomerService, NotificationService, OrderService,
                                ReportService, StaffService)

SESSION_COOKIE = "of_session"
signer = SessionSigner(settings.secret_key, settings.session_hours * 3600)
notification_center = NotificationCenter(settings.base_url, settings.business_name)
dispatcher = Dispatcher(build_notifiers(settings), settings.business_name)


def auth(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db, signer)


def current_staff(request: Request, svc: AuthService = Depends(auth)) -> Staff:
    return svc.staff_for(request.cookies.get(SESSION_COOKIE))


def require(permission: Permission):
    def check(staff: Staff = Depends(current_staff)) -> Staff:
        if not staff.can(permission):
            raise Forbidden("Anda tiada akses untuk tindakan ini")
        return staff
    return check


def deliver_later(background: BackgroundTasks, db: Session = Depends(get_db)):
    """Returns a callable that schedules outbox delivery after the response is sent."""
    return lambda: background.add_task(dispatcher.flush, db)


def orders(db: Session = Depends(get_db)) -> OrderService:
    return OrderService(db, notification_center)


def customers(db: Session = Depends(get_db)) -> CustomerService:
    return CustomerService(db)


def campaigns(db: Session = Depends(get_db)) -> CampaignService:
    return CampaignService(db, notification_center, CustomerService(db))


def staff(db: Session = Depends(get_db)) -> StaffService:
    return StaffService(db)


def notifications(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


def reports(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(db)
