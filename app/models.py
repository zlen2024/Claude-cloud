from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, Text, Boolean, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(32), default="")
    email: Mapped[str] = mapped_column(String(120), default="")
    tags: Mapped[str] = mapped_column(String(255), default="")  # comma separated e.g. "vip,repeat"
    notes: Mapped[str] = mapped_column(Text, default="")
    consent_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_email: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    orders: Mapped[list["Order"]] = relationship(back_populates="customer")


class Staff(Base):
    __tablename__ = "staff"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    department: Mapped[str] = mapped_column(String(32))  # design|production|delivery|admin


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    title: Mapped[str] = mapped_column(String(160))
    details: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="received")
    due_date: Mapped[str] = mapped_column(String(10), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    customer: Mapped[Customer] = relationship(back_populates="orders")
    tasks: Mapped[list["OrderTask"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderTask.id"
    )
    logs: Mapped[list["StatusLog"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="StatusLog.id"
    )


class OrderTask(Base):
    """One row per department per order — what each team updates."""
    __tablename__ = "order_tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    department: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(16), default="pending")  # pending|in_progress|done
    note: Mapped[str] = mapped_column(Text, default="")
    updated_by: Mapped[str] = mapped_column(String(80), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    order: Mapped[Order] = relationship(back_populates="tasks")


class StatusLog(Base):
    __tablename__ = "status_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    status: Mapped[str] = mapped_column(String(32))
    note: Mapped[str] = mapped_column(Text, default="")
    by: Mapped[str] = mapped_column(String(80), default="system")
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    order: Mapped[Order] = relationship(back_populates="logs")


class Notification(Base):
    """Outbox. Prototype only records messages; a real gateway plugs into notify.dispatch()."""
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(16), default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    customer: Mapped[Customer] = relationship()


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    channel: Mapped[str] = mapped_column(String(16))
    message: Mapped[str] = mapped_column(Text)
    tag: Mapped[str] = mapped_column(String(40), default="")
    sent: Mapped[int] = mapped_column(default=0)
    skipped: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
