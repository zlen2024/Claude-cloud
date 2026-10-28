from fastapi import APIRouter, Depends

from .. import deps
from ..domain.enums import Department, OrderStatus
from ..domain.errors import InvalidOperation
from ..schemas import OrderIn, TaskUpdateIn, order_out, tracking_out
from ..services.services import CustomerService, OrderService, StaffService

router = APIRouter(prefix="/api", tags=["orders"])


@router.get("/track/{code}")
def track(code: str, svc: OrderService = Depends(deps.orders)):
    return tracking_out(svc.by_code(code))


@router.get("/orders")
def list_orders(status: OrderStatus | None = None, department: Department | None = None, q: str = "",
                svc: OrderService = Depends(deps.orders)):
    return [order_out(o) for o in svc.search(status, department, q)]


@router.get("/orders/{order_id}")
def get_order(order_id: int, svc: OrderService = Depends(deps.orders)):
    return order_out(svc.get(order_id))


@router.post("/orders", status_code=201)
def create_order(body: OrderIn, svc: OrderService = Depends(deps.orders),
                 customers: CustomerService = Depends(deps.customers)):
    if body.customer_id:
        customer = customers.get(body.customer_id)
    elif body.new_customer:
        customer = customers.save(body.new_customer.model_dump())
    else:
        raise InvalidOperation("customer_id atau new_customer diperlukan")
    order = svc.create(customer, body.title, body.details, body.amount, body.due_date)
    return order_out(order)


@router.patch("/orders/{order_id}/tasks/{department}")
def update_task(order_id: int, department: Department, body: TaskUpdateIn,
                svc: OrderService = Depends(deps.orders), staff: StaffService = Depends(deps.staff)):
    order, sent = svc.update_task(order_id, department, body.state, staff.get(body.staff_id), body.note)
    return {**order_out(order), "notifications_sent": sent}
