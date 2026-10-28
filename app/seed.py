"""First-run data. DEMO=1 loads sample staff, customers and ~8 weeks of orders.
DEMO=0 only creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD."""
import logging
import os
import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .domain.enums import Channel, Department, Role, TaskState
from .domain.models import Customer, Order, Staff
from .services.services import CustomerService

log = logging.getLogger("orderflow.seed")
DEMO_PASSWORD = "demo1234"
W, E, S = Channel.WHATSAPP, Channel.EMAIL, Channel.SMS

DEMO_STAFF = [("Boss", "boss", Role.ADMIN), ("Mira", "mira", Role.SALES), ("Aina", "aina", Role.DESIGN),
              ("Hafiz", "hafiz", Role.PRODUCTION), ("Zul", "zul", Role.DELIVERY)]
DEMO_CUSTOMERS = [
    ("Siti Aminah", "012-345 6789", "siti@example.com", ["event"], {W: True, E: True}),
    ("Tan Wei Ming", "019-876 5432", "wm@acme.my", ["corporate"], {W: True, E: True, S: True}),
    ("Ahmad Razif", "017-123 4567", "", ["walk-in"], {S: True}),
    ("Nurul Huda", "014-555 6666", "huda@example.com", ["reseller"], {W: True}),
    ("Kumar Raj", "016-222 3333", "", ["walk-in"], {}),  # no consent: blasts skip him
    ("Farah Lim", "011-2345 6789", "farah@studio.my", ["corporate"], {W: True, E: True}),
    ("Haziq Ismail", "013-998 1122", "haziq@example.com", ["event"], {E: True}),
    ("Grace Wong", "012-777 8899", "grace@bakery.my", ["reseller", "food"], {W: True}),
]
PRODUCTS = [("Banner Kenduri 3x8 ft", 180), ("Corporate Gift Box x50", 2400), ("Business Card 500pcs", 90),
            ("Roll-up Banner", 160), ("Custom T-Shirt x30", 1050), ("Sticker Label 1000pcs", 220),
            ("Backdrop Majlis 8x10 ft", 650), ("Flyer A5 2000pcs", 380), ("Lanyard + ID Card x100", 900),
            ("Packaging Box x200", 1300)]


def seed(db: Session) -> None:
    if db.scalar(select(Staff.id).limit(1)):
        return
    if settings.demo:
        seed_demo(db)
    else:
        bootstrap_admin(db)


def bootstrap_admin(db: Session) -> None:
    username, password = os.getenv("ADMIN_USERNAME", "admin"), os.getenv("ADMIN_PASSWORD", "")
    if len(password) < 8:
        log.warning("No staff yet. Set ADMIN_PASSWORD (8+ chars) and restart to create the first admin.")
        return
    admin = Staff(name="Admin", username=username.lower(), role=Role.ADMIN)
    admin.set_password(password)
    db.add(admin)
    db.commit()


def seed_demo(db: Session, today: date | None = None) -> None:
    rng = random.Random(7)
    today = today or date.today()
    staff = {}
    for name, username, role in DEMO_STAFF:
        s = Staff(name=name, username=username, role=role)
        s.set_password(DEMO_PASSWORD)
        staff[role] = s
    db.add_all(staff.values())
    svc = CustomerService(db)
    customers = [svc.save(dict(name=n, phone=p, email=e, tags=t, consent=c), source="import")
                 for n, p, e, t, c in DEMO_CUSTOMERS]

    flow = [(Department.DESIGN, TaskState.IN_PROGRESS), (Department.DESIGN, TaskState.DONE),
            (Department.PRODUCTION, TaskState.IN_PROGRESS), (Department.PRODUCTION, TaskState.DONE),
            (Department.DELIVERY, TaskState.IN_PROGRESS), (Department.DELIVERY, TaskState.DONE)]
    n_orders = 30
    for i in range(1, n_orders + 1):
        age = int((n_orders - i) * 46 / n_orders) + rng.randint(0, 2)  # older first, within the 8-week chart
        created = datetime.combine(today - timedelta(days=age), datetime.min.time(), timezone.utc) + timedelta(hours=9 + rng.randint(0, 8))
        title, base = rng.choice(PRODUCTS)
        order = Order.open(f"ORD-{created.year}-{i:04d}", rng.choice(customers), title,
                           amount=round(base * rng.uniform(.8, 1.3), -1),
                           due_date=(created + timedelta(days=rng.randint(5, 14))).date())
        order.created_at = order.logs[0].at = created
        # older orders are further along; the newest few are still fresh
        progress = len(flow) if age > 14 else rng.randint(0, len(flow) - 1 if age > 3 else 2)
        t = created
        for dept, state in flow[:progress]:
            t += timedelta(hours=rng.randint(6, 30))
            if order.update_task(dept, state, staff[Role(dept.value)]):
                order.logs[-1].at = t
            order.task(dept).updated_at = t
        if order.completed_at:
            order.completed_at = t
        db.add(order)
    db.commit()
