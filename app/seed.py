from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .domain.enums import Channel, Department, Role, TaskState
from .domain.models import Customer, Order, Staff
from .services.services import CustomerService

P, D = TaskState.IN_PROGRESS, TaskState.DONE
DEMO_CUSTOMERS = [
    dict(name="Siti Aminah", phone="0123456789", email="siti@example.com", tags=["event"],
         consent={Channel.WHATSAPP: True, Channel.EMAIL: True}),
    dict(name="Tan Wei Ming", phone="0198765432", email="wm@acme.my", tags=["corporate"],
         consent={Channel.WHATSAPP: True, Channel.EMAIL: True, Channel.SMS: True}),
    dict(name="Ahmad Razif", phone="0171234567", tags=["walk-in"], consent={Channel.SMS: True}),
    dict(name="Nurul Huda", phone="0145556666", email="huda@example.com", tags=["reseller"],
         consent={Channel.WHATSAPP: True}),
    dict(name="Kumar Raj", phone="0162223333", tags=["walk-in"]),  # no consent: blasts skip him
]
# (customer, title, amount, due in days, [(department, state), ...])
DEMO_ORDERS = [
    (0, "Banner Kenduri 3x8 ft", 180, 3, [(Department.DESIGN, D), (Department.PRODUCTION, P)]),
    (1, "Corporate Gift Box x50", 2400, 7, [(Department.DESIGN, P)]),
    (2, "Business Card 500pcs", 90, -1, [(Department.DESIGN, D), (Department.PRODUCTION, D), (Department.DELIVERY, P)]),
    (0, "Roll-up Banner", 160, 5, []),
    (3, "Custom T-Shirt x30", 1050, 10, [(Department.DESIGN, D), (Department.PRODUCTION, D), (Department.DELIVERY, D)]),
]


def seed(db: Session) -> None:
    if db.scalar(select(Customer.id).limit(1)):
        return
    staff = {r: Staff(name=n, role=r) for n, r in [("Aina", Role.DESIGN), ("Hafiz", Role.PRODUCTION),
                                                   ("Zul", Role.DELIVERY), ("Boss", Role.ADMIN)]}
    db.add_all(staff.values())
    svc = CustomerService(db)
    customers = [svc.save(c, source="import") for c in DEMO_CUSTOMERS]
    year = date.today().year
    for i, (ci, title, amount, due, steps) in enumerate(DEMO_ORDERS, 1):
        order = Order.open(f"ORD-{year}-{i:04d}", customers[ci], title, amount=amount,
                           due_date=date.today() + timedelta(days=due))
        for dept, state in steps:
            order.update_task(dept, state, staff[Role(dept.value)])
        db.add(order)
    db.commit()
