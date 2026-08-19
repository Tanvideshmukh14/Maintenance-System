# Database Quick Reference

Full detail: [`database-contract.md`](./database-contract.md) · Diagram: [`database-erd.md`](./database-erd.md)

## Tables

- `users` — `id, name, email, hashed_password, role, department, created_at`
- `maintenance_requests` — `id, employee_id, title, description, category, priority, status, assigned_to, escalation_level, created_at, updated_at, resolved_at`
- `escalation_logs` — `id, request_id, escalated_from, escalated_to, reason, escalated_at`

## Relationships

- `maintenance_requests.employee_id → users.id` — who **owns** the request
- `maintenance_requests.assigned_to → users.id` — who it's **assigned to** (nullable)
- `escalation_logs.request_id → maintenance_requests.id` — escalation history for that request

`employee_id` and `assigned_to` both point at `users.id` but mean different things — never treat them as the same column.

## Enum values (exact strings — SmartEnum, `app/enums.py`)

- **role**: `employee`, `admin`
- **category**: `IT`, `Facilities`, `Infrastructure`, `Other`
- **priority**: `Low`, `Medium`, `High`
- **status**: `Pending`, `In Progress`, `Resolved`, `Escalated` (note the space in `"In Progress"`)

## Important foreign keys

| FK | On delete |
|---|---|
| `employee_id → users.id` | RESTRICT (blocks the delete) |
| `assigned_to → users.id` | SET NULL (unassigns) |
| `request_id → maintenance_requests.id` | CASCADE (deletes logs too) |

## Important indexes

- `users.email` — unique, login lookups
- `maintenance_requests.status` — admin filtering
- `maintenance_requests.created_at` — list ordering
- `escalation_logs.request_id` — history lookup (also FK-backed)
- `employee_id`, `assigned_to` — no explicit index needed; InnoDB auto-indexes FK columns

## Important rules

1. Import `app.models` / `app.database.get_db` — don't create new models, Base, engine, or session factory.
2. Never call `Base.metadata.create_all()` — schema comes from Alembic only.
3. Never write raw DDL from route code.
4. Use the SmartEnum values above exactly — don't invent new ones.
5. Don't store employee/assignee **names** on `maintenance_requests` — join through `users`.
6. All escalation events go through `EscalationLog` — no ad-hoc history rows.
7. Schema changes = new Alembic migration, reviewed with Shlok first.
