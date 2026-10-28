from fastapi import APIRouter, Depends

from .. import deps
from ..domain.enums import Permission
from ..domain.models import Staff
from ..schemas import stats_out
from ..services.services import ReportService

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/admin/stats")
def stats(_: Staff = Depends(deps.require(Permission.VIEW_REPORTS)), svc: ReportService = Depends(deps.reports)):
    return stats_out(svc.dashboard())
