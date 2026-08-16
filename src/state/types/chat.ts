/** Transcribed from app/schemas/chatSchema.py. */

export type ChatType = "group" | "direct";
export type MessageType = "text" | "image" | "video" | "audio" | "voice" | "file";

// ── Groups ───────────────────────────────────────────────
/** POST /chat/groups — [Manager]. */
export interface ChatGroupCreate {
  group_name: string;
  chat_type?: ChatType; // defaults to "group"
  member_ids: number[]; // staff_ids, at least one
}

/** POST /chat/direct — returns the existing DM if one already exists. */
export interface DirectMessageCreate {
  staff_id: number;
}

export interface ChatGroupResponse {
  group_id: number;
  company_id: number;
  group_name: string;
  chat_type: string;
  created_by: number;
  is_active: boolean;
  created_at: string;
  member_count?: number | null;
}

// ── Members ──────────────────────────────────────────────
/**
 * POST /chat/groups/{id}/members — [Manager].
 *
 * Still `staff_ids` on the way in (matches `service.add_members(..., staff_ids, ...)`
 * and every staff-id-shaped request elsewhere), even though the *response*
 * shape below turned out to use `user_id` — see the note there.
 */
export interface AddMemberRequest {
  staff_ids: number[];
}

/**
 * GET /chat/groups/{id}/members has no `response_model` on the route, so this
 * is transcribed from the literal dict `ChatService.get_members` builds —
 * NOT from the (unused, for this route) `ChatMemberResponse` Pydantic class.
 * Confirmed from the traceback + pasted source: `ChatGroupMember` has no
 * `staff_id` column; membership is keyed by `user_id` instead. `staff_name`
 * is still the display name, just sourced from `m.user.username`.
 */
export interface ChatMemberResponse {
  member_id: number;
  group_id: number;
  user_id: number;
  company_id: number;
  joined_at: string;
  is_admin: boolean;
  staff_name?: string | null;
}

/** GET /chat/groups/{id}/online — inline dict, not a declared schema. */
export interface ChatOnlineMembersResponse {
  group_id: number;
  online_staff_ids: number[];
  count: number;
}

// ── Messages ─────────────────────────────────────────────
/** POST /chat/groups/{id}/messages. */
export interface SendMessageRequest {
  content?: string | null;
  message_type?: MessageType; // defaults to "text"
  reply_to_id?: number | null;
}

/** A trimmed preview of the message being replied to, nested by GET /messages. */
export interface ChatReplyPreview {
  message_id: number;
  sender_id: number;
  content?: string | null;
  message_type: string;
}

/**
 * GET /chat/groups/{id}/messages also has no `response_model` — transcribed
 * from `ChatService.get_messages`'s hand-built dict, which differs from the
 * `ChatMessageResponse` Pydantic class in several ways: `sender_id` is a
 * `users.user_id` (not a staff_id — `send_message` resolves staff_id →
 * user_id before storing it), `reply_to_id` is a real int here (not the
 * oddly-`str`-typed one on the unused schema), there's a nested `reply_to`
 * preview object, and `is_read` is present while `publice` is not (that
 * field is only used server-side for Cloudinary cleanup, never serialized).
 *
 * `has_more` is set inside the per-item dict comprehension rather than once
 * at the top level, so every item in a page carries the same value — read it
 * off any one message rather than expecting a separate pagination field.
 */
export interface ChatMessageResponse {
  message_id: number;
  group_id: number;
  company_id: number;
  sender_id: number;
  sender_name?: string | null;
  message_type: string;
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_secs?: number | null;
  media_thumbnail?: string | null;
  reply_to_id?: number | null;
  reply_to?: ChatReplyPreview | null;
  is_deleted: boolean;
  is_read: boolean;
  created_at: string;
  has_more?: boolean;
}
