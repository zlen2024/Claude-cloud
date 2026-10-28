from fastapi import APIRouter, Depends

from .. import deps
from ..schemas import CustomerIn, customer_detail_out, customer_out
from ..services.services import CustomerService

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("")
def list_customers(q: str = "", audience: str = "", svc: CustomerService = Depends(deps.customers)):
    return [customer_out(c) for c in svc.search(q, audience)]


@router.get("/{cid}")
def get_customer(cid: int, svc: CustomerService = Depends(deps.customers)):
    return customer_detail_out(svc.get(cid))


@router.post("", status_code=201)
def create_customer(body: CustomerIn, svc: CustomerService = Depends(deps.customers)):
    return customer_out(svc.save(body.model_dump()))


@router.patch("/{cid}")
def update_customer(cid: int, body: CustomerIn, svc: CustomerService = Depends(deps.customers)):
    return customer_out(svc.save(body.model_dump(), svc.get(cid)))
