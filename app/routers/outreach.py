from fastapi import APIRouter, Depends

from .. import deps
from ..domain.enums import Channel, Permission
from ..domain.models import Staff
from ..schemas import CampaignIn, campaign_out, notification_out
from ..services.services import CampaignService, NotificationService

router = APIRouter(prefix="/api", tags=["outreach"])
send = deps.require(Permission.SEND_CAMPAIGNS)


@router.get("/campaigns/preview")
def preview(channel: Channel, audience: str = "", _: Staff = Depends(send),
            svc: CampaignService = Depends(deps.campaigns)):
    ok, skipped = svc.audience(channel, audience)
    return {"eligible": len(ok), "skipped_no_consent": skipped, "live": deps.dispatcher.status()[channel]}


@router.get("/campaigns")
def list_campaigns(_: Staff = Depends(send), svc: CampaignService = Depends(deps.campaigns)):
    return [campaign_out(c) for c in svc.all()]


@router.post("/campaigns", status_code=201)
def send_campaign(body: CampaignIn, _: Staff = Depends(send), svc: CampaignService = Depends(deps.campaigns),
                  deliver=Depends(deps.deliver_later)):
    campaign = svc.send(body.name, body.channel, body.message, body.audience)
    deliver()
    return campaign_out(campaign)


@router.get("/notifications")
def list_notifications(limit: int = 50, _: Staff = Depends(deps.require(Permission.VIEW_NOTIFICATIONS)),
                       svc: NotificationService = Depends(deps.notifications)):
    return {"items": [notification_out(n) for n in svc.recent(min(limit, 500))], "counts": svc.counts(),
            "gateways": deps.dispatcher.status()}


@router.post("/notifications/retry")
def retry_failed(_: Staff = Depends(deps.require(Permission.VIEW_NOTIFICATIONS)),
                 svc: NotificationService = Depends(deps.notifications), deliver=Depends(deps.deliver_later)):
    n = svc.retry_failed()
    deliver()
    return {"requeued": n}
