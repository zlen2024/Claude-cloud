import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as dbmod
from app.main import app


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


@pytest.fixture()
def login(client):
    def as_(username: str):
        r = client.post("/api/auth/login", json={"username": username, "password": "demo1234"})
        assert r.status_code == 200, r.text
        return client
    return as_
