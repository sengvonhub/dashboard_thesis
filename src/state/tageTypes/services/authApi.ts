import { api } from "@/state/api";
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateUserRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
} from "@/state/types/auth";

/**
 * Endpoints under the API's `/auth` router.
 *
 * Note the API exposes user CRUD twice — here under `/auth/users/*` and again
 * under the `/users` router (see usersApi). The `/users` router is the richer
 * one (pagination, roles, departments, cache invalidation), so prefer it for
 * user management and keep these for auth-scoped operations.
 */
export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Session ──────────────────────────────────────────
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    /**
     * Web sends no body — the refresh token travels in the HttpOnly cookie,
     * which requires `credentials: "include"` (already set in the base query).
     */
    refresh: build.mutation<RefreshResponse, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
    }),

    /**
     * Deliberately no `invalidatesTags`. Invalidating would make every active
     * subscription refetch against a session the server has just revoked —
     * a burst of 401s, each triggering a refresh attempt, right as we tear
     * down. `useLogout` dispatches `api.util.resetApiState()` instead, which
     * drops the cache outright rather than refilling it.
     */
    logout: build.mutation<{ message?: string }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),

    // ── Passwords ────────────────────────────────────────
    changePassword: build.mutation<
      { message?: string },
      ChangePasswordRequest
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),

    resetPassword: build.mutation<
      { message?: string },
      { userId: number; body: ResetPasswordRequest }
    >({
      query: ({ userId, body }) => ({
        url: `/auth/reset-password/${userId}`,
        method: "POST",
        body,
      }),
    }),

    // ── Auth-scoped user operations ──────────────────────
    registerUser: build.mutation<RegisterResponse, RegisterRequest>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),

    getAuthUser: build.query<RegisterResponse, number>({
      query: (userId) => `/auth/users/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "Users", id: userId }],
    }),

    getAuthUserByUsername: build.query<RegisterResponse, string>({
      query: (username) => `/auth/users/username/${username}`,
      providesTags: ["Users"],
    }),

    updateAuthUser: build.mutation<
      RegisterResponse,
      { userId: number; body: UpdateUserRequest }
    >({
      query: ({ userId, body }) => ({
        url: `/auth/users/${userId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "Users", id: userId },
        "Users",
      ],
    }),

    deactivateUser: build.mutation<RegisterResponse, number>({
      query: (userId) => ({
        url: `/auth/users/${userId}/deactivate`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, userId) => [{ type: "Users", id: userId }, "Users"],
    }),

    activateUser: build.mutation<RegisterResponse, number>({
      query: (userId) => ({
        url: `/auth/users/${userId}/activate`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, userId) => [{ type: "Users", id: userId }, "Users"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useResetPasswordMutation,
  useRegisterUserMutation,
  useGetAuthUserQuery,
  useGetAuthUserByUsernameQuery,
  useUpdateAuthUserMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
} = authApi;
