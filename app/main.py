from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from . import notify
from .db import Base, SessionLocal, engine, get_db
from .models import Campaign, Customer, Notification, Order, OrderTask, Staff, StatusLog
from .seed import seed

DEPARTMENTS = ("design", "production", "delivery")
TASK_STATES = ("pending", "in_progress", "done")
STATIC = Path(__file__).parent / "static"

app = FastAPI(title="OrderFlow AIO", version="0.1.0")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


# ---------- helpers ----------

def derive_status(order: Order) -> str:
    t = {x.department: x.state for x in order.tasks}
    if t.get("delivery") == "done":
        return "completed"
    if t.get("production") == "done":
        return "ready_for_delivery"
    if t.get("production") == "in_progress":
        return "in_production"
    if t.get("design") == "done":
        return "design_approved"
    if t.get("design") == "in_progress":
        return "design"
    return "received"


def next_code(db: Session) -> str:
    n = db.scalar(select(func.count(Order.id))) or 0
    year = datetime.now(timezone.utc).year
    while True:
        n += 1
        code = f"ORD-{year}-{n:04d}"
        if not db.scalar(select(Order.id).where(Order.code == code)):
            return code


def segment(c: Customer, spent: float, count: int) -> str:
    if spent >= 1000:
        return "vip"
    return "repeat" if count >= 2 else "new"


def order_out(o: Order) -> dict:
    return {
        "id": o.id, "code": o.code, "title": o.title, "details": o.details, "amount": o.amount,
        "status": o.status, "status_label": notify.STATUS_LABEL[o.status], "due_date": o.due_date,
        "created_at": o.created_at, "customer": {"id": o.customer.id, "name": o.customer.name},
        "tasks": [
            {"id": t.id, "department": t.department, "state": t.state, "note": t.note,
             "updated_by": t.updated_by, "updated_at": t.updated_at}
            for t in o.tasks
        ],
        "logs": [
            {"status": l.status, "label": notify.STATUS_LABEL.get(l.status, l.status),
             "note": l.note, "by": l.by, "at": l.at}
            for l in o.logs
        ],
    }


def customer_out(c: Customer) -> dict:
    spent = sum(o.amount for o in c.orders)
    tags = [t for t in c.tags.split(",") if t]
    return {
        "id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "tags": tags, "notes": c.notes,
        "consent": {"whatsapp": c.consent_whatsapp, "email": c.consent_email, "sms": c.consent_sms},
        "order_count": len(c.orders), "total_spent": spent,
        "segment": segment(c, spent, len(c.orders)),
        "last_order": max((o.created_at for o in c.orders), default=None),
    }


def get_order_or_404(db: Session, order_id: int) -> Order:
    o = db.scalar(select(Order).where(Order.id == order_id).options(
        selectinload(Order.tasks), selectinload(Order.logs), selectinload(Order.customer)))
    if not o:
        raise HTTPException(404, "Order not found")
    return o


def apply_status(db: Session, o: Order, by: str, note: str = "") -> int:
    new = derive_status(o)
    if new == o.status:
        return 0
    o.status = new
    o.completed_at = datetime.now(timezone.utc) if new == "completed" else None
    db.add(StatusLog(order_id=o.id, status=new, note=note, by=by))
    return notify.notify_status(db, o)


# ---------- schemas ----------

class CustomerIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    email: str = ""
    tags: list[str] = []
    notes: str = ""
    consent_whatsapp: bool = False
    consent_email: bool = False
    consent_sms: bool = False


class OrderIn(BaseModel):
    customer_id: int | None = None
    new_customer: CustomerIn | None = None
    title: str = Field(min_length=1)
    details: str = ""
    amount: float = 0
    due_date: str = ""


class TaskUpdate(BaseModel):
    state: str
    note: str = ""
    by: str = "staff"


class CampaignIn(BaseModel):
    name: str = Field(min_length=1)
    channel: str
    message: str = Field(min_length=1)
    tag: str = ""  # "" = everyone; otherwise tag or segment (new/repeat/vip)


# ---------- public ----------

@app.get("/api/track/{code}")
def track(code: str, db: Session = Depends(get_db)):
    o = db.scalar(select(Order).where(Order.code == code.strip().upper()).options(
        selectinload(Order.logs), selectinload(Order.customer)))
    if not o:
        raise HTTPException(404, "Order ID tidak dijumpai")
    first = o.customer.name.split()[0]
    return {
        "code": o.code, "title": o.title, "customer": first, "status": o.status,
        "status_label": notify.STATUS_LABEL[o.status], "due_date": o.due_date,
        "steps": [{"key": k, "label": v} for k, v in notify.STATUS_LABEL.items()],
        "timeline": [{"status": l.status, "label": notify.STATUS_LABEL.get(l.status, l.status),
                      "at": l.at} for l in o.logs],
    }


# ---------- orders ----------

@app.get("/api/orders")
def list_orders(status: str = "", department: str = "", q: str = "", db: Session = Depends(get_db)):
    stmt = select(Order).options(selectinload(Order.tasks), selectinload(Order.logs),
                                 selectinload(Order.customer)).order_by(Order.id.desc())
    if status:
        stmt = stmt.where(Order.status == status)
    if q:
        stmt = stmt.join(Customer).where(Order.code.contains(q.upper()) | Order.title.icontains(q)
                                         | Customer.name.icontains(q))
    orders = db.scalars(stmt).all()
    if department:
        orders = [o for o in orders if any(t.department == department and t.state != "done"
                                           for t in o.tasks)]
    return [order_out(o) for o in orders]


@app.get("/api/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    return order_out(get_order_or_404(db, order_id))


@app.post("/api/orders", status_code=201)
def create_order(body: OrderIn, db: Session = Depends(get_db)):
    if body.customer_id:
        cust = db.get(Customer, body.customer_id)
        if not cust:
            raise HTTPException(404, "Customer not found")
    elif body.new_customer:
        d = body.new_customer.model_dump()
        d["tags"] = ",".join(d["tags"])
        cust = Customer(**d)
        db.add(cust)
        db.flush()
    else:
        raise HTTPException(422, "customer_id or new_customer required")
    o = Order(code=next_code(db), customer_id=cust.id, title=body.title, details=body.details,
              amount=body.amount, due_date=body.due_date, status="received")
    o.tasks = [OrderTask(department=d) for d in DEPARTMENTS]
    o.logs = [StatusLog(status="received", by="system")]
    db.add(o)
    db.flush()
    db.refresh(o)
    notify.notify_status(db, o)
    db.commit()
    return order_out(get_order_or_404(db, o.id))


@app.patch("/api/orders/{order_id}/tasks/{department}")
def update_task(order_id: int, department: str, body: TaskUpdate, db: Session = Depends(get_db)):
    if body.state not in TASK_STATES:
        raise HTTPException(422, f"state must be one of {TASK_STATES}")
    o = get_order_or_404(db, order_id)
    task = next((t for t in o.tasks if t.department == department), None)
    if not task:
        raise HTTPException(404, "Department not found")
    task.state, task.updated_by, task.updated_at = body.state, body.by, datetime.now(timezone.utc)
    if body.note:
        task.note = body.note
    sent = apply_status(db, o, body.by, body.note)
    db.commit()
    out = order_out(get_order_or_404(db, order_id))
    out["notifications_sent"] = sent
    return out


# ---------- customers / CRM ----------

@app.get("/api/customers")
def list_customers(segment_: str = "", tag: str = "", q: str = "", db: Session = Depends(get_db)):
    stmt = select(Customer).options(selectinload(Customer.orders)).order_by(Customer.id.desc())
    if q:
        stmt = stmt.where(Customer.name.icontains(q) | Customer.phone.contains(q)
                          | Customer.email.icontains(q))
    out = [customer_out(c) for c in db.scalars(stmt).all()]
    key = segment_ or tag
    if key:
        out = [c for c in out if c["segment"] == key or key in c["tags"]]
    return out


@app.post("/api/customers", status_code=201)
def create_customer(body: CustomerIn, db: Session = Depends(get_db)):
    d = body.model_dump()
    d["tags"] = ",".join(d["tags"])
    c = Customer(**d)
    db.add(c)
    db.commit()
    return customer_out(c)


@app.patch("/api/customers/{cid}")
def update_customer(cid: int, body: CustomerIn, db: Session = Depends(get_db)):
    c = db.get(Customer, cid)
    if not c:
        raise HTTPException(404, "Customer not found")
    for k, v in body.model_dump().items():
        setattr(c, k, ",".join(v) if k == "tags" else v)
    db.commit()
    return customer_out(c)


@app.get("/api/customers/{cid}")
def customer_detail(cid: int, db: Session = Depends(get_db)):
    c = db.scalar(select(Customer).where(Customer.id == cid).options(
        selectinload(Customer.orders).selectinload(Order.tasks),
        selectinload(Customer.orders).selectinload(Order.logs),
        selectinload(Customer.orders).selectinload(Order.customer)))
    if not c:
        raise HTTPException(404, "Customer not found")
    return {**customer_out(c), "orders": [order_out(o) for o in sorted(c.orders, key=lambda x: -x.id)]}


# ---------- blasting ----------

def eligible(db: Session, channel: str, tag: str):
    ok, skipped = [], 0
    for c in db.scalars(select(Customer).options(selectinload(Customer.orders))).all():
        info = customer_out(c)
        if tag and tag != info["segment"] and tag not in info["tags"]:
            continue
        if channel in notify.consented_channels(c):
            ok.append(c)
        else:
            skipped += 1
    return ok, skipped


@app.get("/api/campaigns/preview")
def preview(channel: str, tag: str = "", db: Session = Depends(get_db)):
    ok, skipped = eligible(db, channel, tag)
    return {"eligible": len(ok), "skipped_no_consent": skipped}


@app.get("/api/campaigns")
def list_campaigns(db: Session = Depends(get_db)):
    rows = db.scalars(select(Campaign).order_by(Campaign.id.desc())).all()
    return [{"id": c.id, "name": c.name, "channel": c.channel, "tag": c.tag, "message": c.message,
             "sent": c.sent, "skipped": c.skipped, "created_at": c.created_at} for c in rows]


@app.post("/api/campaigns", status_code=201)
def send_campaign(body: CampaignIn, db: Session = Depends(get_db)):
    if body.channel not in notify.CHANNELS:
        raise HTTPException(422, f"channel must be one of {notify.CHANNELS}")
    ok, skipped = eligible(db, body.channel, body.tag)
    camp = Campaign(name=body.name, channel=body.channel, message=body.message, tag=body.tag,
                    sent=len(ok), skipped=skipped)
    db.add(camp)
    db.flush()
    for c in ok:
        notify.dispatch(db, c, body.channel, body.message.replace("{name}", c.name.split()[0]),
                        campaign_id=camp.id)
    db.commit()
    return {"id": camp.id, "sent": camp.sent, "skipped": camp.skipped}


# ---------- notifications, staff, admin ----------

@app.get("/api/notifications")
def list_notifications(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).options(selectinload(Notification.customer))
                      .order_by(Notification.id.desc()).limit(limit)).all()
    return [{"id": n.id, "customer": n.customer.name, "channel": n.channel, "message": n.message,
             "kind": "campaign" if n.campaign_id else "status", "state": n.state,
             "created_at": n.created_at} for n in rows]


@app.get("/api/staff")
def list_staff(db: Session = Depends(get_db)):
    return [{"id": s.id, "name": s.name, "department": s.department} for s in db.scalars(select(Staff))]


@app.get("/api/admin/stats")
def stats(db: Session = Depends(get_db)):
    orders = db.scalars(select(Order).options(selectinload(Order.tasks))).all()
    today = datetime.now(timezone.utc).date().isoformat()
    by_status = {k: 0 for k in notify.STATUS_LABEL}
    for o in orders:
        by_status[o.status] += 1
    dept = {d: {"pending": 0, "in_progress": 0, "done": 0} for d in DEPARTMENTS}
    for o in orders:
        for t in o.tasks:
            dept[t.department][t.state] += 1
    active = [o for o in orders if o.status != "completed"]
    return {
        "total_orders": len(orders),
        "active_orders": len(active),
        "overdue": sum(1 for o in active if o.due_date and o.due_date < today),
        "revenue": sum(o.amount for o in orders),
        "customers": db.scalar(select(func.count(Customer.id))),
        "by_status": [{"key": k, "label": notify.STATUS_LABEL[k], "count": v} for k, v in by_status.items()],
        "departments": dept,
    }


# ---------- frontend ----------

@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "track.html")


@app.get("/app", include_in_schema=False)
def dashboard():
    return FileResponse(STATIC / "app.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
