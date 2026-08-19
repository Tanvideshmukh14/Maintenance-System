from sqlalchemy.exc import IntegrityError

from app import models
from app.enums import CategoryEnum, PriorityEnum, RoleEnum, StatusEnum


def _make_user(db, email, role=RoleEnum.employee, name="Test User"):
    user = models.User(
        name=name,
        email=email,
        hashed_password="hashed-not-plaintext",
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def test_create_user_and_duplicate_email_rejected(db):
    _make_user(db, "dup@example.com")
    db.flush()

    dupe = models.User(
        name="Someone Else",
        email="dup@example.com",
        hashed_password="x",
        role=RoleEnum.employee,
    )
    db.add(dupe)
    try:
        db.flush()
        assert False, "duplicate email should have been rejected"
    except IntegrityError:
        db.rollback()


def test_request_lifecycle_and_relationships(db):
    employee = _make_user(db, "employee@example.com", name="Employee One")
    assignee = _make_user(db, "assignee@example.com", role=RoleEnum.admin, name="Admin One")

    req = models.MaintenanceRequest(
        employee_id=employee.id,
        title="Broken AC",
        description="AC unit not cooling",
        category=CategoryEnum.Facilities,
        priority=PriorityEnum.High,
    )
    db.add(req)
    db.flush()

    # defaults applied
    assert req.status == StatusEnum.Pending
    assert req.escalation_level == 0
    assert req.created_at is not None
    assert req.updated_at is not None

    # assignment + relationship loading
    req.assigned_to = assignee.id
    db.flush()
    db.refresh(req)
    assert req.employee.id == employee.id
    assert req.assignee.id == assignee.id
    assert req.id in [r.id for r in employee.requests]
    assert req.id in [r.id for r in assignee.assigned_requests]

    # escalation log creation + retrieval through the request
    log = models.EscalationLog(
        request_id=req.id,
        escalated_from=StatusEnum.Pending.value,
        escalated_to=StatusEnum.Escalated.value,
        reason="SLA breached",
    )
    db.add(log)
    req.status = StatusEnum.Escalated
    req.escalation_level += 1
    db.flush()
    db.refresh(req)
    assert len(req.logs) == 1
    assert req.logs[0].reason == "SLA breached"

    # status update -> resolve -> resolved_at populated
    from datetime import datetime, timezone

    req.status = StatusEnum.Resolved
    req.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.flush()
    db.refresh(req)
    assert req.status == StatusEnum.Resolved
    assert req.resolved_at is not None

    # delete request -> escalation logs cascade-deleted
    request_id = req.id
    db.delete(req)
    db.flush()
    remaining = (
        db.query(models.EscalationLog)
        .filter(models.EscalationLog.request_id == request_id)
        .all()
    )
    assert remaining == []


def test_assignee_delete_sets_null_not_cascade(db):
    employee = _make_user(db, "owner@example.com")
    assignee = _make_user(db, "temp-assignee@example.com", role=RoleEnum.admin)

    req = models.MaintenanceRequest(
        employee_id=employee.id,
        title="Printer jam",
        description="Printer on 3rd floor jammed",
        assigned_to=assignee.id,
    )
    db.add(req)
    db.flush()

    db.delete(assignee)
    db.flush()
    db.refresh(req)
    assert req.assigned_to is None
    # the request itself must still exist
    assert db.get(models.MaintenanceRequest, req.id) is not None


def test_employee_delete_restricted_when_requests_exist(db):
    employee = _make_user(db, "restricted-owner@example.com")
    req = models.MaintenanceRequest(
        employee_id=employee.id,
        title="Leaky faucet",
        description="Break room sink is leaking",
    )
    db.add(req)
    db.flush()

    db.delete(employee)
    try:
        db.flush()
        assert False, "deleting a user who owns requests should be RESTRICTed"
    except IntegrityError:
        db.rollback()


def test_invalid_foreign_keys_rejected(db):
    bad_request = models.MaintenanceRequest(
        employee_id=999_999_999,
        title="Ghost request",
        description="employee_id does not exist",
    )
    db.add(bad_request)
    try:
        db.flush()
        assert False, "nonexistent employee_id should be rejected"
    except IntegrityError:
        db.rollback()

    employee = _make_user(db, "fk-owner@example.com")
    db.flush()
    bad_log = models.EscalationLog(
        request_id=999_999_999,
        reason="request_id does not exist",
    )
    db.add(bad_log)
    try:
        db.flush()
        assert False, "nonexistent request_id should be rejected"
    except IntegrityError:
        db.rollback()
