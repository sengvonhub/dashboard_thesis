"use client";

import { useAuth } from "@/state/tageTypes/lib/hook";
import { useGetUserQuery } from "@/state/tageTypes/services/usersApi";
import { useGetCompanyQuery } from "@/state/tageTypes/services/companyApi";

/**
 * The current user's profile plus their company.
 *
 * The API has no `/auth/me` or `/companies/me`, so there is nothing to call
 * that resolves "the caller" server-side. Both ids come from the session
 * (`user_id`, `company_id`) and are fetched by id:
 *
 *   GET /users/{user_id}     — richer than /auth/users/{id}: eager-loads
 *                              role, department and staff (see
 *                              AuthRepository.get_by_id)
 *   GET /companies/{company_id}
 *
 * Both are skipped until the id exists, so this is safe to call before
 * rehydration finishes.
 *
 * Caveat: GET /users/{id} is gated on VIEW_USERS and GET /companies/{id} on
 * require_login. A user without VIEW_USERS gets a 403 reading their OWN
 * profile — a dedicated `/auth/me` on the API would remove that.
 */
export function useProfile() {
  const { user, isAuthenticated } = useAuth();

  const userId = typeof user?.user_id === "number" ? user.user_id : undefined;
  const companyId =
    typeof user?.company_id === "number" ? user.company_id : undefined;

  const userQuery = useGetUserQuery(userId as number, {
    skip: !isAuthenticated || userId === undefined,
  });

  const companyQuery = useGetCompanyQuery(companyId as number, {
    skip: !isAuthenticated || companyId === undefined,
  });

  return {
    userId,
    companyId,
    /** Falls back to the session copy so something renders before the fetch lands. */
    profile: userQuery.data,
    company: companyQuery.data,
    isLoading: userQuery.isLoading || companyQuery.isLoading,
    isFetching: userQuery.isFetching || companyQuery.isFetching,
    userError: userQuery.error,
    companyError: companyQuery.error,
    refetch: () => {
      userQuery.refetch();
      companyQuery.refetch();
    },
  };
}
