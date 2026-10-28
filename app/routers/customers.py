from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from .. import deps
from ..domain.enums import Channel, Permission
from ..domain.models import Staff
from ..schemas import ConsentIn, CsvIn, CustomerIn, customer_detail_out, customer_out
from ..services.services import CustomerService

router = APIRouter(prefix="/api", tags=["customers"])
manage = deps.require(Permission.MANAGE_CUSTOMERS)


@router.get("/customers")
def list_customers(q: str = "", audience: str = "", _: Staff = Depends(manage),
                   svc: CustomerService = Depends(deps.customers)):
    return [customer_out(c) for c in svc.search(q, audience)]


@router.get("/customers/export.csv", response_class=PlainTextResponse)
def export_customers(_: Staff = Depends(deps.require(Permission.IMPORT_EXPORT)),
                     svc: CustomerService = Depends(deps.customers)):
    return PlainTextResponse(svc.export_csv(), media_type="text/csv",
                             headers={"Content-Disposition": 'attachment; filename="customers.csv"'})


@router.post("/customers/import")
def import_customers(body: CsvIn, _: Staff = Depends(deps.require(Permission.IMPORT_EXPORT)),
                     svc: CustomerService = Depends(deps.customers)):
    return svc.import_csv(body.csv)


@router.get("/customers/{cid}")
def get_customer(cid: int, _: Staff = Depends(manage), svc: CustomerService = Depends(deps.customers)):
    c = svc.get(cid)
    return customer_detail_out(c, deps.notification_center.manage_link(c))


@router.post("/customers", status_code=201)
def create_customer(body: CustomerIn, _: Staff = Depends(manage), svc: CustomerService = Depends(deps.customers)):
    return customer_out(svc.save(body.model_dump()))


@router.patch("/customers/{cid}")
def update_customer(cid: int, body: CustomerIn, _: Staff = Depends(manage),
                    svc: CustomerService = Depends(deps.customers)):
    return customer_out(svc.save(body.model_dump(), svc.get(cid)))


# --- public, token-protected: customers manage their own consent ---

@router.get("/consent/{token}")
def get_consent(token: str, svc: CustomerService = Depends(deps.customers)):
    c = svc.by_consent_token(token)
    return {"name": c.first_name, "consent": {ch: c.has_consent(ch) for ch in Channel},
            "has": {"whatsapp": bool(c.phone), "sms": bool(c.phone), "email": bool(c.email)}}


@router.post("/consent/{token}")
def set_consent(token: str, body: ConsentIn, svc: CustomerService = Depends(deps.customers)):
    c = svc.update_consent(svc.by_consent_token(token), body.consent, source="customer")
    return {"ok": True, "consent": {ch: c.has_consent(ch) for ch in Channel}}
