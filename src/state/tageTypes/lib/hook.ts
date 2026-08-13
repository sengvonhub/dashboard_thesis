"use client";

import { useCallback, useMemo } from "react";
import { useAppSelector } from "@/app/redux";
import type { AuthUser } from "@/state/types/auth";
import type { PermissionCode } from "@/state/permissions";

/** What `load_permissions` returns for the superuser role. */
export const WILDCARD_PERMISSION = "*";

/**
 * Auth + permission helpers.
 *
 * These decide what to RENDER only. Every one of these checks is also enforced
 * server-side by `require_permission` / `require_admin` / `require_superuser`,
 * and that is the real gate — a user who edits their persisted Redux state can
 * flip any of these to true and will still get a 403 from the API.
 */

export interface AuthSnapshot {
  user: AuthUser | null;
  accessToken: string | null;
  /** Has a token and has not passed its expiry. */
  isAuthenticated: boolean;
  /** Token exists but `access_expires_in` has elapsed — refresh will be tried. */
  isExpired: boolean;
  isSuperuser: boolean;
  permissions: string[];
  companyId: number | null;
}

export function useAuth(): AuthSnapshot {
  const auth = useAppSelector((state) => state.auth);

  return useMemo(() => {
    const { accessToken, accessTokenExpiresAt, isAuthenticated, user } = auth;

    // No expiry recorded (e.g. after a silent refresh that only returned a
    // token) is treated as not-expired rather than expired, so a missing
    // timestamp never logs the user out on its own.
    const isExpired =
      accessTokenExpiresAt !== null && Date.now() >= accessTokenExpiresAt;

    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

    return {
      user: user ?? null,
      accessToken,
      isAuthenticated: Boolean(isAuthenticated && accessToken) && !isExpired,
      isExpired,
      isSuperuser: user?.is_superuser === true,
      permissions,
      companyId: typeof user?.company_id === "number" ? user.company_id : null,
    };
  }, [auth]);
}

/**
 * `has(code)` — true when the user holds the permission.
 * Superusers pass every check, matching `require_superuser` on the API.
 */
export function usePermissions() {
  const { permissions, isSuperuser } = useAuth();

  // `AuthRepository.load_permissions` returns the literal ["*"] for the
  // superuser role instead of an expanded code list, so a plain
  // `includes(code)` would deny a superuser everything.
  const isWildcard = isSuperuser || permissions.includes(WILDCARD_PERMISSION);

  const has = useCallback(
    (code: PermissionCode | string) =>
      isWildcard || permissions.includes(code),
    [permissions, isWildcard]
  );

  const hasAny = useCallback(
    (codes: (PermissionCode | string)[]) =>
      isWildcard || codes.some((c) => permissions.includes(c)),
    [permissions, isWildcard]
  );

  const hasAll = useCallback(
    (codes: (PermissionCode | string)[]) =>
      isWildcard || codes.every((c) => permissions.includes(c)),
    [permissions, isWildcard]
  );

  return { has, hasAny, hasAll, permissions, isSuperuser: isWildcard };
}

/** Convenience wrapper for a single permission check. */
export function useHasPermission(code: PermissionCode | string): boolean {
  const { has } = usePermissions();
  return has(code);
}
