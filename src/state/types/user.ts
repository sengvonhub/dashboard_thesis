import type { PermissionCode } from "@/state/permissions";

// Mirrors app/schemas/schema.py — UserStatus / GenderEnum
export type UserStatus = "active" | "inactive";
export type Gender = "male" | "female" | "other";

// ── Roles ────────────────────────────────────────────────
export interface PermissionSimple {
  permission_id: number;
  code: PermissionCode | string;
}

export interface RoleSimple {
  role_id: number;
  role_name: string;
}

export interface RoleResponse {
  role_id: number;
  role_name: string;
  company_id: number;
  permissions: PermissionSimple[];
}

export interface RoleCreate {
  role_name: string;
  company_id: number;
  permission_codes: string[];
}

export interface RolePermissionsUpdate {
  permission_codes: string[];
}

// ── Departments ──────────────────────────────────────────
export interface DepartmentSimple {
  department_id: number;
  department_name: string;
}

export interface DepartmentResponse {
  department_id: number;
  department_name: string;
  manager_id?: number | null;
}

export interface DepartmentCreate {
  department_name: string;
  manager_id?: number | null;
  company_id: number;
}

// ── Staff ────────────────────────────────────────────────
export interface StaffRoleResponse {
  staff_role_id: number;
  company_id: number;
  role_name: string;
  description?: string | null;
  base_salary?: string | number | null;
  is_manager: boolean;
  created_at: string;
}

export interface StaffResponse {
  staff_id: number;
  company_id: number;
  user_id?: number | null;
  staff_role_id?: number | null;
  name: string;
  gender?: Gender | null;
  date_of_birth?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  created_at: string;
  staff_role?: StaffRoleResponse | null;
}

// ── Users ────────────────────────────────────────────────
export interface UserResponse {
  user_id: number;
  username: string;
  full_name: string;
  status: UserStatus;
  department_id?: number | null;
  role_id?: number | null;
  department?: DepartmentSimple | null;
  role?: RoleSimple | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  staff?: StaffResponse | null;
}

export interface UserUpdate {
  username?: string;
  full_name?: string;
  department_id?: number | null;
  role_id?: number | null;
  status?: UserStatus;
}

// ── Pagination ───────────────────────────────────────────
// The API declares `items: List[Any]`, so the element type is not carried in
// the OpenAPI schema — it is pinned here on the client instead.
export interface PaginatedResponse<T> {
  total: number;
  skip: number;
  limit: number;
  items: T[];
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}
