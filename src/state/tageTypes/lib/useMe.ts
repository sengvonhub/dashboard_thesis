"use client";

import { useMemo } from "react";
import { useAuth } from "@/state/tageTypes/lib/hook";
import { useGetMyStaffQuery } from "@/state/tageTypes/services/staffApi";
import type { StaffResponse } from "@/state/types/user";

/**
 * The signed-in person's display identity.
 *
 * Two sources, because no single endpoint has everything:
 *   - the login payload (Redux) has user_id / username / full_name / company_id
 *   - GET /staff/my has the staff record: name, email, phone, avatar_url,
 *     staff_role, and the staff_id needed to PATCH the profile
 *
 * Not every user has a staff record — `/staff/my` reads
 * `current_user["staff_id"]` straight out of the JWT and errors when it is
 * absent — so every staff-derived field falls back to the login payload and
 * `hasStaffRecord` tells callers whether editing is possible at all.
 */
export interface Me {
  staff?: StaffResponse;
  staffId?: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  /** Staff role name, e.g. "Manager". Note the API field is `role_name`. */
  roleName: string | null;
  initials: string;
  hasStaffRecord: boolean;
  isLoading: boolean;
  error: unknown;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useMe(): Me {
  const { user, isAuthenticated } = useAuth();

  const { data: staff, isLoading, error } = useGetMyStaffQuery(undefined, {
    skip: !isAuthenticated,
  });

  return useMemo(() => {
    const displayName =
      staff?.name ||
      (typeof user?.full_name === "string" ? user.full_name : "") ||
      (typeof user?.username === "string" ? user.username : "") ||
      "Account";

    return {
      staff,
      staffId: staff?.staff_id,
      displayName,
      email: staff?.email ?? null,
      phone: staff?.phone ?? null,
      avatarUrl: staff?.avatar_url ?? null,
      // `role_name`, not `name` — StaffRoleResponse names it role_name.
      roleName:
        staff?.staff_role?.role_name ??
        (typeof user?.role === "string" ? user.role : null),
      initials: initialsOf(displayName),
      hasStaffRecord: Boolean(staff?.staff_id),
      isLoading,
      error,
    };
  }, [staff, user, isLoading, error]);
}
