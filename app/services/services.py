"""Application services: load entities, call their behaviour, persist, fire notifications."""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..domain.enums import Channel, Department, OrderStatus, Role, TaskState
from ..domain.errors import InvalidOperation, NotFound
from ..domain.models import (Campaign, Customer, Notification, Order, SegmentPolicy, Staff, Tag)
from .notifiers import Dispatcher, NotificationCenter


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

    def create(self, name: str, username: str, role: Role, password: str) -> Staff:
        username = username.strip().lower()
        if self.db.scalar(select(Staff.id).where(Staff.username == username)):
            raise InvalidOperation("Username sudah digunakan")
        staff = Staff(name=name.strip(), username=username, role=role)
        staff.set_password(password)
        self.db.add(staff)
        self.db.commit()
        return staff

    def update(self, staff: Staff, actor: Staff, role: Role | None = None, active: bool | None = None,
               password: str | None = None) -> Staff:
        if staff.id == actor.id and (active is False or (role and role is not Role.ADMIN)):
            raise InvalidOperation("Tak boleh nyahaktif atau turunkan role akaun sendiri")
        if role:
            staff.role = role
        if active is not None:
            staff.active = active
        if password:
            staff.set_password(password)
        self.db.commit()
        return staff


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

    def by_consent_token(self, token: str) -> Customer:
        c = self.db.scalar(select(Customer).where(Customer.consent_token == token))
        if not c:
            raise NotFound("Link tidak sah")
        return c

    def update_consent(self, customer: Customer, consent: dict[Channel, bool], source: str) -> Customer:
        for ch, granted in consent.items():
            customer.set_consent(Channel(ch), bool(granted), source)
        self.db.commit()
        return customer

    def find_existing(self, phone: str, email: str) -> Customer | None:
        tmp = Customer(phone=phone)
        if phone and tmp.phone_e164:
            for c in self.db.scalars(select(Customer).where(Customer.phone != "")):
                if c.phone_e164 == tmp.phone_e164:
                    return c
        if email:
            return self.db.scalar(select(Customer).where(func.lower(Customer.email) == email.strip().lower()))
        return None

    CSV_FIELDS = ["name", "phone", "email", "tags", "notes", "consent_whatsapp", "consent_email", "consent_sms"]

    def import_csv(self, text: str) -> dict:
        """Create or update customers from a spreadsheet export. Matches existing rows on phone, then email."""
        created = updated = 0
        errors: list[str] = []
        reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
        if not reader.fieldnames or "name" not in [f.strip().lower() for f in reader.fieldnames]:
            raise InvalidOperation("CSV mesti ada column 'name'")
        truthy = {"1", "y", "yes", "ya", "true", "setuju"}
        for i, raw in enumerate(reader, start=2):
            row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
            if not row.get("name"):
                errors.append(f"Baris {i}: tiada nama")
                continue
            existing = self.find_existing(row.get("phone", ""), row.get("email", ""))
            data = {
                "name": row["name"], "phone": row.get("phone", ""), "email": row.get("email", ""),
                "notes": row.get("notes", ""),
                "tags": [t for t in row.get("tags", "").replace(";", ",").split(",") if t.strip()],
                "consent": {ch: row[f"consent_{ch}"].lower() in truthy
                            for ch in Channel if f"consent_{ch}" in row and row[f"consent_{ch}"] != ""},
            }
            if existing:
                data["tags"] = sorted(set(existing.tag_names) | set(t.strip().lower() for t in data["tags"]))
            self.save(data, existing, source="import")
            updated += bool(existing)
            created += not existing
        return {"created": created, "updated": updated, "errors": errors}

    def export_csv(self) -> str:
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(self.CSV_FIELDS + ["segment", "order_count", "total_spent"])
        for c in self.search():
            w.writerow([c.name, c.phone, c.email, ",".join(c.tag_names), c.notes,
                        *[int(c.has_consent(ch)) for ch in Channel],
                        c.segment(self.policy), len(c.orders), f"{c.total_spent:.2f}"])
        return out.getvalue()

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

    def edit(self, order_id: int, **fields) -> Order:
        order = self.get(order_id)
        order.edit(**fields)
        self.db.commit()
        return order

    def export_csv(self) -> str:
        out = io.StringIO()
        w = csv.writer(out)
        w.writerow(["code", "created_at", "customer", "phone", "title", "amount", "status", "due_date",
                    *[f"{d}_state" for d in Department]])
        for o in reversed(self.search()):
            w.writerow([o.code, o.created_at.date().isoformat(), o.customer.name, o.customer.phone, o.title,
                        f"{o.amount:.2f}", o.status.label, o.due_date or "", *[o.task(d).state for d in Department]])
        return out.getvalue()

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
        queued = self.notifications.campaign(campaign, ok)
        campaign.sent = len(queued)
        self.db.add_all(queued)
        self.db.commit()
        return campaign


class NotificationService(Repository):
    model = Notification

    def recent(self, limit: int = 50) -> list[Notification]:
        return list(self.db.scalars(select(Notification).order_by(Notification.id.desc()).limit(limit)))

    def counts(self) -> dict[str, int]:
        rows = self.db.execute(select(Notification.state, func.count()).group_by(Notification.state)).all()
        return {state: n for state, n in rows}

    def retry_failed(self) -> int:
        rows = self.db.scalars(select(Notification).where(Notification.state == "failed")).all()
        for r in rows:
            r.state, r.attempts = "queued", 0
        self.db.commit()
        return len(rows)


@dataclass
class WeekPoint:
    week_start: date
    orders: int = 0
    revenue: float = 0
    completed: int = 0


@dataclass
class DashboardStats:
    total_orders: int
    active_orders: int
    overdue: int
    revenue: float
    customers: int
    by_status: dict[OrderStatus, int]
    departments: dict[Department, dict[TaskState, int]]
    weekly: list[WeekPoint] = field(default_factory=list)


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
            by_status=by_status, departments=depts, weekly=self.weekly(orders, today),
        )

    @staticmethod
    def weekly(orders: list[Order], today: date | None = None, weeks: int = 8) -> list[WeekPoint]:
        today = today or date.today()
        this_monday = today - timedelta(days=today.weekday())
        points = [WeekPoint(this_monday - timedelta(weeks=weeks - 1 - i)) for i in range(weeks)]
        index = {p.week_start: p for p in points}

        def bucket(dt: datetime | None) -> WeekPoint | None:
            if not dt:
                return None
            d = dt.astimezone(timezone.utc).date() if dt.tzinfo else dt.date()
            return index.get(d - timedelta(days=d.weekday()))

        for o in orders:
            if p := bucket(o.created_at):
                p.orders += 1
                p.revenue += o.amount
            if p := bucket(o.completed_at):
                p.completed += 1
        return points
