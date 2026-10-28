from fastapi import APIRouter, Depends

from .. import deps
from ..schemas import staff_out, stats_out
from ..services.services import ReportService, StaffService

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/staff")
def list_staff(svc: StaffService = Depends(deps.staff)):
    return [staff_out(s) for s in svc.all()]


@router.get("/admin/stats")
def stats(svc: ReportService = Depends(deps.reports)):
    return stats_out(svc.dashboard())
