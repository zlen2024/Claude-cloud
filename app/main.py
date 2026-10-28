import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .db import Base, SessionLocal, engine
from .domain.errors import DomainError
from .routers import admin, auth, customers, orders, outreach
from .seed import seed

STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not os.getenv("SECRET_KEY"):
        logging.getLogger("orderflow").warning("SECRET_KEY not set: sessions reset on every restart.")
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="OrderFlow AIO", version="0.3.0", lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    return response
for r in (auth.router, orders.router, customers.router, outreach.router, admin.router):
    app.include_router(r)


@app.exception_handler(DomainError)
def domain_error(_: Request, exc: DomainError):
    return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "track.html")


@app.get("/c/{token}", include_in_schema=False)
def consent_page(token: str):
    return FileResponse(STATIC / "consent.html")


@app.get("/app", include_in_schema=False)
def dashboard():
    return FileResponse(STATIC / "app.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
