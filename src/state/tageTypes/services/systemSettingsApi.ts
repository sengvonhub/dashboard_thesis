import { api } from "@/state/api";
import type {
  BulkCreateRequest,
  BulkUpdateRequest,
  BulkUpdateResponse,
  SystemSettingCreate,
  SystemSettingResponse,
  SystemSettingUpdate,
} from "@/state/types/settings";

/**
 * System settings — company-scoped key/value pairs. Every route is
 * `require_admin`, so a plain staff or manager account gets a 403.
 *
 * Keys are unique per company: POST 409s on a duplicate and PATCH /key/{key}
 * upserts instead. The bulk PATCH upserts every entry, which is what the
 * settings screen uses to save several edited rows in one request.
 */
export const systemSettingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSystemSettings: build.query<SystemSettingResponse[], void>({
      query: () => "/system-settings/",
      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({
                type: "Setting" as const,
                id: s.setting_id,
              })),
              { type: "Setting" as const, id: "LIST" },
            ]
          : [{ type: "Setting" as const, id: "LIST" }],
    }),

    getSystemSetting: build.query<SystemSettingResponse, number>({
      query: (settingId) => `/system-settings/${settingId}`,
      providesTags: (_r, _e, settingId) => [{ type: "Setting", id: settingId }],
    }),

    getSystemSettingByKey: build.query<SystemSettingResponse, string>({
      query: (key) => `/system-settings/key/${key}`,
      providesTags: (_r, _e, key) => [{ type: "Setting", id: `KEY-${key}` }],
    }),

    createSystemSetting: build.mutation<
      SystemSettingResponse,
      SystemSettingCreate
    >({
      query: (body) => ({ url: "/system-settings/", method: "POST", body }),
      invalidatesTags: [{ type: "Setting", id: "LIST" }],
    }),

    bulkCreateSystemSettings: build.mutation<
      SystemSettingResponse[],
      BulkCreateRequest
    >({
      query: (body) => ({ url: "/system-settings/bulk", method: "POST", body }),
      invalidatesTags: [{ type: "Setting", id: "LIST" }],
    }),

    updateSystemSetting: build.mutation<
      SystemSettingResponse,
      { settingId: number; body: SystemSettingUpdate }
    >({
      query: ({ settingId, body }) => ({
        url: `/system-settings/${settingId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { settingId }) => [
        { type: "Setting", id: settingId },
        { type: "Setting", id: "LIST" },
      ],
    }),

    /** Creates the key when it does not exist yet — no 404. */
    upsertSystemSetting: build.mutation<
      SystemSettingResponse,
      { key: string; value: string }
    >({
      query: ({ key, value }) => ({
        url: `/system-settings/key/${key}`,
        method: "PATCH",
        body: { value },
      }),
      invalidatesTags: (_r, _e, { key }) => [
        { type: "Setting", id: `KEY-${key}` },
        { type: "Setting", id: "LIST" },
      ],
    }),

    bulkUpdateSystemSettings: build.mutation<
      BulkUpdateResponse,
      BulkUpdateRequest
    >({
      query: (body) => ({ url: "/system-settings/bulk", method: "PATCH", body }),
      invalidatesTags: [{ type: "Setting", id: "LIST" }],
    }),

    deleteSystemSetting: build.mutation<{ message?: string }, number>({
      query: (settingId) => ({
        url: `/system-settings/${settingId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Setting", id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSystemSettingsQuery,
  useGetSystemSettingQuery,
  useGetSystemSettingByKeyQuery,
  useCreateSystemSettingMutation,
  useBulkCreateSystemSettingsMutation,
  useUpdateSystemSettingMutation,
  useUpsertSystemSettingMutation,
  useBulkUpdateSystemSettingsMutation,
  useDeleteSystemSettingMutation,
} = systemSettingsApi;
