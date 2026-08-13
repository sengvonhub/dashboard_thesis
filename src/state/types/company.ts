/**
 * Company types.
 *
 * `CompanyBase/Create/Update/Response` below are transcribed from
 * app/schemas/schema.py and are reliable.
 *
 * The company router imports its schemas from `app.schemas.company` instead —
 * a DIFFERENT module that was not available when this was written. The types
 * marked "unverified" are therefore inferred from the route signatures and the
 * existing register form, not from the schema itself. Check them against
 * app/schemas/company.py before relying on them.
 */

export type CompanyStatus = "active" | "suspended" | "cancelled";

export interface CompanyBase {
  company_name: string;
  company_code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  timezone: string; // default "UTC"
  currency: string; // default "USD"
  max_users: number; // default 10
}

export type CompanyCreate = CompanyBase;

export interface CompanyUpdate {
  company_name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  timezone?: string;
  currency?: string;
  max_users?: number;
}

export interface CompanyResponse extends CompanyBase {
  company_id: number;
  plan_type: string;
  status: CompanyStatus | string;
  created_at: string;
  expires_at?: string | null;
}

// ── unverified: shapes inferred from route signatures ────

/** Matches the fields the existing register form already submits. */
export interface CompanyRegisterRequest {
  company_name: string;
  company_code: string;
  email: string;
  phone?: string;
  address?: string;
  admin_full_name: string;
  admin_username: string;
  admin_password: string;
}

export interface CompanyRegisterResponse {
  access_token: string;
  token_type: string;
  access_expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  company: CompanyResponse;
  user: {
    user_id: number;
    username: string;
    full_name: string;
    role?: string | null;
  };
}

/**
 * NOTE: `CompanyRepository.get_settings_by_company` returns
 * `list[SystemSetting]`, but the route declares
 * `response_model=CompanySettingsResponse` — a single object. One of the two
 * is wrong. Typed as the repository actually returns; flip it if the service
 * folds the rows into one object.
 */
export interface SystemSettingResponse {
  setting_id: number;
  company_id: number;
  key: string;
  value: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type CompanySettingsResponse = SystemSettingResponse[];

/** Exactly the dict built by `CompanyRepository.get_stats`. */
export interface CompanyStatsResponse {
  total_staff: number;
  total_departments: number;
  total_users: number;
  active_users: number;
  total_roles: number;
}

export interface UpdatePlanRequest {
  plan_type: string;
  expires_at?: string | null;
}

export interface UpdateStatusRequest {
  status: CompanyStatus;
  reason?: string | null;
}

/**
 * Columns confirmed from `update_status_atomic` and the `changed_at` ordering
 * in `get_status_history`. This records a transition, so it carries both the
 * old and new status — not a single `status` field.
 */
export interface CompanyStatusHistoryResponse {
  company_id: number;
  old_status: CompanyStatus | string;
  new_status: CompanyStatus | string;
  reason?: string | null;
  changed_by?: number | null;
  changed_at: string;
}
