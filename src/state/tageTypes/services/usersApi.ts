import { api } from "@/state/api";
import type { RegisterRequest } from "@/state/types/auth";
import type {
  UserResponse,
  UserUpdate,
  RoleResponse,
  RoleCreate,
  RolePermissionsUpdate,
  DepartmentResponse,
  DepartmentCreate,
  PaginatedResponse,
  PaginationParams,
} from "@/state/types/user";

/**
 * The API's `/users`, `/roles` and `/departments` routers.
 *
 * `company_id` is never sent from the client — the server derives it from the
 * caller's token (`current_user["company_id"]`). Sending it would be ignored
 * at best and is a tenant-spoofing smell at worst.
 */
export const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Users ────────────────────────────────────────────
    getUsers: build.query<PaginatedResponse<UserResponse>, PaginationParams | void>({
      // The API caps `limit` at 20 (Query(10, ge=1, le=20)) — going over 400s.
      query: (params) => ({
        url: "/users/",
        params: {
          skip: params?.skip ?? 0,
          limit: params?.limit ?? 10,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((u) => ({ type: "Users" as const, id: u.user_id })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),

    getUser: build.query<UserResponse, number>({
      query: (userId) => `/users/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "Users", id: userId }],
    }),

    createUser: build.mutation<UserResponse, RegisterRequest>({
      query: (body) => ({ url: "/users/", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),

    updateUser: build.mutation<UserResponse, { userId: number; body: UserUpdate }>({
      query: ({ userId, body }) => ({
        url: `/users/${userId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "Users", id: userId },
        { type: "Users", id: "LIST" },
      ],
    }),

    deleteUser: build.mutation<void, number>({
      query: (userId) => ({ url: `/users/${userId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, userId) => [
        { type: "Users", id: userId },
        { type: "Users", id: "LIST" },
      ],
    }),

    // ── Roles ────────────────────────────────────────────
    getRoles: build.query<RoleResponse[], void>({
      query: () => "/roles/",
      providesTags: [{ type: "Users", id: "ROLES" }],
    }),

    createRole: build.mutation<RoleResponse, RoleCreate>({
      query: (body) => ({ url: "/roles/", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "ROLES" }],
    }),

    setRolePermissions: build.mutation<
      RoleResponse,
      { roleId: number; body: RolePermissionsUpdate }
    >({
      query: ({ roleId, body }) => ({
        url: `/roles/${roleId}/permissions`,
        method: "PUT",
        body,
      }),
      // Permissions drive what the current user can see, so refresh the
      // session too rather than just the role list.
      invalidatesTags: [{ type: "Users", id: "ROLES" }, "Auth"],
    }),

    deleteRole: build.mutation<void, number>({
      query: (roleId) => ({ url: `/roles/${roleId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Users", id: "ROLES" }],
    }),

    // ── Departments ──────────────────────────────────────
    getDepartments: build.query<DepartmentResponse[], void>({
      query: () => "/departments/",
      providesTags: [{ type: "Users", id: "DEPARTMENTS" }],
    }),

    createDepartment: build.mutation<DepartmentResponse, DepartmentCreate>({
      query: (body) => ({ url: "/departments/", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "DEPARTMENTS" }],
    }),

    deleteDepartment: build.mutation<void, number>({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Users", id: "DEPARTMENTS" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useSetRolePermissionsMutation,
  useDeleteRoleMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
} = usersApi;
