import pytest

from app.services.auth import SessionSigner


def test_signer_rejects_tampered_and_expired_tokens():
    s = SessionSigner("secret", 60)
    tok = s.issue(5, now=1000)
    assert s.verify(tok, now=1010) == 5
    assert s.verify(tok, now=2000) is None
    assert s.verify(tok.replace("5.", "6.", 1), now=1010) is None
    assert s.verify("garbage") is None
    assert SessionSigner("other", 60).verify(tok, now=1010) is None


def test_requires_login(client):
    for path in ("/api/orders", "/api/customers", "/api/admin/stats", "/api/auth/me"):
        assert client.get(path).status_code == 401
    assert client.post("/api/auth/login", json={"username": "boss", "password": "wrong"}).status_code == 401


@pytest.mark.parametrize("user,path,expected", [
    ("aina", "/api/orders", 200), ("aina", "/api/customers", 403), ("aina", "/api/admin/stats", 403),
    ("aina", "/api/campaigns", 403), ("aina", "/api/staff", 403),
    ("mira", "/api/customers", 200), ("mira", "/api/notifications", 200), ("mira", "/api/admin/stats", 403),
    ("mira", "/api/campaigns", 403), ("mira", "/api/orders", 200), ("boss", "/api/admin/stats", 200), ("boss", "/api/staff", 200),
])
def test_role_permissions(login, user, path, expected):
    assert login(user).get(path).status_code == expected


def test_admin_manages_team(login, client):
    c = login("boss")
    new = c.post("/api/staff", json={"name": "Lina", "username": "lina", "role": "design", "password": "rahsia123"})
    assert new.status_code == 201
    assert c.post("/api/staff", json={"name": "X", "username": "lina", "role": "design",
                                      "password": "rahsia123"}).status_code == 422
    me = c.get("/api/auth/me").json()
    assert c.patch(f"/api/staff/{me['id']}", json={"active": False}).status_code == 422
    c.patch(f"/api/staff/{new.json()['id']}", json={"active": False})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"username": "lina", "password": "rahsia123"}).status_code == 401


def test_logout_clears_session(login, client):
    login("boss")
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
