from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get("/requests", response_model=List[schemas.RequestOut])
def list_all_requests(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Admin/facility manager views every maintenance request in the system."""
    return (
        db.query(models.MaintenanceRequest)
        .order_by(models.MaintenanceRequest.created_at.desc())
        .all()
    )


@router.get("/requests/{request_id}", response_model=schemas.RequestOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    req = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req


@router.put("/requests/{request_id}/status", response_model=schemas.RequestOut)
def update_status(
    request_id: int,
    payload: schemas.RequestStatusUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Admin manually updates a request's status (Pending / In Progress / Resolved / Escalated)."""
    req = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = payload.status
    db.commit()
    db.refresh(req)
    return req


@router.put("/requests/{request_id}/assign", response_model=schemas.RequestOut)
def assign_technician(
    request_id: int,
    payload: schemas.RequestAssign,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Admin assigns a technician (an existing user) to a request."""
    req = db.query(models.MaintenanceRequest).filter(
        models.MaintenanceRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    technician = db.query(models.User).filter(models.User.id == payload.technician_id).first()
    if not technician:
        raise HTTPException(status_code=404, detail="Technician (user) not found")

    req.assigned_technician_id = technician.id
    if req.status == models.RequestStatus.pending:
        req.status = models.RequestStatus.in_progress
    db.commit()
    db.refresh(req)
    return req


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Admin views all registered users (employees/technicians)."""
    return db.query(models.User).all()
