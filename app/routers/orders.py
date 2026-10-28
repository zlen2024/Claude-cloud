from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from .. import deps
from ..domain.enums import Department, OrderStatus, Permission
from ..domain.errors import InvalidOperation
from ..domain.models import Staff
from ..schemas import OrderEditIn, OrderIn, TaskUpdateIn, order_out, tracking_out
from ..services.services import CustomerService, OrderService

router = APIRouter(prefix="/api", tags=["orders"])


@router.get("/track/{code}")
def track(code: str, svc: OrderService = Depends(deps.orders)):
    return tracking_out(svc.by_code(code))


@router.get("/orders")
def list_orders(status: OrderStatus | None = None, department: Department | None = None, q: str = "",
                _: Staff = Depends(deps.require(Permission.VIEW_ORDERS)), svc: OrderService = Depends(deps.orders)):
    return [order_out(o) for o in svc.search(status, department, q)]


@router.get("/orders/export.csv", response_class=PlainTextResponse)
def export_orders(_: Staff = Depends(deps.require(Permission.IMPORT_EXPORT)),
                  svc: OrderService = Depends(deps.orders)):
    return PlainTextResponse(svc.export_csv(), media_type="text/csv",
                             headers={"Content-Disposition": 'attachment; filename="orders.csv"'})


@router.get("/orders/{order_id}")
def get_order(order_id: int, _: Staff = Depends(deps.require(Permission.VIEW_ORDERS)),
              svc: OrderService = Depends(deps.orders)):
    return order_out(svc.get(order_id))


@router.post("/orders", status_code=201)
def create_order(body: OrderIn, _: Staff = Depends(deps.require(Permission.MANAGE_ORDERS)),
                 svc: OrderService = Depends(deps.orders), customers: CustomerService = Depends(deps.customers),
                 deliver=Depends(deps.deliver_later)):
    if body.customer_id:
        customer = customers.get(body.customer_id)
    elif body.new_customer:
        customer = customers.save(body.new_customer.model_dump())
    else:
        raise InvalidOperation("customer_id atau new_customer diperlukan")
    order = svc.create(customer, body.title, body.details, body.amount, body.due_date)
    deliver()
    return order_out(order)


@router.patch("/orders/{order_id}")
def edit_order(order_id: int, body: OrderEditIn, _: Staff = Depends(deps.require(Permission.MANAGE_ORDERS)),
               svc: OrderService = Depends(deps.orders)):
    return order_out(svc.edit(order_id, **body.model_dump(exclude_unset=True)))


@router.patch("/orders/{order_id}/tasks/{department}")
def update_task(order_id: int, department: Department, body: TaskUpdateIn,
                staff: Staff = Depends(deps.require(Permission.UPDATE_TASKS)),
                svc: OrderService = Depends(deps.orders), deliver=Depends(deps.deliver_later)):
    order, queued = svc.update_task(order_id, department, body.state, staff, body.note)
    deliver()
    return {**order_out(order), "notifications_sent": queued}
