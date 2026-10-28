"""Application services: load entities, call their behaviour, persist, fire notifications."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..domain.enums import Channel, Department, OrderStatus, TaskState
from ..domain.errors import NotFound
from ..domain.models import (Campaign, Customer, Notification, Order, SegmentPolicy, Staff, Tag)
from .notifiers import NotificationCenter


class Repository:
    model: type

    def __init__(self, db: Session):
        self.db = db

    def get(self, id_: int):
        obj = self.db.get(self.model, id_)
        if obj is None:
            raise NotFound(f"{self.model.__name__} {id_} tidak dijumpai")
        return obj


class OrderCodeGenerator:
    def __init__(self, db: Session, prefix: str = "ORD"):
        self.db, self.prefix = db, prefix

    def next(self) -> str:
        year = date.today().year
        n = self.db.scalar(select(func.count(Order.id))) or 0
        while True:
            n += 1
            code = f"{self.prefix}-{year}-{n:04d}"
            if not self.db.scalar(select(Order.id).where(Order.code == code)):
                return code


class StaffService(Repository):
    model = Staff

    def all(self) -> list[Staff]:
        return list(self.db.scalars(select(Staff).order_by(Staff.id)))


class CustomerService(Repository):
    model = Customer

    def __init__(self, db: Session, policy: SegmentPolicy = SegmentPolicy()):
        super().__init__(db)
        self.policy = policy

    def search(self, q: str = "", audience: str = "") -> list[Customer]:
        stmt = select(Customer).order_by(Customer.id.desc())
        if q:
            stmt = stmt.where(Customer.name.icontains(q) | Customer.phone.contains(q) | Customer.email.icontains(q))
        return [c for c in self.db.scalars(stmt) if c.matches(audience, self.policy)]

    def _tags(self, names: list[str]) -> list[Tag]:
        names = sorted({n.strip().lower() for n in names if n.strip()})
        existing = {t.name: t for t in self.db.scalars(select(Tag).where(Tag.name.in_(names)))}
        return [existing.get(n) or Tag(name=n) for n in names]

    def save(self, data: dict, customer: Customer | None = None, source: str = "staff") -> Customer:
        customer = customer or Customer()
        for field in ("name", "phone", "email", "notes"):
            setattr(customer, field, data.get(field, getattr(customer, field)) or "")
        customer.tags = self._tags(data.get("tags", []))
        for ch, granted in (data.get("consent") or {}).items():
            customer.set_consent(Channel(ch), bool(granted), source)
        self.db.add(customer)
        self.db.commit()
        return customer


class OrderService(Repository):
    model = Order

    def __init__(self, db: Session, notifications: NotificationCenter):
        super().__init__(db)
        self.notifications = notifications

    def search(self, status: OrderStatus | None = None, department: Department | None = None,
               q: str = "") -> list[Order]:
        stmt = select(Order).order_by(Order.id.desc())
        if status:
            stmt = stmt.where(Order.status == status)
        if q:
            stmt = stmt.join(Customer).where(Order.code.contains(q.upper()) | Order.title.icontains(q)
                                             | Customer.name.icontains(q))
        orders = list(self.db.scalars(stmt).unique())
        if department:
            orders = [o for o in orders if o.has_open_work_for(department)]
        return orders

    def by_code(self, code: str) -> Order:
        order = self.db.scalar(select(Order).where(Order.code == code.strip().upper()))
        if not order:
            raise NotFound("Order ID tidak dijumpai")
        return order

    def create(self, customer: Customer, title: str, details: str = "", amount: float = 0,
               due_date: date | None = None) -> Order:
        order = Order.open(OrderCodeGenerator(self.db).next(), customer, title, details, amount, due_date)
        self.db.add(order)
        self.db.flush()
        self.db.add_all(self.notifications.order_status(order))
        self.db.commit()
        return order

    def update_task(self, order_id: int, department: Department, state: TaskState, staff: Staff,
                    note: str = "") -> tuple[Order, int]:
        order = self.get(order_id)
        change = order.update_task(department, state, staff, note)
        sent = self.notifications.status_changed(change)
        self.db.add_all(sent)
        self.db.commit()
        return order, len(sent)


class CampaignService(Repository):
    model = Campaign

    def __init__(self, db: Session, notifications: NotificationCenter, customers: CustomerService):
        super().__init__(db)
        self.notifications, self.customers = notifications, customers

    def all(self) -> list[Campaign]:
        return list(self.db.scalars(select(Campaign).order_by(Campaign.id.desc())))

    def audience(self, channel: Channel, audience: str) -> tuple[list[Customer], int]:
        targets = self.customers.search(audience=audience)
        ok = [c for c in targets if c.can_receive(channel)]
        return ok, len(targets) - len(ok)

    def send(self, name: str, channel: Channel, message: str, audience: str = "") -> Campaign:
        ok, skipped = self.audience(channel, audience)
        campaign = Campaign(name=name, channel=channel, message=message, audience=audience, skipped=skipped)
        self.db.add(campaign)
        self.db.flush()
        sent = self.notifications.campaign(campaign, ok)
        campaign.sent = len(sent)
        self.db.add_all(sent)
        self.db.commit()
        return campaign


class NotificationService(Repository):
    model = Notification

    def recent(self, limit: int = 50) -> list[Notification]:
        return list(self.db.scalars(select(Notification).order_by(Notification.id.desc()).limit(limit)))


@dataclass
class DashboardStats:
    total_orders: int
    active_orders: int
    overdue: int
    revenue: float
    customers: int
    by_status: dict[OrderStatus, int]
    departments: dict[Department, dict[TaskState, int]]


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def dashboard(self, today: date | None = None) -> DashboardStats:
        orders = list(self.db.scalars(select(Order)).unique())
        by_status = {s: 0 for s in OrderStatus}
        depts = {d: {s: 0 for s in TaskState} for d in Department}
        for o in orders:
            by_status[o.status] += 1
            for t in o.tasks:
                depts[t.department][t.state] += 1
        return DashboardStats(
            total_orders=len(orders),
            active_orders=sum(not o.is_completed for o in orders),
            overdue=sum(o.is_overdue(today) for o in orders),
            revenue=sum(o.amount for o in orders),
            customers=self.db.scalar(select(func.count(Customer.id))) or 0,
            by_status=by_status, departments=depts,
        )
