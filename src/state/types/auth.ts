export interface SetupRequest {
  company_name: string;
  company_code: string;
  username: string;
  password: string;
  full_name: string;
  timezone?: string;   
  currency?: string;   
}

export interface SetupResponse {
  message: string;
  company_id: number;
  company_name: string;
  username: string;
  role: string;
}

export interface SetupStatusResponse {
  initialized: boolean;
  message: string;
}

// ── Login ──────────────────────────────────────────────
export interface LoginRequest {
  username: string;   // NOT email
  password: string;
}

/**
 * The API branches on `is_mobile(request)`:
 *   mobile → access + refresh token in the body
 *   web    → access token in the body, refresh token in an HttpOnly cookie
 * From a browser only the web branch is reachable, so the refresh fields are
 * optional here rather than required.
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;          // "bearer"
  access_expires_in: number;
  refresh_token?: string;      // mobile only
  refresh_expires_in?: number; // mobile only
  user: AuthUser;
}

/**
 * `login` returns `user: Dict[str, Any]` on the API, so this shape is not
 * enforced by the backend schema. The index signature keeps unknown extra
 * fields accessible instead of dropping them.
 */
export interface AuthUser {
  user_id: number;
  username: string;
  full_name: string;
  company_id: number;
  role?: string | null;
  role_id?: number | null;
  department_id?: number | null;
  is_superuser?: boolean;
  permissions?: string[];
  avatar_url?: string | null;
  [key: string]: unknown;
}

/** Shape of the API's structured 401 body (see the refresh route). */
export interface AuthErrorDetail {
  code: string;      // e.g. "NO_REFRESH_TOKEN"
  message: string;
  action?: string;   // e.g. "FULL_LOGIN"
}

// ── Refresh / Logout ─────────────────────────────────────
export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  access_expires_in: number;
}

export interface LogoutRequest {
  refresh_token: string;
}

// ── Register / Update ──────────────────────────────────
export interface RegisterRequest {
  username: string;
  password: string;
  full_name: string;
  role_id: number;
  department_id?: number;
}

export interface RegisterResponse {
  user_id: number;
  username: string;
  full_name: string;
  role?: string;
  department_id?: number;
  status: string;
  created_at?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  role_id?: number;
  department_id?: number;
  status?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ResetPasswordRequest {
  new_password: string;
}