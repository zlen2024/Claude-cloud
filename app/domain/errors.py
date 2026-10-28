class DomainError(Exception):
    """Base for errors the API turns into 4xx responses."""
    status_code = 400


class NotFound(DomainError):
    status_code = 404


class InvalidOperation(DomainError):
    status_code = 422
