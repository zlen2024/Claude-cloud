from fastapi import Depends
from sqlalchemy.orm import Session

from .db import get_db
from .services.notifiers import NotificationCenter
from .services.services import (CampaignService, CustomerService, NotificationService, OrderService,
                                ReportService, StaffService)

notification_center = NotificationCenter()


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
