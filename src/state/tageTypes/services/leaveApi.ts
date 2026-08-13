import { api } from "@/state/api";
import type {
  LeaveListParams,
  LeaveRejectBody,
  LeaveRequestCreate,
  LeaveRequestResponse,
  LeaveSummary,
} from "@/state/types/leave";

/**
 * Leave requests.
 *
 * Staff routes (`/`, `/my`, `/{id}/cancel`) are `require_login` but also
 * demand a `staff_id` on the token — an account without a staff record gets a
 * clean 403. Everything else is `require_manager`.
 *
 * Route order on the API puts `/my`, `/pending` and `/summary` ahead of
 * `/{leave_id}`, so none of them are shadowed.
 */
export const leaveApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── staff ────────────────────────────────────────────
    createLeaveRequest: build.mutation<LeaveRequestResponse, LeaveRequestCreate>({
      query: (body) => ({ url: "/leave-requests/", method: "POST", body }),
      invalidatesTags: [
        { type: "HR", id: "LEAVE_MINE" },
        { type: "HR", id: "LEAVE_LIST" },
        { type: "HR", id: "LEAVE_PENDING" },
        { type: "HR", id: "LEAVE_SUMMARY" },
        // Creating notifies the requester and every manager.
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    getMyLeaveRequests: build.query<
      LeaveRequestResponse[],
      { skip?: number; limit?: number } | void
    >({
      query: (args) => ({
        url: "/leave-requests/my",
        params: { skip: args?.skip ?? 0, limit: args?.limit ?? 50 },
      }),
      providesTags: [{ type: "HR", id: "LEAVE_MINE" }],
    }),

    /** Allowed only on your own request, and only while pending or approved. */
    cancelLeaveRequest: build.mutation<LeaveRequestResponse, number>({
      query: (leaveId) => ({
        url: `/leave-requests/${leaveId}/cancel`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "HR", id: "LEAVE_MINE" },
        { type: "HR", id: "LEAVE_LIST" },
        { type: "HR", id: "LEAVE_PENDING" },
        { type: "HR", id: "LEAVE_SUMMARY" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    // ── manager ──────────────────────────────────────────
    getLeaveRequests: build.query<LeaveRequestResponse[], LeaveListParams | void>({
      query: (args) => ({
        url: "/leave-requests/",
        params: {
          skip: args?.skip ?? 0,
          limit: args?.limit ?? 50,
          // Query names are `leave_status` and `leave_type`.
          ...(args?.status ? { leave_status: args.status } : {}),
          ...(args?.leaveType ? { leave_type: args.leaveType } : {}),
        },
      }),
      providesTags: [{ type: "HR", id: "LEAVE_LIST" }],
    }),

    getPendingLeaveRequests: build.query<
      LeaveRequestResponse[],
      { skip?: number; limit?: number } | void
    >({
      query: (args) => ({
        url: "/leave-requests/pending",
        params: { skip: args?.skip ?? 0, limit: args?.limit ?? 50 },
      }),
      providesTags: [{ type: "HR", id: "LEAVE_PENDING" }],
    }),

    getLeaveSummary: build.query<LeaveSummary, void>({
      query: () => "/leave-requests/summary",
      providesTags: [{ type: "HR", id: "LEAVE_SUMMARY" }],
    }),

    getLeaveRequest: build.query<LeaveRequestResponse, number>({
      query: (leaveId) => `/leave-requests/${leaveId}`,
      providesTags: (_r, _e, id) => [{ type: "HR", id: `LEAVE-${id}` }],
    }),

    /** 409s unless the request is still pending. */
    approveLeaveRequest: build.mutation<LeaveRequestResponse, number>({
      query: (leaveId) => ({
        url: `/leave-requests/${leaveId}/approve`,
        method: "PATCH",
      }),
      invalidatesTags: [
        { type: "HR", id: "LEAVE_LIST" },
        { type: "HR", id: "LEAVE_PENDING" },
        { type: "HR", id: "LEAVE_SUMMARY" },
        { type: "HR", id: "LEAVE_MINE" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    rejectLeaveRequest: build.mutation<
      LeaveRequestResponse,
      { leaveId: number; body?: LeaveRejectBody }
    >({
      // The route requires a body even though it ignores `reason`; send an
      // object so FastAPI's validation passes.
      query: ({ leaveId, body }) => ({
        url: `/leave-requests/${leaveId}/reject`,
        method: "PATCH",
        body: body ?? {},
      }),
      invalidatesTags: [
        { type: "HR", id: "LEAVE_LIST" },
        { type: "HR", id: "LEAVE_PENDING" },
        { type: "HR", id: "LEAVE_SUMMARY" },
        { type: "HR", id: "LEAVE_MINE" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    deleteLeaveRequest: build.mutation<{ message?: string }, number>({
      query: (leaveId) => ({ url: `/leave-requests/${leaveId}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "HR", id: "LEAVE_LIST" },
        { type: "HR", id: "LEAVE_PENDING" },
        { type: "HR", id: "LEAVE_SUMMARY" },
        { type: "HR", id: "LEAVE_MINE" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateLeaveRequestMutation,
  useGetMyLeaveRequestsQuery,
  useCancelLeaveRequestMutation,
  useGetLeaveRequestsQuery,
  useGetPendingLeaveRequestsQuery,
  useGetLeaveSummaryQuery,
  useGetLeaveRequestQuery,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
} = leaveApi;
