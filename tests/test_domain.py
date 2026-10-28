from datetime import date, timedelta

import pytest

from app.domain.enums import Channel, Department, OrderStatus, Role, Segment, TaskState
from app.domain.errors import InvalidOperation
from app.domain.models import Customer, Order, SegmentPolicy, Staff
from app.services.notifiers import NotificationCenter

designer = Staff(id=1, name="Aina", role=Role.DESIGN)
producer = Staff(id=2, name="Hafiz", role=Role.PRODUCTION)
driver = Staff(id=3, name="Zul", role=Role.DELIVERY)
boss = Staff(id=4, name="Boss", role=Role.ADMIN)


def make_order(**kw) -> Order:
    customer = Customer(name="Siti Aminah", phone="012", email="s@x.my", consents=[], orders=[], tags=[])
    return Order.open("ORD-1", customer, "Banner", **kw)


def test_new_order_has_one_task_per_department():
    o = make_order()
    assert [t.department for t in o.tasks] == list(Department)
    assert o.status is OrderStatus.RECEIVED and len(o.logs) == 1


def test_status_follows_department_work():
    o = make_order()
    steps = [
        (Department.DESIGN, TaskState.IN_PROGRESS, designer, OrderStatus.DESIGN),
        (Department.DESIGN, TaskState.DONE, designer, OrderStatus.DESIGN_APPROVED),
        (Department.PRODUCTION, TaskState.IN_PROGRESS, producer, OrderStatus.IN_PRODUCTION),
        (Department.PRODUCTION, TaskState.DONE, producer, OrderStatus.READY_FOR_DELIVERY),
        (Department.DELIVERY, TaskState.DONE, driver, OrderStatus.COMPLETED),
    ]
    for dept, state, who, expected in steps:
        change = o.update_task(dept, state, who)
        assert change and change.current is expected
    assert o.completed_at is not None and o.progress == 1
    assert [l.status for l in o.logs][-1] is OrderStatus.COMPLETED


def test_no_change_returns_none():
    o = make_order()
    o.update_task(Department.DESIGN, TaskState.IN_PROGRESS, designer)
    assert o.update_task(Department.DESIGN, TaskState.IN_PROGRESS, designer, "nota") is None


def test_staff_cannot_touch_other_department_but_admin_can():
    o = make_order()
    with pytest.raises(InvalidOperation):
        o.update_task(Department.PRODUCTION, TaskState.DONE, designer)
    o.update_task(Department.PRODUCTION, TaskState.IN_PROGRESS, boss)
    assert o.status is OrderStatus.IN_PRODUCTION


def test_overdue():
    assert make_order(due_date=date.today() - timedelta(days=1)).is_overdue()
    assert not make_order(due_date=date.today() + timedelta(days=1)).is_overdue()
    assert not make_order().is_overdue()


def test_consent_history_and_reachability():
    c = Customer(name="Kumar", phone="016", email="", consents=[], orders=[], tags=[])
    assert c.reachable_channels == []
    assert c.set_consent(Channel.WHATSAPP, True)
    assert not c.set_consent(Channel.WHATSAPP, True)  # no duplicate record
    assert c.set_consent(Channel.EMAIL, True)
    assert c.reachable_channels == [Channel.WHATSAPP]  # email consent but no address
    c.set_consent(Channel.WHATSAPP, False)
    assert not c.has_consent(Channel.WHATSAPP) and len(c.consents) == 3


def test_segment_policy():
    p = SegmentPolicy(vip_spend=1000, repeat_orders=2)
    assert p.classify(50, 1) is Segment.NEW
    assert p.classify(50, 2) is Segment.REPEAT
    assert p.classify(1500, 1) is Segment.VIP


def test_status_notification_only_on_consented_channels():
    o = make_order()
    o.customer.set_consent(Channel.SMS, True)
    sent = NotificationCenter().order_status(o)
    assert [n.channel for n in sent] == [Channel.SMS] and "ORD-1" in sent[0].message
