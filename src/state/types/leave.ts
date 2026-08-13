/** Transcribed from app/schemas/schema.py — leave requests. */

export type LeaveType = "annual" | "sick" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface StaffBasicInfo {
  staff_id: number;
  name: string;
  avatar_url?: string | null;
}

export interface LeaveRequestResponse {
  leave_id: number;
  staff_id: number;
  company_id: number;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  reason?: string | null;
  status: LeaveStatus;
  approved_by?: number | null;
  approved_by_name?: string | null;
  created_at: string;
  staff?: StaffBasicInfo | null;
}

/** POST /leave-requests/ — staff_id comes from the token, not the body. */
export interface LeaveRequestCreate {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

/**
 * Body for the reject route.
 *
 * WARNING: `LeaveRequestUpdate` on the API declares only `status` and
 * `approved_by` — there is no `reason` field. The route reads it with
 * `data.reason if hasattr(data, "reason") else None`, which is always False
 * on a Pydantic model lacking the field, so any rejection reason sent here is
 * silently discarded server-side.
 */
export interface LeaveRejectBody {
  status?: LeaveStatus | null;
  approved_by?: number | null;
  reason?: string | null;
}

/** GET /leave-requests/summary */
export interface LeaveSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface LeaveListParams {
  skip?: number;
  limit?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}

/** Inclusive day count, which is how the API counts leave days. */
export function leaveDays(start: string, end: string): number {
  const a = new Date(`${start.slice(0, 10)}T00:00:00`);
  const b = new Date(`${end.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}
