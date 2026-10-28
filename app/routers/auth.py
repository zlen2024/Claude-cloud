from fastapi import APIRouter, Depends, Response

from .. import deps
from ..config import settings
from ..domain.enums import Permission
from ..domain.models import Staff
from ..schemas import LoginIn, StaffIn, StaffUpdateIn, staff_out
from ..services.auth import AuthService
from ..services.services import StaffService

router = APIRouter(prefix="/api", tags=["auth & team"])


@router.post("/auth/login")
def login(body: LoginIn, response: Response, svc: AuthService = Depends(deps.auth)):
    staff, token = svc.login(body.username, body.password)
    response.set_cookie(deps.SESSION_COOKIE, token, max_age=settings.session_hours * 3600, httponly=True,
                        samesite="lax", secure=settings.secure_cookies)
    return staff_out(staff)


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(deps.SESSION_COOKIE)
    return {"ok": True}


@router.get("/auth/me")
def me(staff: Staff = Depends(deps.current_staff)):
    return {**staff_out(staff), "business_name": settings.business_name,
            "gateways": deps.dispatcher.status()}


@router.get("/auth/config")
def public_config():
    """What the login screen needs before anyone signs in."""
    return {"business_name": settings.business_name, "demo": settings.demo}


@router.get("/staff")
def list_staff(_: Staff = Depends(deps.require(Permission.MANAGE_STAFF)),
               svc: StaffService = Depends(deps.staff)):
    return [staff_out(s) for s in svc.all()]


@router.post("/staff", status_code=201)
def create_staff(body: StaffIn, _: Staff = Depends(deps.require(Permission.MANAGE_STAFF)),
                 svc: StaffService = Depends(deps.staff)):
    return staff_out(svc.create(body.name, body.username, body.role, body.password))


@router.patch("/staff/{staff_id}")
def update_staff(staff_id: int, body: StaffUpdateIn, actor: Staff = Depends(deps.require(Permission.MANAGE_STAFF)),
                 svc: StaffService = Depends(deps.staff)):
    return staff_out(svc.update(svc.get(staff_id), actor, body.role, body.active, body.password))
