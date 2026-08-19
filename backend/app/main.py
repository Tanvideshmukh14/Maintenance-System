from datetime import datetime, timezone
from typing import List, Optional

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.enums import RoleEnum, StatusEnum

# Schema is managed by Alembic migrations (see backend/alembic/), not by
# create_all() -- run `alembic upgrade head` before starting the app.

app = FastAPI(title="Smart Maintenance Request & Escalation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _to_request_out(req: models.MaintenanceRequest) -> schemas.RequestOut:
    data = schemas.RequestOut.model_validate(req)
    data.employee_name = req.employee.name if req.employee else None
    data.assignee_name = req.assignee.name if req.assignee else None
    return data


# ---------------------------------------------------------------- Auth ----

@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        role=payload.role,
        department=payload.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # OAuth2PasswordRequestForm uses `username`, which we treat as the email.
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value})
    return schemas.Token(access_token=token, user=user)


@app.post("/auth/login-json", response_model=schemas.Token)
def login_json(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Same as /auth/login but accepts JSON instead of a form body — the
    React frontend uses this one since it's simpler to call with fetch()."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token({"sub": str(user.id), "role": user.role.value})
    return schemas.Token(access_token=token, user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ------------------------------------------------------------ Requests ----

@app.post("/requests", response_model=schemas.RequestOut, status_code=201)
def create_request(
    payload: schemas.RequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    req = models.MaintenanceRequest(
        employee_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status=StatusEnum.Pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _to_request_out(req)


@app.get("/requests/my", response_model=List[schemas.RequestOut])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    reqs = (
        db.query(models.MaintenanceRequest)
        .filter(models.MaintenanceRequest.employee_id == current_user.id)
        .order_by(models.MaintenanceRequest.created_at.desc())
        .all()
    )
    return [_to_request_out(r) for r in reqs]


@app.get("/requests", response_model=List[schemas.RequestOut])
def all_requests(
    status_filter: Optional[StatusEnum] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    query = db.query(models.MaintenanceRequest)
    if status_filter:
        query = query.filter(models.MaintenanceRequest.status == status_filter)
    reqs = query.order_by(models.MaintenanceRequest.created_at.desc()).all()
    return [_to_request_out(r) for r in reqs]


@app.get("/requests/{request_id}", response_model=schemas.RequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    req = db.query(models.MaintenanceRequest).get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if current_user.role != RoleEnum.admin and req.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    return _to_request_out(req)


@app.patch("/requests/{request_id}", response_model=schemas.RequestOut)
def update_request(
    request_id: int,
    payload: schemas.RequestUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    req = db.query(models.MaintenanceRequest).get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if payload.status is not None:
        req.status = payload.status
        if payload.status == StatusEnum.Resolved:
            # resolved_at has no column default (it's only meaningful on
            # this one transition) so it's set explicitly here, in UTC.
            # updated_at is NOT set manually -- MySQL's own
            # "ON UPDATE CURRENT_TIMESTAMP" handles it for every UPDATE,
            # which is the single source of truth for that column.
            req.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if payload.assigned_to is not None:
        assignee = db.query(models.User).get(payload.assigned_to)
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        req.assigned_to = payload.assigned_to
    if payload.priority is not None:
        req.priority = payload.priority

    db.commit()
    db.refresh(req)
    return _to_request_out(req)




@app.post("/requests/{request_id}/escalate", response_model=schemas.RequestOut)
def escalate_request(
    request_id: int,
    payload: schemas.EscalationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    """Escalate a request: bump escalation_level, flip status, and record
    an audit row in escalation_logs so the history survives the change."""
    req = db.query(models.MaintenanceRequest).get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    log = models.EscalationLog(
        request_id=req.id,
        escalated_from=req.status.value,
        escalated_to=payload.escalated_to,
        reason=payload.reason,
    )
    db.add(log)

    req.status = StatusEnum.Escalated
    req.escalation_level = req.escalation_level + 1

    db.commit()
    db.refresh(req)
    return _to_request_out(req)


@app.get("/technicians", response_model=List[schemas.UserOut])
def list_admins(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    """List admin/technician accounts so a ticket can be assigned to one."""
    return db.query(models.User).filter(models.User.role == RoleEnum.admin).all()


@app.get("/")
def root():
    return {
        "service": "Smart Maintenance Request & Escalation System",
        "status": "running",
        "docs": "/docs",
    }
