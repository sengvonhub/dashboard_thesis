import type { Gender } from "@/state/types/user";

// Re-exported so anything importing from "staff.ts" can get response types
// too, without duplicating the interfaces (source of truth stays in user.ts).
export type { StaffResponse, StaffRoleResponse } from "@/state/types/user";

/** POST /staff/ — JSON body (StaffCreate). No avatar; upload it via PATCH. */
export interface StaffCreate {
  user_id?: number | null;
  staff_role_id?: number | null;
  name: string;
  gender?: Gender | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * PATCH /staff/{id} — multipart form fields.
 *
 * `name` is required: the route constructs `StaffUpdate(name=name, ...)` and
 * StaffUpdate inherits a required `name` (min_length=2) from StaffBase, so a
 * partial update that omits it fails validation with a 422.
 */
export interface StaffUpdateForm {
  name: string;
  staff_role_id?: number | null;
  gender?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_file?: File | null;
}

/** POST /staff-roles/ — 409 if `role_name` already exists in the company. */
export interface StaffRoleCreate {
  role_name: string;
  description?: string | null;
  base_salary?: number | string | null;
  is_manager?: boolean;
}

export interface StaffRoleUpdate {
  role_name?: string;
  description?: string | null;
  base_salary?: number | string | null;
  is_manager?: boolean;
}