from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/requests", tags=["Maintenance Requests"])


@router.post("/", response_model=schemas.RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    request_in: schemas.RequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Employee raises a new maintenance request."""
    new_request = models.MaintenanceRequest(
        title=request_in.title,
        description=request_in.description,
        category=request_in.category,
        employee_id=current_user.id,
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request


@router.get("/", response_model=List[schemas.RequestOut])
def list_my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Employee views all of their own submitted requests."""
    return (
        db.query(models.MaintenanceRequest)
        .filter(models.MaintenanceRequest.employee_id == current_user.id)
        .order_by(models.MaintenanceRequest.created_at.desc())
        .all()
    )


@router.get("/{request_id}", response_model=schemas.RequestOut)
def get_my_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Employee (or admin) views a single request's status/details."""
    req = (
        db.query(models.MaintenanceRequest)
        .filter(models.MaintenanceRequest.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.employee_id != current_user.id and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return req
