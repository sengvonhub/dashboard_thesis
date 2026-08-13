import { api } from "@/state/api";
import type {
  NotificationCreate,
  NotificationResponse,
  NotificationSummaryResponse,
} from "@/state/types/notification";

export interface MyNotificationsArgs {
  unreadOnly?: boolean;
}

/** Normalised so `undefined` and `{}` share one cache entry. */
const listKey = (args?: MyNotificationsArgs) => ({
  unreadOnly: args?.unreadOnly ?? false,
});

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Mine ─────────────────────────────────────────────
    getMyNotifications: build.query<
      NotificationResponse[],
      MyNotificationsArgs | void
    >({
      query: (args) => ({
        url: "/notifications/my",
        params: { unread_only: listKey(args ?? undefined).unreadOnly },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((n) => ({
                type: "Notification" as const,
                id: n.notification_id,
              })),
              { type: "Notification" as const, id: "LIST" },
            ]
          : [{ type: "Notification" as const, id: "LIST" }],
    }),

    getMyNotificationSummary: build.query<NotificationSummaryResponse, void>({
      query: () => "/notifications/my/summary",
      providesTags: [{ type: "Notification", id: "SUMMARY" }],
    }),

    markNotificationRead: build.mutation<NotificationResponse, number>({
      query: (notificationId) => ({
        url: `/notifications/my/${notificationId}/read`,
        method: "PATCH",
      }),
      // Flip it locally first so the row and the badge react on click rather
      // than after the round trip; undo if the request fails.
      async onQueryStarted(notificationId, { dispatch, queryFulfilled }) {
        const patches = [
          dispatch(
            notificationsApi.util.updateQueryData(
              "getMyNotifications",
              { unreadOnly: false },
              (draft) => {
                const hit = draft.find(
                  (n) => n.notification_id === notificationId
                );
                if (hit && !hit.is_read) hit.is_read = true;
              }
            )
          ),
          dispatch(
            notificationsApi.util.updateQueryData(
              "getMyNotificationSummary",
              undefined,
              (draft) => {
                if (draft.unread > 0) {
                  draft.unread -= 1;
                  draft.read += 1;
                }
              }
            )
          ),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
      invalidatesTags: [{ type: "Notification", id: "SUMMARY" }],
    }),

    markAllNotificationsRead: build.mutation<{ message?: string }, void>({
      query: () => ({ url: "/notifications/my/read-all", method: "PATCH" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    bulkMarkNotificationsRead: build.mutation<{ message?: string }, number[]>({
      query: (notificationIds) => ({
        url: "/notifications/my/bulk-read",
        method: "PATCH",
        body: { notification_ids: notificationIds },
      }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    deleteNotification: build.mutation<{ message?: string }, number>({
      query: (notificationId) => ({
        url: `/notifications/my/${notificationId}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    /**
     * DELETE /notifications/my/clear-read
     *
     * WARNING: this currently 422s on the API. `DELETE /my/{notification_id}`
     * is declared BEFORE `DELETE /my/clear-read`, and both are a single path
     * segment after `/my`, so FastAPI matches the dynamic route first and
     * fails parsing "clear-read" as an int. Moving the clear-read route above
     * the `{notification_id}` one fixes it — the request here is correct.
     */
    clearReadNotifications: build.mutation<{ message?: string }, void>({
      query: () => ({ url: "/notifications/my/clear-read", method: "DELETE" }),
      invalidatesTags: [
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),

    // ── Admin ────────────────────────────────────────────
    getAllNotifications: build.query<
      NotificationResponse[],
      MyNotificationsArgs | void
    >({
      query: (args) => ({
        url: "/notifications/",
        params: { unread_only: listKey(args ?? undefined).unreadOnly },
      }),
      providesTags: [{ type: "Notification", id: "ALL" }],
    }),

    createNotification: build.mutation<NotificationResponse, NotificationCreate>({
      query: (body) => ({ url: "/notifications/", method: "POST", body }),
      invalidatesTags: [
        { type: "Notification", id: "ALL" },
        { type: "Notification", id: "LIST" },
        { type: "Notification", id: "SUMMARY" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyNotificationsQuery,
  useGetMyNotificationSummaryQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useBulkMarkNotificationsReadMutation,
  useDeleteNotificationMutation,
  useClearReadNotificationsMutation,
  useGetAllNotificationsQuery,
  useCreateNotificationMutation,
} = notificationsApi;
