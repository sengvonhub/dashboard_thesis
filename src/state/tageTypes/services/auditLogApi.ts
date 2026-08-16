import { api } from "@/state/api";
import type { AuditLogResponse } from "@/state/types/audit";

/**
 * Audit log — every route is `require_superuser`, so a manager or staff
 * account gets a 403 rather than an empty list. The screen gates on that
 * before subscribing.
 *
 * All lists are read-only and newest-first, capped by `limit` (1..500,
 * default 50). There is no pagination and no total count: asking for more
 * means raising `limit`.
 */
export const auditLogApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAuditLogs: build.query<AuditLogResponse[], { limit?: number } | void>({
      query: (args) => ({
        url: "/audit-logs/",
        params: { limit: args?.limit ?? 50 },
      }),
      providesTags: [{ type: "Audit", id: "LIST" }],
    }),

    getAuditLogsByUser: build.query<
      AuditLogResponse[],
      { userId: number; limit?: number }
    >({
      query: ({ userId, limit = 50 }) => ({
        url: `/audit-logs/user/${userId}`,
        params: { limit },
      }),
      providesTags: (_r, _e, { userId }) => [
        { type: "Audit", id: `USER-${userId}` },
      ],
    }),

    getAuditLogsByTable: build.query<
      AuditLogResponse[],
      { tableName: string; limit?: number }
    >({
      query: ({ tableName, limit = 50 }) => ({
        url: `/audit-logs/table/${tableName}`,
        params: { limit },
      }),
      providesTags: (_r, _e, { tableName }) => [
        { type: "Audit", id: `TABLE-${tableName}` },
      ],
    }),

    /**
     * NOTE: this route declares `limit: str` with no default, so unlike every
     * other audit route it is a REQUIRED query param and arrives as a string.
     * Omitting it is a 422, so `limit` is always sent here.
     */
    getAuditLogsByAction: build.query<
      AuditLogResponse[],
      { action: string; limit?: number }
    >({
      query: ({ action, limit = 50 }) => ({
        url: `/audit-logs/action/${action}`,
        params: { limit: String(limit) },
      }),
      providesTags: (_r, _e, { action }) => [
        { type: "Audit", id: `ACTION-${action}` },
      ],
    }),

    getAuditLog: build.query<AuditLogResponse, number>({
      query: (logId) => `/audit-logs/${logId}`,
      providesTags: (_r, _e, logId) => [{ type: "Audit", id: logId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogsByUserQuery,
  useGetAuditLogsByTableQuery,
  useGetAuditLogsByActionQuery,
  useGetAuditLogQuery,
} = auditLogApi;
