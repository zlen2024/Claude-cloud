from fastapi import APIRouter, Depends

from .. import deps
from ..domain.enums import Channel
from ..schemas import CampaignIn, campaign_out, notification_out
from ..services.services import CampaignService, NotificationService

router = APIRouter(prefix="/api", tags=["outreach"])


@router.get("/campaigns/preview")
def preview(channel: Channel, audience: str = "", svc: CampaignService = Depends(deps.campaigns)):
    ok, skipped = svc.audience(channel, audience)
    return {"eligible": len(ok), "skipped_no_consent": skipped}


@router.get("/campaigns")
def list_campaigns(svc: CampaignService = Depends(deps.campaigns)):
    return [campaign_out(c) for c in svc.all()]


@router.post("/campaigns", status_code=201)
def send_campaign(body: CampaignIn, svc: CampaignService = Depends(deps.campaigns)):
    return campaign_out(svc.send(body.name, body.channel, body.message, body.audience))


@router.get("/notifications")
def list_notifications(limit: int = 50, svc: NotificationService = Depends(deps.notifications)):
    return [notification_out(n) for n in svc.recent(limit)]
