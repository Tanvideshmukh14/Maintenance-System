# Smart Maintenance Request & Escalation System — Backend

FastAPI backend for the hackathon problem statement. Covers:

- JWT-based **register / login** (`app/auth.py`)
- Employee **maintenance request** APIs (submit, view own, view one)
- Admin **ticket management** panel (view all, assign technician, update status)

**Not included (by design):** automatic escalation logic (timers / auto-flagging).
The `status` field does support an `Escalated` value, and an admin can set it manually
via the status-update endpoint — but nothing escalates a ticket on its own.

Tech: Python 3.11, FastAPI, SQLAlchemy, MySQL (`pymysql` driver), JWT (`python-jose`),
password hashing via `passlib[bcrypt]`.

## Project structure

```
maintenance-backend/
├── app/
│   ├── main.py           # FastAPI app, CORS, router registration
│   ├── config.py         # Settings loaded from .env
│   ├── database.py       # SQLAlchemy engine/session/Base
│   ├── models.py         # User, MaintenanceRequest ORM models
│   ├── schemas.py        # Pydantic request/response schemas
│   ├── auth.py           # Password hashing, JWT, auth dependencies, /auth routes
│   └── routers/
│       ├── requests.py   # /requests — employee endpoints
│       └── admin.py      # /admin — admin panel endpoints
├── requirements.txt
├── .env.example
└── README.md
```

## 1. Setup

```bash
cd maintenance-backend
python3.11 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create the MySQL database once:

```sql
CREATE DATABASE maintenance_db;
```

Copy the env file and fill in your MySQL credentials + a secret key:

```bash
cp .env.example .env
```

## 2. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Tables are auto-created on startup via `Base.metadata.create_all()`. Swagger docs:
`http://localhost:8000/docs`

## 3. API Reference

### Auth (`app/auth.py`) — public except `/auth/me`

| Method | Path            | Description                                  |
|--------|-----------------|-----------------------------------------------|
| POST   | `/auth/register`| Create a user (`role`: `employee` or `admin`) |
| POST   | `/auth/login`   | Get a JWT access token                        |
| GET    | `/auth/me`      | Current logged-in user (needs Bearer token)   |

**Register/Login response:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Tanvi", "email": "t@x.com", "role": "employee", "created_at": "..." }
}
```

All protected routes expect header: `Authorization: Bearer <access_token>`

### Employee — Maintenance Requests (`app/routers/requests.py`)

| Method | Path              | Auth     | Description                     |
|--------|-------------------|----------|----------------------------------|
| POST   | `/requests/`      | employee | Raise a new request              |
| GET    | `/requests/`      | employee | List my own requests             |
| GET    | `/requests/{id}`  | employee/admin | View one request's details |

### Admin Panel (`app/routers/admin.py`)

| Method | Path                                | Auth  | Description                        |
|--------|--------------------------------------|-------|-------------------------------------|
| GET    | `/admin/requests`                   | admin | View all requests                   |
| GET    | `/admin/requests/{id}`              | admin | View one request                    |
| PUT    | `/admin/requests/{id}/status`       | admin | Update status (manual, no automation)|
| PUT    | `/admin/requests/{id}/assign`       | admin | Assign a technician (user id)       |
| GET    | `/admin/users`                      | admin | List all users                      |

## 4. Example: React + Axios

```js
// api.js
import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

```js
// login
const { data } = await api.post("/auth/login", { email, password });
localStorage.setItem("token", data.access_token);

// create a request
await api.post("/requests/", {
  title: "AC not working",
  description: "Cabin 3 AC unit is dead",
  category: "Facilities",
});

// admin: update status
await api.put(`/admin/requests/${id}/status`, { status: "Resolved" });
```

## Notes / next steps

- `role` is accepted at `/auth/register` for hackathon convenience so you can quickly
  create an admin account for testing. In a real deployment, admin creation should be
  locked down (invite-only, or promoted by an existing admin) — registration is currently open for demo purposes.
- Escalation automation (timers / auto-flagging unresolved tickets) is intentionally
  left out, as requested.
- Passwords are hashed with bcrypt; never stored in plaintext.
