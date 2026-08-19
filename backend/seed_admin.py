"""Seeds development data: 1 admin, 2 employees, and a handful of
maintenance requests covering different categories/priorities/statuses,
including an escalated one with escalation history.

    cd backend
    venv\\Scripts\\python -m alembic upgrade head   # schema must exist first
    venv\\Scripts\\python seed_admin.py

Passwords are always hashed via the app's own auth.hash_password(), the
same function used at login time -- nothing plaintext is ever written to
the database. Re-running this script is safe: each user/request is
looked up by a stable natural key (email / title) first and skipped if
it already exists, so it won't create duplicates.
"""
from app.database import SessionLocal
from app import models, auth
from app.enums import CategoryEnum, PriorityEnum, RoleEnum, StatusEnum

SEED_PASSWORD = "ChangeMe123!"


def get_or_create_user(db, *, name, email, role, department=None):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return user, False
    user = models.User(
        name=name,
        email=email,
        hashed_password=auth.hash_password(SEED_PASSWORD),
        role=role,
        department=department,
    )
    db.add(user)
    db.flush()
    return user, True


def get_or_create_request(db, *, employee, title, **fields):
    req = (
        db.query(models.MaintenanceRequest)
        .filter(
            models.MaintenanceRequest.employee_id == employee.id,
            models.MaintenanceRequest.title == title,
        )
        .first()
    )
    if req:
        return req, False
    req = models.MaintenanceRequest(employee_id=employee.id, title=title, **fields)
    db.add(req)
    db.flush()
    return req, True


def main():
    db = SessionLocal()
    try:
        admin, admin_new = get_or_create_user(
            db,
            name="System Admin",
            email="admin@trulia-care.dev",
            role=RoleEnum.admin,
            department="Facilities Management",
        )
        emp1, emp1_new = get_or_create_user(
            db,
            name="Asha Patel",
            email="asha.patel@trulia-care.dev",
            role=RoleEnum.employee,
            department="Operations",
        )
        emp2, emp2_new = get_or_create_user(
            db,
            name="Marcus Lee",
            email="marcus.lee@trulia-care.dev",
            role=RoleEnum.employee,
            department="IT",
        )
        db.commit()

        req_pending, r1_new = get_or_create_request(
            db,
            employee=emp1,
            title="Flickering lights in break room",
            description="Overhead lights in the 2nd floor break room flicker every few minutes.",
            category=CategoryEnum.Facilities,
            priority=PriorityEnum.Medium,
        )

        req_in_progress, r2_new = get_or_create_request(
            db,
            employee=emp2,
            title="VPN drops every 30 minutes",
            description="Company VPN client disconnects roughly every half hour on Windows laptops.",
            category=CategoryEnum.IT,
            priority=PriorityEnum.High,
            status=StatusEnum.InProgress,
            assigned_to=admin.id,
        )

        req_escalated, r3_new = get_or_create_request(
            db,
            employee=emp1,
            title="Server room AC failure",
            description="Server room temperature has exceeded threshold for 2 hours.",
            category=CategoryEnum.Infrastructure,
            priority=PriorityEnum.High,
            status=StatusEnum.Escalated,
            assigned_to=admin.id,
            escalation_level=1,
        )
        db.commit()

        if r3_new:
            db.add(
                models.EscalationLog(
                    request_id=req_escalated.id,
                    escalated_from=StatusEnum.InProgress.value,
                    escalated_to=StatusEnum.Escalated.value,
                    reason="No response from facilities vendor within SLA window (2 hours).",
                )
            )

        req_resolved, r4_new = get_or_create_request(
            db,
            employee=emp2,
            title="Replace broken keyboard",
            description="Keyboard on desk IT-14 has several unresponsive keys.",
            category=CategoryEnum.Other,
            priority=PriorityEnum.Low,
            status=StatusEnum.Resolved,
            assigned_to=admin.id,
        )
        if r4_new:
            from datetime import datetime, timezone

            req_resolved.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)

        db.commit()

        created = [
            n
            for n, is_new in [
                ("admin@trulia-care.dev", admin_new),
                ("asha.patel@trulia-care.dev", emp1_new),
                ("marcus.lee@trulia-care.dev", emp2_new),
                (req_pending.title, r1_new),
                (req_in_progress.title, r2_new),
                (req_escalated.title, r3_new),
                (req_resolved.title, r4_new),
            ]
            if is_new
        ]
        if created:
            print("Seeded:")
            for name in created:
                print(f"  - {name}")
        else:
            print("Seed data already present -- nothing new created.")
        print(f"\nDev login password for all seeded accounts: {SEED_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
