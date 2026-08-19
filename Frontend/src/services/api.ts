import type {
  LoginPayload,
  LoginResponse,
  MaintenanceRequest,
  CreateRequestPayload,
  RequestStatus,
} from '../types';
import { MOCK_EMPLOYEE_REQUESTS, MOCK_ALL_REQUESTS } from '../data/mockData';

// ─── In-memory store (simulates DB for mock mode) ─────────────────────────
let employeeRequestsStore: MaintenanceRequest[] = [...MOCK_EMPLOYEE_REQUESTS];
let allRequestsStore: MaintenanceRequest[] = [...MOCK_ALL_REQUESTS];
let nextId = 200;

const MOCK_DELAY = 600; // ms — simulates network latency
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ─── Shared helpers ─────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token');

// Uncomment and replace the mock bodies below to connect to real API:
// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Authenticates a user and returns a user object + token.
 */
export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  await delay(MOCK_DELAY);

  // -- Mock credentials --
  const mockCredentials: Record<string, { password: string; user: LoginResponse['user'] }> = {
    'john@example.com': {
      password: 'password123',
      user: { userId: 1, name: 'John Doe', email: 'john@example.com', role: 'employee' },
    },
    'admin@example.com': {
      password: 'admin123',
      user: { userId: 99, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
    },
  };

  const match = mockCredentials[payload.email.toLowerCase()];
  if (!match || match.password !== payload.password) {
    throw new Error('Invalid email or password. Please try again.');
  }

  return { user: match.user, token: `mock-jwt-token-${match.user.userId}` };

  /* ── Real implementation (replace mock above):
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
  return res.json();
  */
}

// ─── Employee Requests ────────────────────────────────────────────────────────

/**
 * POST /requests
 * Creates a new maintenance request.
 */
export async function createRequest(
  payload: CreateRequestPayload,
  employeeName: string
): Promise<MaintenanceRequest> {
  await delay(MOCK_DELAY);
  void getToken(); // placeholder — attach to headers in real impl

  const newRequest: MaintenanceRequest = {
    id: nextId++,
    ...payload,
    status: 'Pending',
    assigned_to: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    employee_id: 1,
    employee_name: employeeName,
  };

  employeeRequestsStore = [newRequest, ...employeeRequestsStore];
  allRequestsStore = [newRequest, ...allRequestsStore];
  return newRequest;

  /* ── Real implementation:
  const res = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create request');
  return res.json();
  */
}

/**
 * GET /requests/me
 * Returns all requests submitted by the current employee.
 */
export async function getMyRequests(): Promise<MaintenanceRequest[]> {
  await delay(MOCK_DELAY);
  return [...employeeRequestsStore];

  /* ── Real implementation:
  const res = await fetch(`${BASE_URL}/requests/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch requests');
  return res.json();
  */
}

/**
 * GET /requests/:id
 * Returns a single request by ID.
 */
export async function getRequestById(id: number): Promise<MaintenanceRequest> {
  await delay(MOCK_DELAY);

  const request = [...employeeRequestsStore, ...allRequestsStore].find((r) => r.id === id);
  if (!request) throw new Error(`Request #${id} not found.`);
  return request;

  /* ── Real implementation:
  const res = await fetch(`${BASE_URL}/requests/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Request not found');
  return res.json();
  */
}

// ─── Admin Requests ────────────────────────────────────────────────────────────

/**
 * GET /admin/requests
 * Returns all requests (admin only).
 */
export async function getAllRequests(): Promise<MaintenanceRequest[]> {
  await delay(MOCK_DELAY);
  return [...allRequestsStore];

  /* ── Real implementation:
  const res = await fetch(`${BASE_URL}/admin/requests`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch all requests');
  return res.json();
  */
}

/**
 * PATCH /admin/requests/:id/status
 * Updates the status of a request (admin only).
 */
export async function updateRequestStatus(
  id: number,
  status: RequestStatus,
  assigned_to?: string
): Promise<MaintenanceRequest> {
  await delay(MOCK_DELAY);

  const idx = allRequestsStore.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Request #${id} not found`);

  allRequestsStore[idx] = {
    ...allRequestsStore[idx],
    status,
    updated_at: new Date().toISOString(),
    ...(assigned_to !== undefined ? { assigned_to } : {}),
  };

  // Also sync employee store
  const empIdx = employeeRequestsStore.findIndex((r) => r.id === id);
  if (empIdx !== -1) {
    employeeRequestsStore[empIdx] = { ...allRequestsStore[idx] };
  }

  return allRequestsStore[idx];

  /* ── Real implementation:
  const res = await fetch(`${BASE_URL}/admin/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ status, assigned_to }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
  */
}

/**
 * PATCH /admin/requests/:id/assign
 * Assigns a technician to a request.
 */
export async function assignTechnician(id: number, technician: string): Promise<MaintenanceRequest> {
  return updateRequestStatus(id, 'In Progress', technician);
}
