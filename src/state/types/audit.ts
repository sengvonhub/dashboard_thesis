/** Transcribed from app/models/audit_log.py + the audit router's responses. */

/** Written by the DB triggers / repository as upper-case verbs. */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/** `selectinload(AuditLog.user)` means the actor rides along on every row. */
export interface AuditUser {
  user_id: number;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface AuditLogResponse {
  log_id: number;
  user_id?: number | null;
  company_id?: number | null;
  action: AuditAction | string;
  table_name: string;
  record_id?: number | null;
  /**
   * Row snapshots. Null on INSERT (`old_value`) and on DELETE (`new_value`).
   * Shape varies per table, so they stay untyped rather than pretending.
   */
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
  user?: AuditUser | null;
}

/** One field that differs between old_value and new_value. */
export interface AuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}
