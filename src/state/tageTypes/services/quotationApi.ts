import { api } from "@/state/api";
import type {
  QuotationCreate,
  QuotationItemCreate,
  QuotationItemResponse,
  QuotationItemUpdate,
  QuotationResponse,
  QuotationStaffGroup,
  QuotationStatusUpdate,
  QuotationSummary,
  QuotationUpdate,
} from "@/state/types/quotation";

/**
 * Quotations — the upstream document that invoices are converted from.
 *
 * `/quotations/my` is `require_staff`; everything else is `require_manager`.
 * Route order on the API puts `/my`, `/staff/{id}`, `/group/staff` and
 * `/summary` ahead of `/{quotation_id}`, so none of them are shadowed.
 */
export const quotationApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── reads ────────────────────────────────────────────
    getQuotations: build.query<
      QuotationResponse[],
      { staffId?: number; customerId?: number; status?: string } | void
    >({
      query: (args) => ({
        url: "/quotations/",
        params: {
          ...(args?.staffId ? { staff_id: args.staffId } : {}),
          ...(args?.customerId ? { customer_id: args.customerId } : {}),
          // The query param is `quo_status`, not `status`.
          ...(args?.status ? { quo_status: args.status } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((q) => ({
                type: "Quotation" as const,
                id: q.quotation_id,
              })),
              { type: "Quotation" as const, id: "LIST" },
            ]
          : [{ type: "Quotation" as const, id: "LIST" }],
    }),

    getMyQuotations: build.query<QuotationResponse[], void>({
      query: () => "/quotations/my",
      providesTags: [{ type: "Quotation", id: "MINE" }],
    }),

    /**
     * NOTE: this 404s when the staff member simply has no quotations yet,
     * rather than returning an empty list — treat 404 as "none".
     */
    getQuotationsByStaff: build.query<QuotationResponse[], number>({
      query: (staffId) => `/quotations/staff/${staffId}`,
      providesTags: [{ type: "Quotation", id: "BY_STAFF" }],
    }),

    getQuotationsGroupedByStaff: build.query<QuotationStaffGroup[], void>({
      query: () => "/quotations/group/staff",
      providesTags: [{ type: "Quotation", id: "GROUPED" }],
    }),

    getQuotationSummary: build.query<QuotationSummary, void>({
      query: () => "/quotations/summary",
      providesTags: [{ type: "Quotation", id: "SUMMARY" }],
    }),

    getQuotation: build.query<QuotationResponse, number>({
      query: (id) => `/quotations/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Quotation", id }],
    }),

    // ── writes ───────────────────────────────────────────
    createQuotation: build.mutation<QuotationResponse, QuotationCreate>({
      query: (body) => ({ url: "/quotations/", method: "POST", body }),
      invalidatesTags: [
        { type: "Quotation", id: "LIST" },
        { type: "Quotation", id: "SUMMARY" },
        { type: "Quotation", id: "GROUPED" },
        // The service notifies the assigned staff member.
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    /** 400s once `invoice_id` is set — converted quotations are frozen. */
    updateQuotation: build.mutation<
      QuotationResponse,
      { id: number; body: QuotationUpdate }
    >({
      query: ({ id, body }) => ({
        url: `/quotations/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Quotation", id },
        { type: "Quotation", id: "LIST" },
        { type: "Quotation", id: "SUMMARY" },
      ],
    }),

    /** 409s when the quotation is already in the requested status. */
    updateQuotationStatus: build.mutation<
      QuotationResponse,
      { id: number; body: QuotationStatusUpdate }
    >({
      query: ({ id, body }) => ({
        url: `/quotations/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Quotation", id },
        { type: "Quotation", id: "LIST" },
        { type: "Quotation", id: "SUMMARY" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    /** Blocked for accepted or already-converted quotations. */
    deleteQuotation: build.mutation<{ message?: string }, number>({
      query: (id) => ({ url: `/quotations/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Quotation", id: "LIST" },
        { type: "Quotation", id: "SUMMARY" },
        { type: "Quotation", id: "GROUPED" },
      ],
    }),

    // ── items (each write recalculates the quotation totals) ──
    getQuotationItems: build.query<QuotationItemResponse[], number>({
      query: (quotationId) => `/quotations/${quotationId}/items`,
      providesTags: (_r, _e, id) => [{ type: "Quotation", id: `ITEMS-${id}` }],
    }),

    addQuotationItem: build.mutation<
      QuotationItemResponse,
      { quotationId: number; body: QuotationItemCreate }
    >({
      query: ({ quotationId, body }) => ({
        url: `/quotations/${quotationId}/items`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { quotationId }) => [
        { type: "Quotation", id: quotationId },
        { type: "Quotation", id: `ITEMS-${quotationId}` },
        { type: "Quotation", id: "LIST" },
      ],
    }),

    updateQuotationItem: build.mutation<
      QuotationItemResponse,
      { quotationId: number; itemId: number; body: QuotationItemUpdate }
    >({
      query: ({ quotationId, itemId, body }) => ({
        url: `/quotations/${quotationId}/items/${itemId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { quotationId }) => [
        { type: "Quotation", id: quotationId },
        { type: "Quotation", id: `ITEMS-${quotationId}` },
        { type: "Quotation", id: "LIST" },
      ],
    }),

    deleteQuotationItem: build.mutation<
      { message?: string },
      { quotationId: number; itemId: number }
    >({
      query: ({ quotationId, itemId }) => ({
        url: `/quotations/${quotationId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { quotationId }) => [
        { type: "Quotation", id: quotationId },
        { type: "Quotation", id: `ITEMS-${quotationId}` },
        { type: "Quotation", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetQuotationsQuery,
  useGetMyQuotationsQuery,
  useGetQuotationsByStaffQuery,
  useGetQuotationsGroupedByStaffQuery,
  useGetQuotationSummaryQuery,
  useGetQuotationQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useDeleteQuotationMutation,
  useGetQuotationItemsQuery,
  useAddQuotationItemMutation,
  useUpdateQuotationItemMutation,
  useDeleteQuotationItemMutation,
} = quotationApi;
