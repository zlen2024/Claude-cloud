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


class Permission(StrEnum):
    VIEW_ORDERS = "view_orders"
    UPDATE_TASKS = "update_tasks"
    MANAGE_ORDERS = "manage_orders"
    MANAGE_CUSTOMERS = "manage_customers"
    VIEW_NOTIFICATIONS = "view_notifications"
    SEND_CAMPAIGNS = "send_campaigns"
    VIEW_REPORTS = "view_reports"
    MANAGE_STAFF = "manage_staff"
    IMPORT_EXPORT = "import_export"


class Role(StrEnum):
    ADMIN = "admin"
    SALES = "sales"
    DESIGN = "design"
    PRODUCTION = "production"
    DELIVERY = "delivery"

    @property
    def department(self) -> Department | None:
        return Department(self.value) if self.value in Department._value2member_map_ else None

    @property
    def permissions(self) -> frozenset[Permission]:
        return _ROLE_PERMISSIONS[self]


_FLOOR = frozenset({Permission.VIEW_ORDERS, Permission.UPDATE_TASKS})
_ROLE_PERMISSIONS = {
    Role.ADMIN: frozenset(Permission),
    Role.SALES: _FLOOR | {Permission.MANAGE_ORDERS, Permission.MANAGE_CUSTOMERS,
                          Permission.VIEW_NOTIFICATIONS, Permission.IMPORT_EXPORT},
    Role.DESIGN: _FLOOR,
    Role.PRODUCTION: _FLOOR,
    Role.DELIVERY: _FLOOR,
}


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
