# Smart Maintenance — Request & Escalation System

Frontend-only implementation for the Smart Maintenance Request & Escalation System hackathon project.

## Quick Start

```bash
npm install
npm run dev
```

App runs at **http://localhost:5173/**

---

## Mock Login Credentials

| Role     | Email                | Password    |
|----------|----------------------|-------------|
| Employee | john@example.com     | password123 |
| Admin    | admin@example.com    | admin123    |

> Or use the **"Fill Employee"** / **"Fill Admin"** quick-fill buttons on the login page.

---

## Routes

| Route                     | Description                          |
|---------------------------|--------------------------------------|
| `/login`                  | Login page (default)                 |
| `/employee/dashboard`     | Employee dashboard                   |
| `/employee/request/:id`   | Employee request details             |
| `/admin/dashboard`        | Admin dashboard                      |
| `/admin/request/:id`      | Admin request details                |

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.tsx          # Sticky header, user dropdown, logout
│   ├── StatusBadge.tsx     # Color-coded status chips
│   ├── RequestCard.tsx     # Clickable request list item
│   ├── RequestForm.tsx     # Modal form for raising requests
│   ├── LoadingSpinner.tsx  # Spinner (inline/block/fullpage)
│   └── EmptyState.tsx      # Empty list placeholder
│
├── pages/
│   ├── Login.tsx           # /login
│   ├── EmployeeDashboard.tsx  # /employee/dashboard
│   ├── AdminDashboard.tsx  # /admin/dashboard
│   └── RequestDetails.tsx  # /*/request/:id
│
├── services/
│   └── api.ts              # Mock API layer (swap for real fetch later)
│
├── types/
│   └── index.ts            # TypeScript interfaces
│
├── data/
│   └── mockData.ts         # Sample request data
│
├── App.tsx                 # Router
└── index.css               # Tailwind + global styles
```

---

## Connecting the Real Backend

All API calls are isolated in `src/services/api.ts`.

Each function has the real `fetch()` implementation commented below the mock:

| Frontend Function    | Real Endpoint                  |
|---------------------|-------------------------------|
| `loginUser()`        | `POST /auth/login`            |
| `createRequest()`    | `POST /requests`              |
| `getMyRequests()`    | `GET  /requests/me`           |
| `getRequestById()`   | `GET  /requests/{id}`         |
| `getAllRequests()`    | `GET  /admin/requests`        |
| `updateRequestStatus()` | `PATCH /admin/requests/{id}/status` |

To connect:
1. Set `VITE_API_URL=http://your-backend-url` in `.env`
2. In each function in `api.ts`, uncomment the real fetch block and delete the mock block.

---

## Features

### Employee
- Login with email/password
- Dashboard with status stats (Pending / In Progress / Resolved / Escalated)
- Raise new maintenance request (modal form)
- Filter requests by status
- Click any request to view full details
- Status timeline visualization
- Escalation banner with reason on escalated requests
- Logout

### Admin
- Login as admin → redirected to admin dashboard
- View all employee requests
- Search by title, employee name, or category
- Escalation alert banner with count
- Manage button (hover) → update status / assign technician
- View request details
- Logout
