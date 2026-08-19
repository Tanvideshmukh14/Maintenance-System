# Database Contract — Smart Maintenance Request & Escalation System

**Status: FROZEN.** This document describes the database exactly as implemented and verified (live MySQL `SHOW CREATE TABLE`, Alembic migration `38d634b582a0`, and `app/models.py`/`app/enums.py`). It is not a proposal — it is what exists. Backend developers (Tanvi, Chetan, Mohit) should build against this contract without redesigning it. Schema changes go through Shlok + Alembic (see [Rules for Other Backend Developers](#rules-for-other-backend-developers)).

Source of truth, in order: **live database schema** (via Alembic migrations) → `app/models.py` / `app/enums.py` → this document. If this document and the code ever disagree, the code wins and this document is out of date — flag it, don't guess.

---

## Table: `users`

| Column | Type | Nullable | Default | Key |
|---|---|---|---|---|
| `id` | `INT` (auto-increment) | NO | — | **PRIMARY KEY** |
| `name` | `VARCHAR(120)` | NO | — | |
| `email` | `VARCHAR(150)` | NO | — | **UNIQUE**, indexed (`ix_users_email`) |
| `hashed_password` | `VARCHAR(255)` | NO | — | bcrypt hash; never plaintext |
| `role` | `ENUM('employee','admin')` | NO | `'employee'` | SmartEnum `RoleEnum` |
| `department` | `VARCHAR(100)` | YES | `NULL` | |
| `created_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP` (server-generated) | |

No unique constraints besides `email`. No foreign keys (this is the root table).

---

## Table: `maintenance_requests`

| Column | Type | Nullable | Default | Key |
|---|---|---|---|---|
| `id` | `INT` (auto-increment) | NO | — | **PRIMARY KEY** |
| `employee_id` | `INT` | NO | — | **FOREIGN KEY** → `users.id`, `ON DELETE RESTRICT` |
| `title` | `VARCHAR(150)` | NO | — | |
| `description` | `TEXT` | NO | — | |
| `category` | `ENUM('IT','Facilities','Infrastructure','Other')` | NO | `'Other'` | SmartEnum `CategoryEnum` |
| `priority` | `ENUM('Low','Medium','High')` | NO | `'Medium'` | SmartEnum `PriorityEnum` |
| `status` | `ENUM('Pending','In Progress','Resolved','Escalated')` | NO | `'Pending'` | SmartEnum `StatusEnum`; indexed (`ix_requests_status`) |
| `assigned_to` | `INT` | YES | `NULL` | **FOREIGN KEY** → `users.id`, `ON DELETE SET NULL` |
| `escalation_level` | `INT` | NO | `0` | plain integer counter, incremented on each escalation |
| `created_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP` (server-generated) | indexed (`ix_requests_created_at`) |
| `updated_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (server-generated, auto-updates on every UPDATE) | |
| `resolved_at` | `DATETIME` | YES | `NULL` | set explicitly by application code only when `status` transitions to `Resolved` |

**Important:** `employee_id` and `assigned_to` are two independent foreign keys to the same `users.id` column, representing two different business relationships — see [Relationships](#relationships) below. Do not confuse them or collapse them into one column.

There are no columns for `employee_name` or `assignee_name` on this table — names are never stored here (see [Rules](#rules-for-other-backend-developers) #9).

---

## Table: `escalation_logs`

| Column | Type | Nullable | Default | Key |
|---|---|---|---|---|
| `id` | `INT` (auto-increment) | NO | — | **PRIMARY KEY** |
| `request_id` | `INT` | NO | — | **FOREIGN KEY** → `maintenance_requests.id`, `ON DELETE CASCADE`; indexed (`ix_escalation_logs_request_id`) |
| `escalated_from` | `VARCHAR(100)` | YES | `NULL` | free text (typically the prior status value) |
| `escalated_to` | `VARCHAR(100)` | YES | `NULL` | free text (target status/owner, caller-supplied) |
| `reason` | `VARCHAR(255)` | NO | — | why the escalation happened |
| `escalated_at` | `DATETIME` | NO | `CURRENT_TIMESTAMP` (server-generated) | |

`escalated_from`/`escalated_to` are plain strings, not foreign keys and not SmartEnum-typed columns — they're a free-text snapshot of the transition, not a constrained reference.

---

## Relationships

```
users (1) ──< maintenance_requests.employee_id   (one user OWNS many requests)
users (1) ──< maintenance_requests.assigned_to    (one user is ASSIGNED many requests, nullable)
maintenance_requests (1) ──< escalation_logs.request_id  (one request HAS many escalation log rows)
```

| SQLAlchemy relationship | Direction | Notes |
|---|---|---|
| `User.requests` | `User` → `MaintenanceRequest[]` | via `employee_id` |
| `User.assigned_requests` | `User` → `MaintenanceRequest[]` | via `assigned_to` |
| `MaintenanceRequest.employee` | `MaintenanceRequest` → `User` | via `employee_id` |
| `MaintenanceRequest.assignee` | `MaintenanceRequest` → `User` | via `assigned_to`, nullable |
| `MaintenanceRequest.logs` | `MaintenanceRequest` → `EscalationLog[]` | `cascade="all, delete-orphan"`, ordered by `escalated_at` |
| `EscalationLog.request` | `EscalationLog` → `MaintenanceRequest` | via `request_id` |

`employee_id` and `assigned_to` both reference `users.id`, but they are disambiguated in code with `foreign_keys=` on each `relationship()` call — SQLAlchemy cannot infer which FK backs which relationship on its own when two FKs point at the same table.

---

## Delete behavior

| Foreign key | `ON DELETE` | Effect |
|---|---|---|
| `maintenance_requests.employee_id → users.id` | **RESTRICT** | Deleting a user who owns any request is **rejected** by the database. History is never silently lost. |
| `maintenance_requests.assigned_to → users.id` | **SET NULL** | Deleting an assigned user un-assigns their requests (`assigned_to` becomes `NULL`); the request itself is untouched. |
| `escalation_logs.request_id → maintenance_requests.id` | **CASCADE** | Deleting a request deletes all of its escalation log rows. Also enforced at the ORM level via `cascade="all, delete-orphan"` on `MaintenanceRequest.logs`. |

---

## Indexes

| Index | Column(s) | Type |
|---|---|---|
| `ix_users_email` | `users.email` | UNIQUE |
| `ix_requests_status` | `maintenance_requests.status` | non-unique |
| `ix_requests_created_at` | `maintenance_requests.created_at` | non-unique |
| `ix_escalation_logs_request_id` | `escalation_logs.request_id` | non-unique (also FK-backed) |
| *(implicit, FK-backed)* | `maintenance_requests.employee_id` | InnoDB auto-index |
| *(implicit, FK-backed)* | `maintenance_requests.assigned_to` | InnoDB auto-index |

---

## SmartEnum values

Enums live in `app/enums.py`, built on a shared `SmartEnum` base (not plain `enum.Enum`) that guarantees the **value string** — not the Python member name — is what's persisted to MySQL and what's serialized over the API. Use `EnumClass.value` or the enum member itself (both work, since `SmartEnum` inherits from `str`) but never invent a value outside this list.

| Enum | Column | Values (exact strings) |
|---|---|---|
| `RoleEnum` | `users.role` | `employee`, `admin` |
| `CategoryEnum` | `maintenance_requests.category` | `IT`, `Facilities`, `Infrastructure`, `Other` |
| `PriorityEnum` | `maintenance_requests.priority` | `Low`, `Medium`, `High` |
| `StatusEnum` | `maintenance_requests.status` | `Pending`, `In Progress`, `Resolved`, `Escalated` |

Note `StatusEnum.InProgress` (Python member name) has value `"In Progress"` (with a space) — that's the string stored in MySQL and expected in the API. Never send `"InProgress"`.

---

## Timestamp behavior

**Single rule: every timestamp is generated by MySQL (`server_default`), never by Python's `datetime.utcnow()`.** This holds regardless of whether a row is written through the ORM, a migration, a seed script, or raw SQL.

| Column | Table | Behavior |
|---|---|---|
| `created_at` | `users`, `maintenance_requests` | Set once, server-side, at `INSERT` time (`CURRENT_TIMESTAMP`). |
| `updated_at` | `maintenance_requests` | Set at `INSERT`, then **automatically updated by MySQL** (`ON UPDATE CURRENT_TIMESTAMP`) on every subsequent `UPDATE` to the row — the application never sets this column manually. |
| `resolved_at` | `maintenance_requests` | The one exception: `NULL` by default, no column default. Set explicitly by application code, only when `status` transitions to `Resolved`. |
| `escalated_at` | `escalation_logs` | Set once, server-side, at `INSERT` time. |

The dev MySQL instance's session/global `time_zone` is pinned to `+00:00` so server-generated values are UTC, matching the one Python-generated exception (`resolved_at`, set via `datetime.now(timezone.utc)`).

---

## Request lifecycle

The intended `status` progression for a `maintenance_requests` row:

```
Pending → In Progress → Resolved
```

with a parallel escalation path available from either open state:

```
Pending / In Progress → Escalated
```

Escalation is a **state transition on the request**, not a separate workflow: `maintenance_requests.status` moves to `Escalated` and `escalation_level` increments, while `escalation_logs` preserves the **historical event** (who/what it escalated from, to, and why, with its own timestamp) so that record survives even after the request later moves on (e.g., an escalated request can still be worked and eventually `Resolved` — the `escalation_logs` rows already written are not modified or deleted by that later transition, they document that the escalation happened).

This document does not define new transition rules or additional escalation logic beyond what's already implemented in `POST /requests/{id}/escalate` and `PATCH /requests/{id}` (`app/main.py`) — it describes the lifecycle as currently built.

---

## API ↔ Database mapping

This describes how existing/expected API routes interact with the schema above. It does not define new routes or change route behavior — see `app/main.py` for the actual implementation.

| Route | DB interaction |
|---|---|
| `POST /requests` | `INSERT INTO maintenance_requests (employee_id, title, description, category, priority, status, ...)` — `employee_id` comes from the authenticated user (`current_user.id`), never from the request body. `status` defaults to `Pending`. `created_at`/`updated_at` are server-generated. |
| `GET /requests/my` | `SELECT * FROM maintenance_requests WHERE employee_id = :authenticated_user_id ORDER BY created_at DESC` |
| `GET /requests` | Admin-only. `SELECT * FROM maintenance_requests [WHERE status = :status_filter] ORDER BY created_at DESC` — returns requests across all employees. |
| `GET /requests/{id}` | `SELECT * FROM maintenance_requests WHERE id = :id`, then authorization check: admin, or `employee_id == authenticated_user_id`. |
| `PATCH /requests/{id}` | Admin-only. Updates `status`, `assigned_to`, and/or `priority` on one row. If `status` is set to `Resolved`, `resolved_at` is also set (application-side, UTC). `updated_at` is never set manually — MySQL's `ON UPDATE CURRENT_TIMESTAMP` handles it for any UPDATE that touches the row. Setting `assigned_to` validates the target user exists first (FK would reject it anyway, but the route returns a clean 404 instead of a DB error). |
| `POST /requests/{id}/escalate` | Admin-only. `INSERT INTO escalation_logs (request_id, escalated_from, escalated_to, reason)` recording the current status as `escalated_from`, then updates the same `maintenance_requests` row: `status = Escalated`, `escalation_level += 1`. Both writes happen in one transaction (single `db.commit()`). |
| `GET /technicians` | Admin-only. `SELECT * FROM users WHERE role = 'admin'` — used to populate an assignment picker. |
| `POST /auth/register`, `POST /auth/login[-json]` | `INSERT`/`SELECT` against `users`. Passwords are hashed with `auth.hash_password()` before insert; never stored or compared as plaintext. |

---

## Rules for Other Backend Developers

1. Do not create duplicate SQLAlchemy models. `User`, `MaintenanceRequest`, `EscalationLog` already exist in `app/models.py` — import them.
2. Import the existing models — `from app import models` (or `from app.models import User, MaintenanceRequest, EscalationLog`).
3. Do not create a second SQLAlchemy `Base`. There is exactly one, in `app/database.py`.
4. Do not create a second database engine. `app/database.py` defines the one `engine` and `SessionLocal`.
5. Use the existing `get_db` dependency (`app/database.py`) for all route DB access.
6. Do not use `Base.metadata.create_all()`. Schema is managed entirely by Alembic migrations.
7. Do not modify database tables directly through route code (no raw `ALTER TABLE`, no ad-hoc DDL in application code).
8. Use the existing SmartEnum values exactly as listed above — do not invent new category/priority/status strings.
9. Do not store employee/assignee names in `maintenance_requests`. Names are joined from `users` via the `employee`/`assignee` relationships at the API layer (see `main.py::_to_request_out`).
10. Use `employee_id` and `assigned_to` as foreign keys for ownership/assignment — never a free-text name column.
11. Do not manually create escalation history rows outside the `EscalationLog` model. Every escalation event must go through it so `request_id`'s FK/cascade guarantees hold.
12. Do not bypass database constraints (e.g., don't catch and silently ignore `IntegrityError`s from FK/unique violations — they're telling you something real).
13. Do not change column names without discussing it with Shlok first.
14. Do not add a new database table without team approval.
15. Schema changes must go through Alembic (`alembic revision --autogenerate`, review the generated migration, `alembic upgrade head`) — never hand-edit the live database.
