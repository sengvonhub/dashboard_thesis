import { api } from "@/state/api";
import type {
  SalaryResponse,
  SalarySummaryResponse,
  SalaryAdjustmentCreate,
  SalaryAdjustmentResponse,
  SalaryCreate,
  SalaryStaffGroupResponse,
  SalaryUpdate,
  MarkPaidRequest,
} from "@/state/types/salaries";

export const salariesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMySalaries: build.query<SalaryResponse[], void>({
      query: () => "/salaries/my",
      providesTags: [{ type: "HR", id: "SALARY-ME" }],
    }),

    // ── Manager: reads ───────────────────────────────
    /** GET /salaries/staff/{staff_id} — all salary records for one staff. */


    getSalariesByStaff: build.query<SalaryResponse[], number>({
      query: (staffId) => `/salaries/staff/${staffId}`,
      providesTags: (_r, _e, staffId) => [
        { type: "HR", id: `SALARY-BY_STAFF-${staffId}` },
      ],
    }),

    /** GET /salaries/group/staff — salaries grouped by staff + user. */
    getSalariesGroupedByStaff: build.query<SalaryStaffGroupResponse[], void>({
      query: () => "/salaries/group/staff",
      providesTags: [{ type: "HR", id: "SALARY-GROUP" }],
    }),

    /** GET /salaries/ — optional staff_id / pay_status filters. */
    getAllSalaries: build.query<
      SalaryResponse[],
      { staffId?: number; payStatus?: string } | void
    >({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.staffId != null) params.set("staff_id", String(args.staffId));
        if (args?.payStatus) params.set("pay_status", args.payStatus);
        const qs = params.toString();
        return `/salaries/${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({
                type: "HR" as const,
                id: `SALARY-${s.salary_id}`,
              })),
              { type: "HR" as const, id: "SALARY-LIST" },
            ]
          : [{ type: "HR" as const, id: "SALARY-LIST" }],
    }),

    /** GET /salaries/summary — dashboard stat card data. */
    getSalarySummary: build.query<SalarySummaryResponse, void>({
      query: () => "/salaries/summary",
      providesTags: [{ type: "HR", id: "SALARY-SUMMARY" }],
    }),

    /** GET /salaries/{id}. */
    getSalaryById: build.query<SalaryResponse, number>({
      query: (salaryId) => `/salaries/${salaryId}`,
      providesTags: (_r, _e, salaryId) => [
        { type: "HR", id: `SALARY-${salaryId}` },
      ],
    }),

    // ── Manager: writes ──────────────────────────────
    /** POST /salaries/ — creates a record and notifies the staff member. */
    createSalary: build.mutation<SalaryResponse, SalaryCreate>({
      query: (body) => ({ url: "/salaries/", method: "POST", body }),
      invalidatesTags: (result) => [
        { type: "HR", id: "SALARY-LIST" },
        { type: "HR", id: "SALARY-SUMMARY" },
        { type: "HR", id: "SALARY-GROUP" },
        { type: "HR", id: "SALARY-ME" },
        ...(result
          ? [{ type: "HR" as const, id: `SALARY-BY_STAFF-${result.staff_id}` }]
          : []),
      ],
    }),

    /** PATCH /salaries/{id} — recalculates net_salary server-side. */
    updateSalary: build.mutation<SalaryResponse, { salaryId: number; data: SalaryUpdate }>({
      query: ({ salaryId, data }) => ({
        url: `/salaries/${salaryId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, _e, { salaryId }) => [
        { type: "HR", id: `SALARY-${salaryId}` },
        { type: "HR", id: "SALARY-LIST" },
        { type: "HR", id: "SALARY-SUMMARY" },
        { type: "HR", id: "SALARY-GROUP" },
        { type: "HR", id: "SALARY-ME" },
        ...(result
          ? [{ type: "HR" as const, id: `SALARY-BY_STAFF-${result.staff_id}` }]
          : []),
      ],
    }),

    /**
     * PATCH /salaries/{id}/mark-paid — 409 if already paid. Omit
     * `payment_date` to let the server stamp today.
     */
    markSalaryPaid: build.mutation<SalaryResponse, { salaryId: number; data?: MarkPaidRequest }>({
      query: ({ salaryId, data }) => ({
        url: `/salaries/${salaryId}/mark-paid`,
        method: "PATCH",
        body: data?.payment_date ? { payment_date: data.payment_date } : {},
      }),
      invalidatesTags: (result, _e, { salaryId }) => [
        { type: "HR", id: `SALARY-${salaryId}` },
        { type: "HR", id: "SALARY-LIST" },
        { type: "HR", id: "SALARY-SUMMARY" },
        { type: "HR", id: "SALARY-GROUP" },
        { type: "HR", id: "SALARY-ME" },
        ...(result
          ? [{ type: "HR" as const, id: `SALARY-BY_STAFF-${result.staff_id}` }]
          : []),
      ],
    }),

    /** DELETE /salaries/{id} — 400 if the record is already paid. */
    deleteSalary: build.mutation<{ message?: string }, { salaryId: number; staffId?: number }>({
      query: ({ salaryId }) => ({
        url: `/salaries/${salaryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { salaryId, staffId }) => [
        { type: "HR", id: `SALARY-${salaryId}` },
        { type: "HR", id: "SALARY-LIST" },
        { type: "HR", id: "SALARY-SUMMARY" },
        { type: "HR", id: "SALARY-GROUP" },
        { type: "HR", id: "SALARY-ME" },
        ...(staffId != null
          ? [{ type: "HR" as const, id: `SALARY-BY_STAFF-${staffId}` }]
          : []),
      ],
    }),

    // ── Adjustments ───────────────────────────────────
    /** GET /salaries/{id}/adjustments. */
    getSalaryAdjustments: build.query<SalaryAdjustmentResponse[], number>({
      query: (salaryId) => `/salaries/${salaryId}/adjustments`,
      providesTags: (_r, _e, salaryId) => [
        { type: "HR", id: `SALARY-ADJ-${salaryId}` },
      ],
    }),

    // ///////////////////////////////////////////////////




    /**
     * POST /salaries/adjustments — adds a bonus/deduction and recalculates
     * the parent salary's net_salary, so invalidate the parent record too.
     */
    createSalaryAdjustment: build.mutation<SalaryAdjustmentResponse, SalaryAdjustmentCreate>({
      query: (body) => ({ url: "/salaries/adjustments", method: "POST", body }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "HR", id: `SALARY-ADJ-${result.salary_id}` },
              { type: "HR", id: `SALARY-${result.salary_id}` },
              { type: "HR", id: "SALARY-LIST" },
              { type: "HR", id: "SALARY-SUMMARY" },
              { type: "HR", id: "SALARY-GROUP" },
              { type: "HR", id: "SALARY-ME" },
            ]
          : [{ type: "HR", id: "SALARY-LIST" }],
    }),

    /**
     * DELETE /salaries/adjustments/{id} — pass `salaryId` from the row you
     * already have loaded so the parent record's cache gets invalidated too
     * (the response body is just a message, no salary_id to key off of).
     */
    deleteSalaryAdjustment: build.mutation<{ message?: string }, { adjustmentId: number; salaryId: number }>({
      query: ({ adjustmentId }) => ({
        url: `/salaries/adjustments/${adjustmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { salaryId }) => [
        { type: "HR", id: `SALARY-ADJ-${salaryId}` },
        { type: "HR", id: `SALARY-${salaryId}` },
        { type: "HR", id: "SALARY-LIST" },
        { type: "HR", id: "SALARY-SUMMARY" },
        { type: "HR", id: "SALARY-GROUP" },
        { type: "HR", id: "SALARY-ME" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMySalariesQuery,
  useGetSalariesByStaffQuery,
  useGetSalariesGroupedByStaffQuery,
  useGetAllSalariesQuery,
  useGetSalarySummaryQuery,
  useGetSalaryByIdQuery,
  useCreateSalaryMutation,
  useUpdateSalaryMutation,
  useMarkSalaryPaidMutation,
  useDeleteSalaryMutation,
  useGetSalaryAdjustmentsQuery,
  useCreateSalaryAdjustmentMutation,
  useDeleteSalaryAdjustmentMutation,
} = salariesApi;