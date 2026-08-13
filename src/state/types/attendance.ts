import type { StaffResponse } from "@/state/types/user";

/** Transcribed from app/schemas/schema.py — attendance + scan flow. */

export interface AttendanceResponse {
  attendance_id: number;
  staff_id: number;
  /** ISO date, e.g. "2026-08-11". */
  date: string;
  /** ISO time, e.g. "08:31:07". Null until the staff member checks out. */
  check_in_time?: string | null;
  check_out_time?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  created_at: string;
  staff?: StaffResponse | null;
}

// ── Scan flow ────────────────────────────────────────────
// Two steps: re-enter password for a short-lived scan token, then scan the
// office QR. The scan endpoints take NO JWT — identity rides in scan_token.

export interface ScanAuthRequest {
  password: string;
}

export interface ScanTokenResponse {
  scan_token: string;
  expires_in_secs: number;
  staff_name: string;
  message: string;
}

export interface ScanRequest {
  scan_token: string;
  office_qr_token: string;
  latitude: string;
  longitude: string;
  company_id: number;
}

export interface ScanResponse {
  attendance: AttendanceResponse;
  distance_meters: number;
  message: string;
  /** Returned by check-in but absent from the declared ScanResponse schema. */
  staff_name?: string;
}

export interface OfficeQRResponse {
  office_id: string;
  qr_token: string;
  /** base64 PNG, may or may not carry a `data:` prefix. */
  qr_image: string;
  expires_in: string;
  note: string;
}

// ── Aggregates ───────────────────────────────────────────

/** GET /attendance/my/monthly-stats */
export interface MonthlyStatsResponse {
  staff_id: number;
  month: number;
  year: number;
  total_present: number;
  checked_out: number;
  still_in: number;
}

/** GET /attendance/summary/today */
export interface TodaySummaryResponse {
  date: string;
  total_present: number;
  checked_out: number;
  still_in: number;
}

// ── Settings ─────────────────────────────────────────────
/**
 * Attendance settings (geofence + policy) — `/attendance-settings/`.
 *
 * Response field types are read permissively: the column is Numeric on the
 * model, and depending on the Pydantic config a Decimal can serialise as
 * either a JSON number or a string.
 */
export interface AttendanceSettingsResponse {
  company_id: number;
  office_latitude: string | number;
  office_longitude: string | number;
  allowed_radius_meters: number;
  office_open_time: string; // "09:00:00"
  office_close_time: string; // "17:00:00"
  timezone?: string | null;
  late_threshold_minutes: number;
  overtime_threshold_minutes?: number | null;
  updated_at?: string | null;
}

/**
 * PATCH body. Coordinates are NUMBERS, matching the repository contract
 * (`double? officeLatitude`) — sending them as strings relies on Pydantic
 * coercion and breaks outright under strict mode.
 *
 * The handler uses `exclude_unset=True`, so any key omitted here is left
 * untouched server-side; only send what changed.
 */
export interface AttendanceSettingsUpdate {
  office_latitude?: number;
  office_longitude?: number;
  allowed_radius_meters?: number;
  office_open_time?: string;
  office_close_time?: string;
  timezone?: string | null;
  late_threshold_minutes?: number;
  overtime_threshold_minutes?: number | null;
}

export interface AttendanceListParams {
  filterDate?: string;
  month?: number;
  year?: number;
  staffId?: number;
}



export interface DateRangeParams {
  startDate: string;
  endDate: string;
  staffId?: number;
}



