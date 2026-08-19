from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401  (ensures models are registered before create_all)
from app.auth import router as auth_router
from app.routers.requests import router as requests_router
from app.routers.admin import router as admin_router

# Creates tables in MySQL if they don't exist yet.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Maintenance Request & Escalation System API",
    description=(
        "Backend for employee login/registration, maintenance request submission, "
        "status tracking, and the admin panel. Auto-escalation logic is intentionally "
        "not implemented in this build."
    ),
    version="1.0.0",
)

# Allow the React (axios) frontend running on common dev ports to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(requests_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {"message": "Smart Maintenance Request & Escalation System API is running"}
