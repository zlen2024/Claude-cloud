import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as dbmod
from app.main import app
from app.seed import seed


@pytest.fixture()
def client(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Session = sessionmaker(bind=engine, autoflush=False)
    monkeypatch.setattr("app.main.engine", engine)
    monkeypatch.setattr("app.main.SessionLocal", Session)

    def get_db():
        with Session() as s:
            yield s
    app.dependency_overrides[dbmod.get_db] = get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def staff_id(c, role):
    return next(s["id"] for s in c.get("/api/staff").json() if s["role"] == role)


def test_order_lifecycle_sends_notifications(client):
    o = client.post("/api/orders", json={"new_customer": {"name": "Ali Baba", "phone": "011",
                    "consent": {"whatsapp": True}}, "title": "Sticker", "due_date": ""}).json()
    assert o["status"] == "received"
    r = client.patch(f"/api/orders/{o['id']}/tasks/design",
                     json={"state": "done", "staff_id": staff_id(client, "design")}).json()
    assert r["status"] == "design_approved" and r["notifications_sent"] == 1
    assert client.get(f"/api/track/{o['code'].lower()}").json()["status"] == "design_approved"


def test_wrong_department_is_rejected(client):
    oid = client.get("/api/orders").json()[0]["id"]
    r = client.patch(f"/api/orders/{oid}/tasks/production",
                     json={"state": "done", "staff_id": staff_id(client, "design")})
    assert r.status_code == 422


def test_tracking_hides_contact_details(client):
    body = client.get("/api/track/" + client.get("/api/orders?q=Banner Kenduri").json()[0]["code"]).json()
    assert "phone" not in str(body) and body["customer"] == "Siti"
    assert client.get("/api/track/NOPE").status_code == 404


def test_campaign_respects_consent(client):
    pv = client.get("/api/campaigns/preview?channel=whatsapp").json()
    r = client.post("/api/campaigns", json={"name": "Raya", "channel": "whatsapp",
                                            "message": "Hi {name}!"}).json()
    assert r["sent"] == pv["eligible"] == 3 and r["skipped"] == pv["skipped_no_consent"] == 2
    msgs = [n["message"] for n in client.get("/api/notifications").json() if n["kind"] == "campaign"]
    assert "Hi Siti!" in msgs


def test_customer_consent_change_is_recorded(client):
    c = client.get("/api/customers?q=Kumar").json()[0]
    client.patch(f"/api/customers/{c['id']}", json={"name": c["name"], "phone": c["phone"],
                 "tags": ["walk-in", "VIP-list"], "consent": {"sms": True}})
    d = client.get(f"/api/customers/{c['id']}").json()
    assert d["consent"]["sms"] and d["tags"] == ["vip-list", "walk-in"]
    assert d["consent_history"][0]["channel"] == "sms"
