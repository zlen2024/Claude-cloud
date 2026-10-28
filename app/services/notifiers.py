"""Channel notifiers. Each subclass owns its channel's delivery; swap in a real gateway here."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass

from ..domain.enums import Channel, OrderStatus
from ..domain.models import (Campaign, CampaignNotification, Customer, Notification, Order,
                             StatusChange, StatusNotification)

log = logging.getLogger("orderflow.notify")


@dataclass(frozen=True)
class DeliveryResult:
    ok: bool
    detail: str = ""


class Notifier(ABC):
    channel: Channel

    def send(self, customer: Customer, message: str) -> DeliveryResult:
        if not customer.can_receive(self.channel):
            return DeliveryResult(False, "no consent or contact")
        return self.deliver(customer.contact_for(self.channel), message)

    @abstractmethod
    def deliver(self, recipient: str, message: str) -> DeliveryResult: ...


class WhatsAppNotifier(Notifier):
    channel = Channel.WHATSAPP

    def deliver(self, recipient: str, message: str) -> DeliveryResult:
        log.info("[whatsapp] %s: %s", recipient, message)  # TODO: WhatsApp Cloud API
        return DeliveryResult(True, "queued (prototype)")


class EmailNotifier(Notifier):
    channel = Channel.EMAIL

    def deliver(self, recipient: str, message: str) -> DeliveryResult:
        log.info("[email] %s: %s", recipient, message)  # TODO: SMTP / transactional provider
        return DeliveryResult(True, "queued (prototype)")


class SmsNotifier(Notifier):
    channel = Channel.SMS

    def deliver(self, recipient: str, message: str) -> DeliveryResult:
        log.info("[sms] %s: %s", recipient, message)  # TODO: SMS gateway
        return DeliveryResult(True, "queued (prototype)")


STATUS_TEMPLATES: dict[OrderStatus, str] = {
    OrderStatus.RECEIVED: "Hi {name}, tempahan {code} ({title}) telah kami terima. Terima kasih!",
    OrderStatus.DESIGN: "Hi {name}, design untuk {code} sedang disiapkan oleh team kami.",
    OrderStatus.DESIGN_APPROVED: "Hi {name}, design untuk {code} telah APPROVED. Kami akan mulakan production.",
    OrderStatus.IN_PRODUCTION: "Hi {name}, tempahan {code} kini IN PRODUCTION.",
    OrderStatus.READY_FOR_DELIVERY: "Hi {name}, tempahan {code} sudah SIAP dan ready for delivery.",
    OrderStatus.COMPLETED: "Hi {name}, tempahan {code} telah COMPLETED. Terima kasih kerana memilih kami!",
}


class NotificationCenter:
    """Picks the right notifier per channel and records every message in the outbox."""

    def __init__(self, notifiers: list[Notifier] | None = None):
        notifiers = notifiers or [WhatsAppNotifier(), EmailNotifier(), SmsNotifier()]
        self.notifiers = {n.channel: n for n in notifiers}

    def _send(self, row: Notification, customer: Customer) -> Notification | None:
        result = self.notifiers[row.channel].send(customer, row.message)
        if not result.ok:
            return None
        row.recipient = customer.contact_for(row.channel)
        row.state = "sent"
        return row

    def order_status(self, order: Order) -> list[Notification]:
        msg = STATUS_TEMPLATES[order.status].format(
            name=order.customer.first_name, code=order.code, title=order.title)
        rows = [self._send(StatusNotification(customer=order.customer, order_id=order.id,
                                              channel=ch, message=msg), order.customer)
                for ch in order.customer.reachable_channels]
        return [r for r in rows if r]

    def status_changed(self, change: StatusChange | None) -> list[Notification]:
        return self.order_status(change.order) if change else []

    def campaign(self, campaign: Campaign, customers: list[Customer]) -> list[Notification]:
        rows = [self._send(CampaignNotification(customer=c, campaign_id=campaign.id, channel=campaign.channel,
                                                message=campaign.render_for(c)), c)
                for c in customers]
        return [r for r in rows if r]
