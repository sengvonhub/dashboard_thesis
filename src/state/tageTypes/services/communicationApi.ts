import { api } from "@/state/api";
import type {
  AddMemberRequest,
  ChatGroupCreate,
  ChatGroupResponse,
  ChatMemberResponse,
  ChatMessageResponse,
  ChatOnlineMembersResponse,
  DirectMessageCreate,
  SendMessageRequest,
} from "@/state/types/chat";

/**
 * Chat: groups, DMs, members, and text messages (`app/routers/chat_router.py`).
 *
 * Media send routes (image/video/audio/voice/file) and the websocket layer
 * are not wired up here yet — text-only for now, with polling instead of
 * push for near-live updates.
 *
 * Guards: creating/deleting a group and managing members are `require_manager`;
 * everything else (DMs, messages, read receipts) is `require_login`.
 */
export const communicationApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Groups ───────────────────────────────────────────
    getMyChatGroups: build.query<ChatGroupResponse[], void>({
      query: () => "/chat/groups/my",
      providesTags: (result) =>
        result
          ? [
              ...result.map((g) => ({ type: "Communication" as const, id: g.group_id })),
              { type: "Communication" as const, id: "GROUPS_MINE" },
            ]
          : [{ type: "Communication" as const, id: "GROUPS_MINE" }],
    }),

    /** [Manager] — every group in the company, not just the caller's. */
    getAllChatGroups: build.query<ChatGroupResponse[], void>({
      query: () => "/chat/groups",
      providesTags: [{ type: "Communication", id: "GROUPS_ALL" }],
    }),

    getChatGroup: build.query<ChatGroupResponse, number>({
      query: (groupId) => `/chat/groups/${groupId}`,
      providesTags: (_r, _e, groupId) => [{ type: "Communication", id: groupId }],
    }),

    /** [Manager] — creates a group and adds the initial members. */
    createChatGroup: build.mutation<ChatGroupResponse, ChatGroupCreate>({
      query: (body) => ({ url: "/chat/groups", method: "POST", body }),
      invalidatesTags: [
        { type: "Communication", id: "GROUPS_MINE" },
        { type: "Communication", id: "GROUPS_ALL" },
      ],
    }),

    /** Starts a 1-to-1 DM, or returns the existing one for this staff pair. */
    createDirectChat: build.mutation<ChatGroupResponse, DirectMessageCreate>({
      query: (body) => ({ url: "/chat/direct", method: "POST", body }),
      invalidatesTags: [{ type: "Communication", id: "GROUPS_MINE" }],
    }),

    /** [Manager] — deletes the group, its messages, and Cloudinary assets. */
    deleteChatGroup: build.mutation<void, number>({
      query: (groupId) => ({ url: `/chat/groups/${groupId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, groupId) => [
        { type: "Communication", id: groupId },
        { type: "Communication", id: "GROUPS_MINE" },
        { type: "Communication", id: "GROUPS_ALL" },
      ],
    }),

    // ── Members ──────────────────────────────────────────
    getChatMembers: build.query<ChatMemberResponse[], number>({
      query: (groupId) => `/chat/groups/${groupId}/members`,
      providesTags: (_r, _e, groupId) => [{ type: "Communication", id: `MEMBERS-${groupId}` }],
    }),

    /** [Manager]. */
    addChatMembers: build.mutation<unknown, { groupId: number; staffIds: number[] }>({
      query: ({ groupId, staffIds }) => ({
        url: `/chat/groups/${groupId}/members`,
        method: "POST",
        body: { staff_ids: staffIds } satisfies AddMemberRequest,
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Communication", id: `MEMBERS-${groupId}` },
        { type: "Communication", id: groupId },
      ],
    }),

    /** [Manager]. */
    removeChatMember: build.mutation<unknown, { groupId: number; staffId: number }>({
      query: ({ groupId, staffId }) => ({
        url: `/chat/groups/${groupId}/members/${staffId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Communication", id: `MEMBERS-${groupId}` },
        { type: "Communication", id: groupId },
      ],
    }),

    /** Snapshot, not push — poll this if you want it to stay fresh. */
    getOnlineChatMembers: build.query<ChatOnlineMembersResponse, number>({
      query: (groupId) => `/chat/groups/${groupId}/online`,
    }),

    // ── Messages ─────────────────────────────────────────
    /** Newest first; pass `beforeId` (the oldest message_id you have) to page further back. */
    getChatMessages: build.query<
      ChatMessageResponse[],
      { groupId: number; beforeId?: number; limit?: number }
    >({
      query: ({ groupId, beforeId, limit }) => ({
        url: `/chat/groups/${groupId}/messages`,
        params: {
          ...(beforeId != null ? { before_id: beforeId } : {}),
          limit: limit ?? 50,
        },
      }),
      providesTags: (_r, _e, { groupId }) => [{ type: "Communication", id: `MESSAGES-${groupId}` }],
    }),

    /**
     * The route has no `response_model` and the service returns the raw
     * `ChatMessage` ORM row — not the dict shape `get_messages` builds. The
     * response payload here is genuinely unconfirmed, so the return type is
     * `unknown` rather than `ChatMessageResponse`; the UI never reads it
     * directly, relying on the invalidated `MESSAGES` list to refetch instead.
     */
    sendChatMessage: build.mutation<unknown, { groupId: number; data: SendMessageRequest }>({
      query: ({ groupId, data }) => ({
        url: `/chat/groups/${groupId}/messages`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Communication", id: `MESSAGES-${groupId}` },
        { type: "Communication", id: "GROUPS_MINE" },
      ],
    }),

    markChatMessageRead: build.mutation<unknown, { groupId: number; messageId: number }>({
      query: ({ groupId, messageId }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Communication", id: `MESSAGES-${groupId}` },
        { type: "Communication", id: `UNREAD-${groupId}` },
      ],
    }),

    markAllChatRead: build.mutation<unknown, number>({
      query: (groupId) => ({ url: `/chat/groups/${groupId}/messages/read-all`, method: "PATCH" }),
      invalidatesTags: (_r, _e, groupId) => [
        { type: "Communication", id: `MESSAGES-${groupId}` },
        { type: "Communication", id: `UNREAD-${groupId}` },
      ],
    }),

    /** `ChatService.get_unread_count` returns `{group_id, unread_count}`. */
    getChatUnreadCount: build.query<{ group_id: number; unread_count: number }, number>({
      query: (groupId) => `/chat/groups/${groupId}/messages/unread-count`,
      providesTags: (_r, _e, groupId) => [{ type: "Communication", id: `UNREAD-${groupId}` }],
    }),

    /** Soft-delete of your own message. */
    deleteChatMessage: build.mutation<unknown, { groupId: number; messageId: number }>({
      query: ({ groupId, messageId }) => ({
        url: `/chat/groups/${groupId}/messages/${messageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: "Communication", id: `MESSAGES-${groupId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyChatGroupsQuery,
  useGetAllChatGroupsQuery,
  useGetChatGroupQuery,
  useCreateChatGroupMutation,
  useCreateDirectChatMutation,
  useDeleteChatGroupMutation,
  useGetChatMembersQuery,
  useAddChatMembersMutation,
  useRemoveChatMemberMutation,
  useGetOnlineChatMembersQuery,
  useGetChatMessagesQuery,
  useSendChatMessageMutation,
  useMarkChatMessageReadMutation,
  useMarkAllChatReadMutation,
  useGetChatUnreadCountQuery,
  useDeleteChatMessageMutation,
} = communicationApi;
