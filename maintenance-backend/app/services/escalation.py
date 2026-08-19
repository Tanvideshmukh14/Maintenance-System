from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app import models


ESCALATION_THRESHOLD_MINUTES = 2
ESCALATION_REASON = "SLA breach"

ACTIVE_STATUSES = {
    models.RequestStatus.pending,
    models.RequestStatus.in_progress,
    models.RequestStatus.pending.value,
    models.RequestStatus.in_progress.value,
}


def _as_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _get_existing_escalation_log(request: Any, db: Session) -> Optional[Any]:
    escalation_log_model = getattr(models, "EscalationLog", None)
    if escalation_log_model is None:
        return None

    query = db.query(escalation_log_model)

    if hasattr(escalation_log_model, "request_id"):
        query = query.filter(escalation_log_model.request_id == request.id)

    if hasattr(escalation_log_model, "reason"):
        query = query.filter(escalation_log_model.reason == ESCALATION_REASON)

    return query.first()


def _create_escalation_log(request: Any, db: Session) -> None:
    escalation_log_model = getattr(models, "EscalationLog", None)
    if escalation_log_model is None or _get_existing_escalation_log(request, db):
        return

    log_data = {}
    if hasattr(escalation_log_model, "request_id"):
        log_data["request_id"] = request.id
    if hasattr(escalation_log_model, "reason"):
        log_data["reason"] = ESCALATION_REASON

    db.add(escalation_log_model(**log_data))


def check_and_escalate_request(request: Any, db: Session) -> Any:
    """
    Escalate a pending or in-progress request when it has breached the demo SLA.
    """
    if request.status not in ACTIVE_STATUSES:
        return request

    created_at = getattr(request, "created_at", None)
    if created_at is None:
        return request

    now = datetime.now(timezone.utc)
    elapsed_time = now - _as_utc_datetime(created_at)

    if elapsed_time.total_seconds() < ESCALATION_THRESHOLD_MINUTES * 60:
        return request

    request.status = models.RequestStatus.escalated

    if hasattr(request, "escalated_at"):
        request.escalated_at = now

    _create_escalation_log(request, db)

    db.add(request)
    db.commit()
    db.refresh(request)

    return request
