"""Notification outbox. Swap `dispatch` for a real WhatsApp/Email/SMS gateway later."""
from sqlalchemy.orm import Session

from .models import Customer, Notification

CHANNELS = ("whatsapp", "email", "sms")

STATUS_LABEL = {
    "received": "Order diterima",
    "design": "Design sedang dibuat",
    "design_approved": "Design approved",
    "in_production": "In production",
    "ready_for_delivery": "Ready for delivery",
    "completed": "Completed",
}

STATUS_MESSAGE = {
    "received": "Hi {name}, tempahan {code} ({title}) telah kami terima. Terima kasih!",
    "design": "Hi {name}, design untuk {code} sedang disiapkan oleh team kami.",
    "design_approved": "Hi {name}, design untuk {code} telah APPROVED. Kami akan mulakan production.",
    "in_production": "Hi {name}, tempahan {code} kini IN PRODUCTION.",
    "ready_for_delivery": "Hi {name}, tempahan {code} sudah SIAP dan ready for delivery.",
    "completed": "Hi {name}, tempahan {code} telah COMPLETED. Terima kasih kerana memilih kami!",
}


def consented_channels(c: Customer) -> list[str]:
    flags = {"whatsapp": c.consent_whatsapp, "email": c.consent_email, "sms": c.consent_sms}
    has_contact = {"whatsapp": bool(c.phone), "sms": bool(c.phone), "email": bool(c.email)}
    return [ch for ch in CHANNELS if flags[ch] and has_contact[ch]]


def dispatch(db: Session, customer: Customer, channel: str, message: str, **refs) -> Notification:
    n = Notification(customer_id=customer.id, channel=channel, message=message, state="sent", **refs)
    db.add(n)
    return n


def notify_status(db: Session, order) -> int:
    msg = STATUS_MESSAGE[order.status].format(
        name=order.customer.name.split()[0], code=order.code, title=order.title
    )
    channels = consented_channels(order.customer)
    for ch in channels:
        dispatch(db, order.customer, ch, msg, order_id=order.id)
    return len(channels)
