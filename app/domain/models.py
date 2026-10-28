"""Domain entities. Each class owns its rules; services only orchestrate and persist."""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .enums import Channel, Department, OrderStatus, Permission, Role, Segment, TaskState
from .errors import InvalidOperation


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_col(enum_cls, **kw):
    return mapped_column(Enum(enum_cls, native_enum=False, length=32,
                              values_callable=lambda e: [m.value for m in e]), **kw)


# ---------------------------------------------------------------- customers

customer_tags = Table(
    "customer_tags", Base.metadata,
    Column("customer_id", ForeignKey("customers.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)


class ConsentRecord(Base):
    """Append-only consent history, so we can show when and how a customer opted in or out."""
    __tablename__ = "consent_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    channel: Mapped[Channel] = enum_col(Channel)
    granted: Mapped[bool]
    source: Mapped[str] = mapped_column(String(40), default="staff")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


@dataclass(frozen=True)
class SegmentPolicy:
    vip_spend: float = 1000
    repeat_orders: int = 2

    def classify(self, total_spent: float, order_count: int) -> Segment:
        if total_spent >= self.vip_spend:
            return Segment.VIP
        if order_count >= self.repeat_orders:
            return Segment.REPEAT
        return Segment.NEW


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    consent_token: Mapped[str] = mapped_column(String(32), unique=True, index=True,
                                               default=lambda: secrets.token_urlsafe(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tags: Mapped[list[Tag]] = relationship(secondary=customer_tags, lazy="selectin")
    consents: Mapped[list[ConsentRecord]] = relationship(
        cascade="all, delete-orphan", order_by=ConsentRecord.id, lazy="selectin")
    orders: Mapped[list[Order]] = relationship(back_populates="customer", lazy="selectin")

    @property
    def first_name(self) -> str:
        return self.name.split()[0] if self.name else ""

    @property
    def tag_names(self) -> list[str]:
        return sorted(t.name for t in self.tags)

    # consent ---------------------------------------------------------
    def has_consent(self, channel: Channel) -> bool:
        latest = next((c for c in reversed(self.consents) if c.channel == channel), None)
        return bool(latest and latest.granted)

    def set_consent(self, channel: Channel, granted: bool, source: str = "staff") -> bool:
        """Record a change only when the answer actually changes. Returns True if recorded."""
        if self.has_consent(channel) == granted:
            return False
        self.consents.append(ConsentRecord(channel=channel, granted=granted, source=source))
        return True

    @property
    def phone_e164(self) -> str:
        """Malaysian numbers: 012-345 6789 -> +60123456789. Already-international numbers are kept."""
        digits = re.sub(r"\D", "", self.phone or "")
        if not digits:
            return ""
        if (self.phone or "").strip().startswith("+") or digits.startswith("60"):
            return "+" + digits
        return "+6" + digits if digits.startswith("0") else "+60" + digits

    def contact_for(self, channel: Channel) -> str:
        return self.email if channel is Channel.EMAIL else self.phone_e164

    def can_receive(self, channel: Channel) -> bool:
        return self.has_consent(channel) and bool(self.contact_for(channel))

    @property
    def reachable_channels(self) -> list[Channel]:
        return [ch for ch in Channel if self.can_receive(ch)]

    # purchase history -------------------------------------------------
    @property
    def total_spent(self) -> float:
        return sum(o.amount for o in self.orders)

    @property
    def last_order_at(self) -> datetime | None:
        return max((o.created_at for o in self.orders), default=None)

    def segment(self, policy: SegmentPolicy = SegmentPolicy()) -> Segment:
        return policy.classify(self.total_spent, len(self.orders))

    def matches(self, audience: str, policy: SegmentPolicy = SegmentPolicy()) -> bool:
        """Audience is '' (everyone), a segment name, or a tag name."""
        return not audience or audience == self.segment(policy) or audience in self.tag_names


# ---------------------------------------------------------------- staff

class Staff(Base):
    __tablename__ = "staff"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200), default="")
    role: Mapped[Role] = enum_col(Role)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    _ITERATIONS = 200_000

    def set_password(self, password: str) -> None:
        if len(password) < 8:
            raise InvalidOperation("Password mesti sekurang-kurangnya 8 aksara")
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), self._ITERATIONS).hex()
        self.password_hash = f"pbkdf2_sha256${self._ITERATIONS}${salt}${digest}"

    def check_password(self, password: str) -> bool:
        try:
            _, iters, salt, digest = self.password_hash.split("$")
        except ValueError:
            return False
        test = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iters)).hex()
        return self.active and hmac.compare_digest(test, digest)

    @property
    def department(self) -> Department | None:
        return self.role.department

    @property
    def is_admin(self) -> bool:
        return self.role is Role.ADMIN

    def can(self, permission: Permission) -> bool:
        return self.active and permission in self.role.permissions

    def can_work_on(self, department: Department) -> bool:
        return self.can(Permission.UPDATE_TASKS) and (self.is_admin or self.department is department)


# ---------------------------------------------------------------- orders

class OrderTask(Base):
    """One department's piece of work on an order."""
    __tablename__ = "order_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    department: Mapped[Department] = enum_col(Department)
    state: Mapped[TaskState] = enum_col(TaskState, default=TaskState.PENDING)
    note: Mapped[str] = mapped_column(Text, default="")
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    staff: Mapped[Staff | None] = relationship(lazy="joined")
    order: Mapped[Order] = relationship(back_populates="tasks")

    def move_to(self, state: TaskState, staff: Staff, note: str = "") -> None:
        if not staff.can_work_on(self.department):
            raise InvalidOperation(f"{staff.name} tidak boleh update kerja {self.department}")
        self.state, self.staff, self.updated_at = state, staff, utcnow()
        if note:
            self.note = note

    def start(self, staff: Staff, note: str = "") -> None:
        self.move_to(TaskState.IN_PROGRESS, staff, note)

    def complete(self, staff: Staff, note: str = "") -> None:
        self.move_to(TaskState.DONE, staff, note)


class StatusLog(Base):
    __tablename__ = "status_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    status: Mapped[OrderStatus] = enum_col(OrderStatus)
    note: Mapped[str] = mapped_column(Text, default="")
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    staff: Mapped[Staff | None] = relationship(lazy="joined")


@dataclass(frozen=True)
class StatusChange:
    order: Order
    previous: OrderStatus
    current: OrderStatus


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    title: Mapped[str] = mapped_column(String(160))
    details: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[OrderStatus] = enum_col(OrderStatus, default=OrderStatus.RECEIVED)
    due_date: Mapped[date | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped[Customer] = relationship(back_populates="orders", lazy="joined")
    tasks: Mapped[list[OrderTask]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by=OrderTask.id, lazy="selectin")
    logs: Mapped[list[StatusLog]] = relationship(
        cascade="all, delete-orphan", order_by=StatusLog.id, lazy="selectin")

    # First matching rule wins: (department, state) -> order status.
    STATUS_RULES: tuple[tuple[Department, TaskState, OrderStatus], ...] = (
        (Department.DELIVERY, TaskState.DONE, OrderStatus.COMPLETED),
        (Department.PRODUCTION, TaskState.DONE, OrderStatus.READY_FOR_DELIVERY),
        (Department.PRODUCTION, TaskState.IN_PROGRESS, OrderStatus.IN_PRODUCTION),
        (Department.DESIGN, TaskState.DONE, OrderStatus.DESIGN_APPROVED),
        (Department.DESIGN, TaskState.IN_PROGRESS, OrderStatus.DESIGN),
    )

    @classmethod
    def open(cls, code: str, customer: Customer, title: str, details: str = "",
             amount: float = 0, due_date: date | None = None) -> Order:
        order = cls(code=code, customer=customer, title=title, details=details, amount=amount,
                    due_date=due_date, status=OrderStatus.RECEIVED)
        order.tasks = [OrderTask(department=d) for d in Department]
        order.logs = [StatusLog(status=OrderStatus.RECEIVED)]
        return order

    def edit(self, title: str | None = None, details: str | None = None, amount: float | None = None,
             due_date: date | None = None) -> None:
        if amount is not None and amount < 0:
            raise InvalidOperation("Amount tidak boleh negatif")
        for field, value in (("title", title), ("details", details), ("amount", amount), ("due_date", due_date)):
            if value is not None:
                setattr(self, field, value)

    def task(self, department: Department) -> OrderTask:
        return next(t for t in self.tasks if t.department is department)

    def derive_status(self) -> OrderStatus:
        states = {t.department: t.state for t in self.tasks}
        for dept, state, status in self.STATUS_RULES:
            if states.get(dept) is state:
                return status
        return OrderStatus.RECEIVED

    def update_task(self, department: Department, state: TaskState, staff: Staff,
                    note: str = "") -> StatusChange | None:
        """Move one department's task and recompute status. Returns the change, if any."""
        if self.is_completed and department is not Department.DELIVERY:
            raise InvalidOperation("Order sudah completed")
        self.task(department).move_to(state, staff, note)
        return self._recompute(staff, note)

    def _recompute(self, staff: Staff | None, note: str) -> StatusChange | None:
        new = self.derive_status()
        if new is self.status:
            return None
        change = StatusChange(self, self.status, new)
        self.status = new
        self.completed_at = utcnow() if new is OrderStatus.COMPLETED else None
        self.logs.append(StatusLog(status=new, note=note, staff=staff))
        return change

    @property
    def is_completed(self) -> bool:
        return self.status is OrderStatus.COMPLETED

    def is_overdue(self, today: date | None = None) -> bool:
        return bool(self.due_date) and not self.is_completed and self.due_date < (today or date.today())

    @property
    def progress(self) -> float:
        return self.status.step / (len(OrderStatus) - 1)

    def has_open_work_for(self, department: Department) -> bool:
        return self.task(department).state is not TaskState.DONE


# ---------------------------------------------------------------- outreach

class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    channel: Mapped[Channel] = enum_col(Channel)
    message: Mapped[str] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(String(40), default="")
    sent: Mapped[int] = mapped_column(default=0)
    skipped: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def render_for(self, customer: Customer) -> str:
        return self.message.replace("{name}", customer.first_name).strip()


class Notification(Base):
    """Outbox row. Single-table inheritance: StatusNotification and CampaignNotification."""
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    channel: Mapped[Channel] = enum_col(Channel)
    recipient: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(16), default="queued")  # queued|sent|simulated|failed
    detail: Mapped[str] = mapped_column(Text, default="")
    attempts: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    customer: Mapped[Customer] = relationship(lazy="joined")

    MAX_ATTEMPTS = 3

    def mark(self, state: str, detail: str = "") -> None:
        self.attempts += 1
        self.state, self.detail = state, detail
        if state in ("sent", "simulated"):
            self.sent_at = utcnow()
        elif state == "failed" and self.attempts < self.MAX_ATTEMPTS:
            self.state = "queued"  # retried on the next dispatch

    __mapper_args__ = {"polymorphic_on": "kind", "polymorphic_identity": "generic"}


class StatusNotification(Notification):
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=True)
    __mapper_args__ = {"polymorphic_identity": "status"}


class CampaignNotification(Notification):
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True)
    __mapper_args__ = {"polymorphic_identity": "campaign"}
