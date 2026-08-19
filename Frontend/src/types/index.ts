export type RequestStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Escalated';
export type RequestCategory = 'IT' | 'Facilities' | 'Infrastructure';
export type RequestPriority = 'Low' | 'Medium' | 'High';
export type UserRole = 'employee' | 'admin';

export interface User {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  escalation_reason?: string;
  employee_id?: number;
  employee_name?: string;
}

export interface CreateRequestPayload {
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
