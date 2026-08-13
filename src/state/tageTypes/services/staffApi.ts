import { api } from "@/state/api";
import type { StaffResponse, StaffRoleResponse } from "@/state/types/user";
import type {
  StaffCreate,
  StaffRoleCreate,
  StaffRoleUpdate,
  StaffUpdateForm,
} from "@/state/types/staff";

export type { StaffUpdateForm } from "@/state/types/staff";

/**
 * Staff and staff roles.
 *
 * Guards differ per route and are noted inline — `/staff/` and `/staff/my`
 * are only `require_login`, while most reads are `require_manager` and every
 * `/staff-roles` route needs MANAGE_USERS.
 */
export const staffApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Staff: reads ─────────────────────────────────────
    /**
     * GET /staff/ — everyone in the company. Guarded by `require_login`
     * despite the "[Manager]" summary, so any signed-in user can read it.
     */
    getAllStaff: build.query<StaffResponse[], void>({
      query: () => "/staff/",
      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({ type: "HR" as const, id: s.staff_id })),
              { type: "HR" as const, id: "LIST" },
            ]
          : [{ type: "HR" as const, id: "LIST" }],
    }),

    /**
     * GET /staff/my — the caller's own staff profile. Resolved from
     * `current_user["staff_id"]`, so it errors for a user with no staff record.
     */
    getMyStaff: build.query<StaffResponse, void>({
      query: () => "/staff/my",
      providesTags: [{ type: "HR", id: "ME" }],
    }),

    /** GET /staff/my-staffs — every staff profile linked to my user. */
    getMyStaffProfiles: build.query<StaffResponse[], void>({
      query: () => "/staff/my-staffs",
      providesTags: [{ type: "HR", id: "MINE" }],
    }),

    /** GET /staff/{id} — require_manager. */
    getStaffById: build.query<StaffResponse, number>({
      query: (staffId) => `/staff/${staffId}`,
      providesTags: (_r, _e, id) => [{ type: "HR", id }],
    }),

    /** GET /staff/user/{user_id} — require_manager. */
    getStaffByUserId: build.query<StaffResponse, number>({
      query: (userId) => `/staff/user/${userId}`,
      providesTags: [{ type: "HR", id: "BY_USER" }],
    }),

    /** GET /staff/managers — MANAGE_USERS. */
    getManagers: build.query<StaffResponse[], void>({
      query: () => "/staff/managers",
      providesTags: [{ type: "HR", id: "MANAGERS" }],
    }),

    /** GET /staff/role/{staff_role_id} — require_manager. */
    getStaffByRole: build.query<StaffResponse[], number>({
      query: (roleId) => `/staff/role/${roleId}`,
      providesTags: [{ type: "HR", id: "BY_ROLE" }],
    }),

    /**
     * GET /staff/department/{department_id} — require_manager.
     * Note the repository joins through `Staff.user` and filters
     * `User.department_id`: department lives on the user, not on staff.
     */
    getStaffByDepartment: build.query<StaffResponse[], number>({
      query: (departmentId) => `/staff/department/${departmentId}`,
      providesTags: [{ type: "HR", id: "BY_DEPT" }],
    }),

    // ── Staff: writes ────────────────────────────────────
    /**
     * POST /staff/ — MANAGE_USERS. JSON, not multipart: the route takes a
     * StaffCreate body and never reads an upload, so a new staff member gets
     * their avatar in a follow-up PATCH.
     */
    createStaff: build.mutation<StaffResponse, StaffCreate>({
      query: (body) => ({ url: "/staff/", method: "POST", body }),
      invalidatesTags: [
        { type: "HR", id: "LIST" },
        { type: "HR", id: "MANAGERS" },
      ],
    }),

    /**
     * PATCH /staff/{staff_id} — multipart/form-data, `require_login`.
     *
     * `name` is REQUIRED even for a partial update: the route builds
     * `StaffUpdate(name=name, ...)` and StaffUpdate inherits a required
     * `name` (min_length=2) from StaffBase, so omitting it is a 422.
     */
    updateStaff: build.mutation<
      StaffResponse,
      { staffId: number; data: StaffUpdateForm }
    >({
      query: ({ staffId, data }) => {
        const form = new FormData();
        form.append("name", data.name);
        if (data.staff_role_id != null)
          form.append("staff_role_id", String(data.staff_role_id));
        if (data.gender) form.append("gender", data.gender);
        if (data.date_of_birth) form.append("date_of_birth", data.date_of_birth);
        if (data.address) form.append("address", data.address);
        if (data.email) form.append("email", data.email);
        if (data.phone) form.append("phone", data.phone);
        if (data.avatar_file) form.append("avatar_file", data.avatar_file);

        return { url: `/staff/${staffId}`, method: "PATCH", body: form };
      },
      invalidatesTags: (_r, _e, { staffId }) => [
        { type: "HR", id: staffId },
        { type: "HR", id: "ME" },
        { type: "HR", id: "LIST" },
        { type: "HR", id: "MANAGERS" },
      ],
    }),

    /** PATCH /staff/{staff_id}/avatar — require_manager, avatar only. */
    updateStaffAvatar: build.mutation<
      StaffResponse,
      { staffId: number; file: File }
    >({
      query: ({ staffId, file }) => {
        const form = new FormData();
        form.append("avatar_file", file);
        return { url: `/staff/${staffId}/avatar`, method: "PATCH", body: form };
      },
      invalidatesTags: (_r, _e, { staffId }) => [
        { type: "HR", id: staffId },
        { type: "HR", id: "ME" },
        { type: "HR", id: "LIST" },
      ],
    }),

    /** DELETE /staff/{staff_id} — require_manager. Returns 200 + message. */
    deleteStaff: build.mutation<{ message?: string }, number>({
      query: (staffId) => ({ url: `/staff/${staffId}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "HR", id: "LIST" },
        { type: "HR", id: "MANAGERS" },
      ],
    }),

    // ── Staff roles (all MANAGE_USERS) ───────────────────
    getStaffRoles: build.query<StaffRoleResponse[], void>({
      query: () => "/staff-roles/",
      providesTags: (result) =>
        result
          ? [
              ...result.map((r) => ({
                type: "HR" as const,
                id: `ROLE-${r.staff_role_id}`,
              })),
              { type: "HR" as const, id: "ROLES" },
            ]
          : [{ type: "HR" as const, id: "ROLES" }],
    }),

    getStaffRole: build.query<StaffRoleResponse, number>({
      query: (id) => `/staff-roles/${id}`,
      providesTags: (_r, _e, id) => [{ type: "HR", id: `ROLE-${id}` }],
    }),

    /** POST /staff-roles/ — 409 when the role name already exists. */
    createStaffRole: build.mutation<StaffRoleResponse, StaffRoleCreate>({
      query: (body) => ({ url: "/staff-roles/", method: "POST", body }),
      invalidatesTags: [{ type: "HR", id: "ROLES" }],
    }),

    updateStaffRole: build.mutation<
      StaffRoleResponse,
      { roleId: number; body: StaffRoleUpdate }
    >({
      query: ({ roleId, body }) => ({
        url: `/staff-roles/${roleId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { roleId }) => [
        { type: "HR", id: `ROLE-${roleId}` },
        { type: "HR", id: "ROLES" },
        // is_manager changes who counts as a manager.
        { type: "HR", id: "MANAGERS" },
        { type: "HR", id: "LIST" },
      ],
    }),

    deleteStaffRole: build.mutation<void, number>({
      query: (roleId) => ({ url: `/staff-roles/${roleId}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "HR", id: "ROLES" },
        { type: "HR", id: "MANAGERS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllStaffQuery,
  useGetMyStaffQuery,
  useGetMyStaffProfilesQuery,
  useGetStaffByIdQuery,
  useGetStaffByUserIdQuery,
  useGetManagersQuery,
  useGetStaffByRoleQuery,
  useGetStaffByDepartmentQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useUpdateStaffAvatarMutation,
  useDeleteStaffMutation,
  useGetStaffRolesQuery,
  useGetStaffRoleQuery,
  useCreateStaffRoleMutation,
  useUpdateStaffRoleMutation,
  useDeleteStaffRoleMutation,
} = staffApi;
