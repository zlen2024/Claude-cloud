from enum import StrEnum


class OrderStatus(StrEnum):
    RECEIVED = "received"
    DESIGN = "design"
    DESIGN_APPROVED = "design_approved"
    IN_PRODUCTION = "in_production"
    READY_FOR_DELIVERY = "ready_for_delivery"
    COMPLETED = "completed"

    @property
    def label(self) -> str:
        return _STATUS_LABELS[self]

    @property
    def step(self) -> int:
        return list(OrderStatus).index(self)


_STATUS_LABELS = {
    OrderStatus.RECEIVED: "Order diterima",
    OrderStatus.DESIGN: "Design sedang dibuat",
    OrderStatus.DESIGN_APPROVED: "Design approved",
    OrderStatus.IN_PRODUCTION: "In production",
    OrderStatus.READY_FOR_DELIVERY: "Ready for delivery",
    OrderStatus.COMPLETED: "Completed",
}


class Department(StrEnum):
    """Workflow departments, in the order work flows through them."""
    DESIGN = "design"
    PRODUCTION = "production"
    DELIVERY = "delivery"


class Role(StrEnum):
    DESIGN = "design"
    PRODUCTION = "production"
    DELIVERY = "delivery"
    ADMIN = "admin"

    @property
    def department(self) -> Department | None:
        return None if self is Role.ADMIN else Department(self.value)


class TaskState(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Channel(StrEnum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SMS = "sms"


class Segment(StrEnum):
    NEW = "new"
    REPEAT = "repeat"
    VIP = "vip"
