"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, getPersistor } from "@/app/redux";
import { clearCredentials } from "@/state/authSlice";
import { api } from "@/state/api";
import { useLogoutMutation } from "@/state/tageTypes/services/authApi";

export interface LogoutOptions {
  /** Where to send the user afterwards. Defaults to the login page. */
  redirectTo?: string;
  /**
   * Skip the server call and only tear down locally. Used when the session is
   * already known to be dead (refresh failed), where POSTing /auth/logout
   * would just 401.
   */
  localOnly?: boolean;
}

/**
 * Full logout.
 *
 * Four things have to happen, and the local three must happen even when the
 * server call fails — otherwise a user who clicks "log out" while offline
 * stays logged in:
 *
 *  1. POST /auth/logout   — server revokes the refresh token and, for web,
 *                           clears the HttpOnly refresh cookie.
 *  2. clearCredentials()  — drops the access token and user from Redux, which
 *                           flips AuthGuard and bounces protected routes.
 *  3. resetApiState()     — empties the RTK Query cache. Without this the next
 *                           account to log in on this browser briefly sees the
 *                           previous user's cached users/company data.
 *  4. persistor.flush()   — forces the cleared state out to localStorage before
 *                           we navigate, so a fast reload can't rehydrate the
 *                           old session.
 *
 * `flush()` and not `purge()`: purge would also wipe the `global` slice and
 * reset the user's theme and sidebar preferences on every logout.
 */
export function useLogout() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutMutation] = useLogoutMutation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(
    async ({ redirectTo = "/login", localOnly = false }: LogoutOptions = {}) => {
      setIsLoggingOut(true);
      try {
        if (!localOnly) {
          try {
            await logoutMutation().unwrap();
          } catch {
            // Revocation failed — offline, or the access token already expired
            // and the refresh retry could not save it. Nothing to recover here;
            // the local teardown below still has to run.
          }
        }

        dispatch(clearCredentials());
        dispatch(api.util.resetApiState());

        try {
          await getPersistor()?.flush();
        } catch {
          // Storage unavailable (private mode, quota). The in-memory state is
          // already cleared, so the session is gone either way.
        }

        router.replace(redirectTo);
      } finally {
        setIsLoggingOut(false);
      }
    },
    [dispatch, logoutMutation, router]
  );

  return { logout, isLoggingOut };
}
