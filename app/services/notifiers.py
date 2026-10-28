"""Channel notifiers and the outbox.

NotificationCenter only *queues* rows (state=queued). Dispatcher delivers them after the request
commits, through whichever Notifier is configured for the channel. Unconfigured channels use
SimulatedNotifier so the whole flow works in a demo without credentials.
"""
from __future__ import annotations

import base64
import json
import logging
import smtplib
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import Settings
from ..domain.enums import Channel, OrderStatus
from ..domain.models import (Campaign, CampaignNotification, Customer, Notification, Order,
                             StatusChange, StatusNotification)

log = logging.getLogger("orderflow.notify")


@dataclass(frozen=True)
class DeliveryResult:
    state: str  # sent | simulated | failed
    detail: str = ""


class Notifier(ABC):
    channel: Channel
    live = True

    def send(self, recipient: str, message: str, subject: str = "") -> DeliveryResult:
        if not recipient:
            return DeliveryResult("failed", "tiada alamat penerima")
        try:
            return self.deliver(recipient, message, subject)
        except Exception as exc:  # gateway/network errors become a failed (retryable) row
            log.warning("%s delivery to %s failed: %s", self.channel, recipient, exc)
            return DeliveryResult("failed", str(exc)[:300])

    @abstractmethod
    def deliver(self, recipient: str, message: str, subject: str) -> DeliveryResult: ...


class SimulatedNotifier(Notifier):
    live = False

    def __init__(self, channel: Channel):
        self.channel = channel

    def deliver(self, recipient: str, message: str, subject: str) -> DeliveryResult:
        log.info("[simulated %s] %s: %s", self.channel, recipient, message)
        return DeliveryResult("simulated", "gateway belum dikonfigurasi")


def _post(url: str, data: bytes, headers: dict) -> dict:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read()[:200].decode(errors='replace')}") from None


class WhatsAppCloudNotifier(Notifier):
    """Meta WhatsApp Cloud API. Note: business-initiated chats outside the 24h window need an
    approved template; free-text works for replies and for testing with registered numbers."""
    channel = Channel.WHATSAPP
    API = "https://graph.facebook.com/v20.0/{phone_id}/messages"

    def __init__(self, token: str, phone_id: str):
        self.token, self.phone_id = token, phone_id

    def deliver(self, recipient: str, message: str, subject: str) -> DeliveryResult:
        body = {"messaging_product": "whatsapp", "to": recipient.lstrip("+"), "type": "text",
                "text": {"body": message}}
        res = _post(self.API.format(phone_id=self.phone_id), json.dumps(body).encode(),
                    {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
        return DeliveryResult("sent", (res.get("messages") or [{}])[0].get("id", ""))


class SmtpEmailNotifier(Notifier):
    channel = Channel.EMAIL

    def __init__(self, host: str, port: int, user: str, password: str, sender: str):
        self.host, self.port, self.user, self.password, self.sender = host, port, user, password, sender

    def deliver(self, recipient: str, message: str, subject: str) -> DeliveryResult:
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = self.sender, recipient, subject or "Makluman"
        msg.set_content(message)
        with smtplib.SMTP(self.host, self.port, timeout=15) as s:
            s.starttls()
            if self.user:
                s.login(self.user, self.password)
            s.send_message(msg)
        return DeliveryResult("sent")


class TwilioSmsNotifier(Notifier):
    channel = Channel.SMS
    API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"

    def __init__(self, sid: str, token: str, sender: str):
        self.sid, self.token, self.sender = sid, token, sender

    def deliver(self, recipient: str, message: str, subject: str) -> DeliveryResult:
        auth = base64.b64encode(f"{self.sid}:{self.token}".encode()).decode()
        data = urllib.parse.urlencode({"To": recipient, "From": self.sender, "Body": message}).encode()
        res = _post(self.API.format(sid=self.sid), data, {"Authorization": f"Basic {auth}",
                                                          "Content-Type": "application/x-www-form-urlencoded"})
        return DeliveryResult("sent", res.get("sid", ""))


def build_notifiers(s: Settings) -> list[Notifier]:
    wa = WhatsAppCloudNotifier(s.whatsapp_token, s.whatsapp_phone_id) \
        if s.whatsapp_token and s.whatsapp_phone_id else SimulatedNotifier(Channel.WHATSAPP)
    email = SmtpEmailNotifier(s.smtp_host, s.smtp_port, s.smtp_user, s.smtp_password, s.smtp_from) \
        if s.smtp_host and s.smtp_from else SimulatedNotifier(Channel.EMAIL)
    sms = TwilioSmsNotifier(s.twilio_sid, s.twilio_token, s.twilio_from) \
        if s.twilio_sid and s.twilio_token and s.twilio_from else SimulatedNotifier(Channel.SMS)
    return [wa, email, sms]


STATUS_TEMPLATES: dict[OrderStatus, str] = {
    OrderStatus.RECEIVED: "Hi {name}, tempahan {code} ({title}) telah kami terima. Semak status: {link}",
    OrderStatus.DESIGN: "Hi {name}, design untuk {code} sedang disiapkan oleh team kami. {link}",
    OrderStatus.DESIGN_APPROVED: "Hi {name}, design untuk {code} telah APPROVED. Kami akan mulakan production. {link}",
    OrderStatus.IN_PRODUCTION: "Hi {name}, tempahan {code} kini IN PRODUCTION. {link}",
    OrderStatus.READY_FOR_DELIVERY: "Hi {name}, tempahan {code} sudah SIAP dan ready for delivery. {link}",
    OrderStatus.COMPLETED: "Hi {name}, tempahan {code} telah COMPLETED. Terima kasih kerana memilih kami!",
}


class NotificationCenter:
    """Decides who gets what on which channel, and queues it in the outbox."""

    def __init__(self, base_url: str, business_name: str = "OrderFlow"):
        self.base_url, self.business_name = base_url, business_name

    def tracking_link(self, order: Order) -> str:
        return f"{self.base_url}/?id={order.code}"

    def manage_link(self, customer: Customer) -> str:
        return f"{self.base_url}/c/{customer.consent_token}"

    def order_status(self, order: Order) -> list[Notification]:
        c = order.customer
        msg = STATUS_TEMPLATES[order.status].format(name=c.first_name, code=order.code, title=order.title,
                                                    link=self.tracking_link(order)).strip()
        return [StatusNotification(customer=c, order_id=order.id, channel=ch, recipient=c.contact_for(ch), state="queued",
                                   message=msg) for ch in c.reachable_channels]

    def status_changed(self, change: StatusChange | None) -> list[Notification]:
        return self.order_status(change.order) if change else []

    def campaign(self, campaign: Campaign, customers: list[Customer]) -> list[Notification]:
        # Marketing messages always carry an opt-out link.
        return [CampaignNotification(customer=c, campaign_id=campaign.id, channel=campaign.channel,
                                     recipient=c.contact_for(campaign.channel), state="queued",
                                     message=f"{campaign.render_for(c)}\n\nUrus langganan: {self.manage_link(c)}")
                for c in customers if c.can_receive(campaign.channel)]


class Dispatcher:
    """Delivers queued outbox rows. Called after each request that queues messages."""

    def __init__(self, notifiers: list[Notifier], business_name: str = "OrderFlow"):
        self.notifiers = {n.channel: n for n in notifiers}
        self.business_name = business_name

    def status(self) -> dict[Channel, bool]:
        return {ch: self.notifiers[ch].live for ch in Channel}

    def flush(self, db: Session, limit: int = 200) -> int:
        rows = db.scalars(select(Notification).where(Notification.state == "queued")
                          .order_by(Notification.id).limit(limit)).all()
        for row in rows:
            subject = f"{self.business_name}: {'Promosi' if row.kind == 'campaign' else 'Status tempahan'}"
            result = self.notifiers[row.channel].send(row.recipient, row.message, subject)
            row.mark(result.state, result.detail)
        db.commit()
        return len(rows)
