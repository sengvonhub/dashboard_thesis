import { api } from "@/state/api";
import type {
  AttendanceListParams,
  AttendanceResponse,
  AttendanceSettingsResponse,
  AttendanceSettingsUpdate,
  DateRangeParams,
  MonthlyStatsResponse,
  OfficeQRResponse,
  ScanAuthRequest,
  ScanRequest,
  ScanResponse,
  ScanTokenResponse,
  TodaySummaryResponse,
} from "@/state/types/attendance";

/**
 * Attendance.
 *
 * Route guards, since they differ a lot here:
 *   require_login   — /scan/authenticate, /my, /my/monthly-stats
 *   NO AUTH         — /scan/check-in, /scan/check-out (scan_token is identity)
 *   require_manager — /office-qr, /summary/today, /date-range, /, /{id}
 *
 * `/my` and `/my/monthly-stats` additionally require the JWT to carry
 * `staff_id`; a user account with no staff record gets a 403.
 */
export const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Scan step 1: password -> short-lived scan token ──
    scanAuthenticate: build.mutation<ScanTokenResponse, ScanAuthRequest>({
      query: (body) => ({
        url: "/attendance/scan/authenticate",
        method: "POST",
        body,
      }),
    }),

    // ── Scan step 2: office QR + GPS -> check in / out ───
    scanCheckIn: build.mutation<ScanResponse, ScanRequest>({
      query: (body) => ({
        url: "/attendance/scan/check-in",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "ME" },
        { type: "Attendance", id: "STATS" },
        { type: "Attendance", id: "TODAY" },
        { type: "Attendance", id: "LIST" },
        // The API pushes a notification on check-in.
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    scanCheckOut: build.mutation<ScanResponse, ScanRequest>({
      query: (body) => ({
        url: "/attendance/scan/check-out",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "ME" },
        { type: "Attendance", id: "STATS" },
        { type: "Attendance", id: "TODAY" },
        { type: "Attendance", id: "LIST" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    // ── Mine ─────────────────────────────────────────────
    getMyAttendance: build.query<
      AttendanceResponse[],
      { month?: number; year?: number } | void
    >({
      query: (args) => ({
        url: "/attendance/my",
        params: {
          ...(args?.month ? { month: args.month } : {}),
          ...(args?.year ? { year: args.year } : {}),
        },
      }),
      providesTags: [{ type: "Attendance", id: "ME" }],
    }),

    getMyMonthlyStats: build.query<
      MonthlyStatsResponse,
      { month: number; year: number }
    >({
      // Both params are required on the API (Query(...)).
      query: ({ month, year }) => ({
        url: "/attendance/my/monthly-stats",
        params: { month, year },
      }),
      providesTags: [{ type: "Attendance", id: "STATS" }],
    }),

    // ── Manager ──────────────────────────────────────────
    getTodaySummary: build.query<TodaySummaryResponse, void>({
      query: () => "/attendance/summary/today",
      providesTags: [{ type: "Attendance", id: "TODAY" }],
    }),

    getAllAttendance: build.query<
      AttendanceResponse[],
      AttendanceListParams | void
    >({
      query: (args) => ({
        url: "/attendance/",
        params: {
          ...(args?.filterDate ? { filter_date: args.filterDate } : {}),
          ...(args?.month ? { month: args.month } : {}),
          ...(args?.year ? { year: args.year } : {}),
          ...(args?.staffId ? { staff_id: args.staffId } : {}),
        },
      }),
      providesTags: [{ type: "Attendance", id: "LIST" }],
    }),

    getAttendanceByDateRange: build.query<AttendanceResponse[], DateRangeParams>({
      query: ({ startDate, endDate, staffId }) => ({
        url: "/attendance/date-range",
        params: {
          start_date: startDate,
          end_date: endDate,
          ...(staffId ? { staff_id: staffId } : {}),
        },
      }),
      providesTags: [{ type: "Attendance", id: "RANGE" }],
    }),

    getAttendanceById: build.query<AttendanceResponse, number>({
      query: (attendanceId) => `/attendance/${attendanceId}`,
      providesTags: (_r, _e, id) => [{ type: "Attendance", id }],
    }),

    // ── Office QR (manager) ──────────────────────────────
    getOfficeQr: build.query<OfficeQRResponse, void>({
      query: () => "/attendance/office-qr",
      providesTags: [{ type: "Attendance", id: "QR" }],
    }),

    // ── Settings (geofence + policy) ─────────────────────
    // Its own router, `/attendance-settings` — NOT nested under /attendance.
    // Both routes are require_manager and both need the trailing slash.

    /**
     * GET /attendance-settings/
     *
     * Returns 404 when the company has no settings row yet — that is the
     * normal first-run state, not an error. Callers should treat 404 as
     * "not configured" and let the user create them via PATCH.
     */
    getAttendanceSettings: build.query<AttendanceSettingsResponse, void>({
      query: () => "/attendance-settings/",
      providesTags: [{ type: "Attendance", id: "SETTINGS" }],
    }),

    /**
     * PATCH /attendance-settings/
     *
     * The handler calls `upsert_settings`, so this both creates and updates —
     * there is no separate POST. It applies `model_dump(exclude_unset=True)`,
     * so omitted keys are left untouched server-side.
     */
    updateAttendanceSettings: build.mutation<
      AttendanceSettingsResponse,
      AttendanceSettingsUpdate
    >({
      query: (body) => ({
        url: "/attendance-settings/",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Attendance", id: "SETTINGS" },
        // The geofence gates check-in, so anything derived from it is stale.
        { type: "Attendance", id: "TODAY" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useScanAuthenticateMutation,
  useScanCheckInMutation,
  useScanCheckOutMutation,
  useGetMyAttendanceQuery,
  useGetMyMonthlyStatsQuery,
  useGetTodaySummaryQuery,
  useGetAllAttendanceQuery,
  useGetAttendanceByDateRangeQuery,
  useGetAttendanceByIdQuery,
  useGetOfficeQrQuery,
  useGetAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
} = attendanceApi;
