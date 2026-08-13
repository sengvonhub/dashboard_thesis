import { api } from "@/state/api";
import type {
  CompanyCreate,
  CompanyUpdate,
  CompanyResponse,
  CompanyRegisterRequest,
  CompanyRegisterResponse,
  CompanySettingsResponse,
  CompanyStatsResponse,
  CompanyStatusHistoryResponse,
  UpdatePlanRequest,
  UpdateStatusRequest,
} from "@/state/types/company";

export type {
  CompanyRegisterRequest,
  CompanyRegisterResponse,
} from "@/state/types/company";

export const companyApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Public ───────────────────────────────────────────
    // The only unauthenticated company route. Rate limited to 100/min per IP.
    registerCompany: build.mutation<CompanyRegisterResponse, CompanyRegisterRequest>({
      query: (body) => ({
        url: "/companies/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Company", "Auth"],
    }),

    // ── Company records ──────────────────────────────────
    getCompanies: build.query<CompanyResponse[], void>({
      query: () => "/companies/",
      providesTags: [{ type: "Company", id: "LIST" }],
    }),

    getCompany: build.query<CompanyResponse, number>({
      query: (companyId) => `/companies/${companyId}`,
      providesTags: (_r, _e, companyId) => [{ type: "Company", id: companyId }],
    }),

    createCompany: build.mutation<CompanyResponse, CompanyCreate>({
      query: (body) => ({ url: "/companies/", method: "POST", body }),
      invalidatesTags: [{ type: "Company", id: "LIST" }],
    }),

    updateCompany: build.mutation<
      CompanyResponse,
      { companyId: number; body: CompanyUpdate }
    >({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { companyId }) => [
        { type: "Company", id: companyId },
        { type: "Company", id: "LIST" },
      ],
    }),

    deleteCompany: build.mutation<{ message?: string }, number>({
      query: (companyId) => ({
        url: `/companies/${companyId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Company", id: "LIST" }],
    }),

    /**
     * multipart/form-data — do NOT set Content-Type by hand; the browser has
     * to add the multipart boundary itself. RTK Query passes FormData through
     * untouched, which is what we want here.
     */
    updateCompanyMedia: build.mutation<
      CompanyResponse,
      {
        companyId: number;
        logo?: File | null;
        banner?: File | null;
        oldLogoPublicId?: string | null;
        oldBannerPublicId?: string | null;
      }
    >({
      query: ({ companyId, logo, banner, oldLogoPublicId, oldBannerPublicId }) => {
        const form = new FormData();
        if (logo) form.append("logo", logo);
        if (banner) form.append("banner", banner);
        if (oldLogoPublicId) form.append("old_logo_public_id", oldLogoPublicId);
        if (oldBannerPublicId) form.append("old_banner_public_id", oldBannerPublicId);
        return {
          url: `/companies/${companyId}/media`,
          method: "PATCH",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { companyId }) => [
        { type: "Company", id: companyId },
      ],
    }),

    // ── Sub-resources ────────────────────────────────────
    getCompanySettings: build.query<CompanySettingsResponse, number>({
      query: (companyId) => `/companies/${companyId}/settings`,
      providesTags: (_r, _e, companyId) => [
        { type: "Company", id: `SETTINGS-${companyId}` },
      ],
    }),

    getCompanyStats: build.query<CompanyStatsResponse, number>({
      query: (companyId) => `/companies/${companyId}/stats`,
      providesTags: (_r, _e, companyId) => [
        { type: "Company", id: `STATS-${companyId}` },
      ],
    }),

    getCompanyHistory: build.query<CompanyStatusHistoryResponse[], number>({
      query: (companyId) => `/companies/${companyId}/history`,
      providesTags: (_r, _e, companyId) => [
        { type: "Company", id: `HISTORY-${companyId}` },
      ],
    }),

    updateCompanyPlan: build.mutation<
      CompanyResponse,
      { companyId: number; body: UpdatePlanRequest }
    >({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/plan`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { companyId }) => [
        { type: "Company", id: companyId },
        { type: "Company", id: "LIST" },
      ],
    }),

    updateCompanyStatus: build.mutation<
      CompanyStatusHistoryResponse,
      { companyId: number; body: UpdateStatusRequest }
    >({
      query: ({ companyId, body }) => ({
        url: `/companies/${companyId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { companyId }) => [
        { type: "Company", id: companyId },
        { type: "Company", id: `HISTORY-${companyId}` },
        { type: "Company", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterCompanyMutation,
  useGetCompaniesQuery,
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useUpdateCompanyMediaMutation,
  useGetCompanySettingsQuery,
  useGetCompanyStatsQuery,
  useGetCompanyHistoryQuery,
  useUpdateCompanyPlanMutation,
  useUpdateCompanyStatusMutation,
} = companyApi;
