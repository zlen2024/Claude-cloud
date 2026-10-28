from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Customer, Order, OrderTask, Staff, StatusLog

DEMO_ORDERS = [
    # (customer idx, title, amount, due in days, design, production, delivery)
    (0, "Banner Kenduri 3x8 ft", 180, 3, "done", "in_progress", "pending"),
    (1, "Corporate Gift Box x50", 2400, 7, "in_progress", "pending", "pending"),
    (2, "Business Card 500pcs", 90, -1, "done", "done", "in_progress"),
    (0, "Roll-up Banner", 160, 5, "pending", "pending", "pending"),
    (3, "Custom T-Shirt x30", 1050, 10, "done", "done", "done"),
]


def derive(d, p, v):
    if v == "done": return "completed"
    if p == "done": return "ready_for_delivery"
    if p == "in_progress": return "in_production"
    if d == "done": return "design_approved"
    if d == "in_progress": return "design"
    return "received"


def seed(db: Session):
    if db.scalar(select(Customer.id).limit(1)):
        return
    db.add_all([
        Staff(name="Aina", department="design"), Staff(name="Hafiz", department="production"),
        Staff(name="Zul", department="delivery"), Staff(name="Boss", department="admin"),
    ])
    customers = [
        Customer(name="Siti Aminah", phone="0123456789", email="siti@example.com", tags="event",
                 consent_whatsapp=True, consent_email=True),
        Customer(name="Tan Wei Ming", phone="0198765432", email="wm@acme.my", tags="corporate",
                 consent_whatsapp=True, consent_email=True, consent_sms=True),
        Customer(name="Ahmad Razif", phone="0171234567", tags="walk-in", consent_sms=True),
        Customer(name="Nurul Huda", phone="0145556666", email="huda@example.com", tags="reseller",
                 consent_whatsapp=True),
        Customer(name="Kumar Raj", phone="0162223333", tags="walk-in"),  # no consent: blast skips
    ]
    db.add_all(customers)
    db.flush()
    for i, (ci, title, amt, due, d, p, v) in enumerate(DEMO_ORDERS, 1):
        o = Order(code=f"ORD-{date.today().year}-{i:04d}", customer_id=customers[ci].id, title=title,
                  amount=amt, due_date=(date.today() + timedelta(days=due)).isoformat(),
                  status=derive(d, p, v))
        o.tasks = [OrderTask(department="design", state=d), OrderTask(department="production", state=p),
                   OrderTask(department="delivery", state=v)]
        o.logs = [StatusLog(status="received")]
        if o.status != "received":
            o.logs.append(StatusLog(status=o.status, by="seed"))
        db.add(o)
    db.commit()
