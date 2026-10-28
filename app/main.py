from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .db import Base, SessionLocal, engine
from .domain.errors import DomainError
from .routers import admin, customers, orders, outreach
from .seed import seed

STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="OrderFlow AIO", version="0.2.0", lifespan=lifespan)
for r in (orders.router, customers.router, outreach.router, admin.router):
    app.include_router(r)


@app.exception_handler(DomainError)
def domain_error(_: Request, exc: DomainError):
    return JSONResponse({"detail": str(exc)}, status_code=exc.status_code)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "track.html")


@app.get("/app", include_in_schema=False)
def dashboard():
    return FileResponse(STATIC / "app.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
