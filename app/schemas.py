"""API contracts (input validation + output shaping). Kept apart from the domain classes."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from .domain.enums import Channel, Department, OrderStatus, TaskState
from .domain.models import Campaign, Customer, Notification, Order, Staff
from .services.services import DashboardStats


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = ""
    email: str = ""
    notes: str = ""
    tags: list[str] = []
    consent: dict[Channel, bool] = {}


class OrderIn(BaseModel):
    customer_id: int | None = None
    new_customer: CustomerIn | None = None
    title: str = Field(min_length=1, max_length=160)
    details: str = ""
    amount: float = Field(0, ge=0)
    due_date: date | None = None

    @field_validator("due_date", mode="before")
    @classmethod
    def blank_is_none(cls, v):
        return v or None


class TaskUpdateIn(BaseModel):
    state: TaskState
    staff_id: int
    note: str = ""


class CampaignIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    channel: Channel
    message: str = Field(min_length=1)
    audience: str = ""  # '' = everyone, or a segment / tag


# ---------------------------------------------------------------- output

def staff_out(s: Staff) -> dict:
    return {"id": s.id, "name": s.name, "role": s.role, "department": s.department}


def order_out(o: Order) -> dict:
    return {
        "id": o.id, "code": o.code, "title": o.title, "details": o.details, "amount": o.amount,
        "status": o.status, "status_label": o.status.label, "progress": o.progress,
        "due_date": o.due_date, "overdue": o.is_overdue(), "created_at": o.created_at,
        "customer": {"id": o.customer.id, "name": o.customer.name},
        "tasks": [{"department": t.department, "state": t.state, "note": t.note,
                   "updated_by": t.staff.name if t.staff else "", "updated_at": t.updated_at}
                  for t in o.tasks],
        "logs": [{"status": l.status, "label": l.status.label, "note": l.note,
                  "by": l.staff.name if l.staff else "system", "at": l.at} for l in o.logs],
    }


def tracking_out(o: Order) -> dict:
    """Public view: no contact details, first name only."""
    return {
        "code": o.code, "title": o.title, "customer": o.customer.first_name, "status": o.status,
        "status_label": o.status.label, "due_date": o.due_date,
        "steps": [{"key": s, "label": s.label} for s in OrderStatus],
        "timeline": [{"status": l.status, "label": l.status.label, "at": l.at} for l in o.logs],
    }


def customer_out(c: Customer) -> dict:
    return {
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "notes": c.notes,
        "tags": c.tag_names, "consent": {ch: c.has_consent(ch) for ch in Channel},
        "order_count": len(c.orders), "total_spent": c.total_spent, "segment": c.segment(),
        "last_order": c.last_order_at,
    }


def customer_detail_out(c: Customer) -> dict:
    return {
        **customer_out(c),
        "orders": [order_out(o) for o in sorted(c.orders, key=lambda o: -o.id)],
        "consent_history": [{"channel": r.channel, "granted": r.granted, "source": r.source,
                             "at": r.recorded_at} for r in reversed(c.consents)],
    }


def campaign_out(c: Campaign) -> dict:
    return {"id": c.id, "name": c.name, "channel": c.channel, "audience": c.audience,
            "message": c.message, "sent": c.sent, "skipped": c.skipped, "created_at": c.created_at}


def notification_out(n: Notification) -> dict:
    return {"id": n.id, "customer": n.customer.name, "channel": n.channel, "recipient": n.recipient,
            "kind": n.kind, "message": n.message, "state": n.state, "created_at": n.created_at}


def stats_out(s: DashboardStats) -> dict:
    return {
        "total_orders": s.total_orders, "active_orders": s.active_orders, "overdue": s.overdue,
        "revenue": s.revenue, "customers": s.customers,
        "by_status": [{"key": k, "label": k.label, "count": v} for k, v in s.by_status.items()],
        "departments": {d: dict(v) for d, v in s.departments.items()},
    }


