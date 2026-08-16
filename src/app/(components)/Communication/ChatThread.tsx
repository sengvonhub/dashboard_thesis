"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Reply, Send, Trash2, Users, X } from "lucide-react";
import { EmptyState, apiMessage, initialsOf } from "@/app/(components)/crud";
import { useConfirm } from "@/app/(components)/crud/confirm";
import { useAuth } from "@/state/tageTypes/lib/hook";
import {
  useDeleteChatGroupMutation,
  useDeleteChatMessageMutation,
  useGetChatMessagesQuery,
  useMarkAllChatReadMutation,
  useSendChatMessageMutation,
} from "@/state/tageTypes/services/communicationApi";
import type { ChatGroupResponse, ChatMessageResponse } from "@/state/types/chat";
import MembersDialog from "./MembersDialog";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function ChatThread({
  group,
  canManage,
  onGroupDeleted,
}: {
  group: ChatGroupResponse;
  canManage: boolean;
  onGroupDeleted: () => void;
}) {
  const confirm = useConfirm();
  // `sender_id` on a message is a users.user_id (send_message resolves
  // staff_id → user_id before storing it), not a staff_id — compare against
  // the login payload's user_id, not useMe()'s staffId.
  const { user } = useAuth();
  const myUserId = user?.user_id;

  // Polling instead of a websocket — see communicationApi.ts.
  const {
    data: rawMessages,
    isLoading,
    error,
  } = useGetChatMessagesQuery({ groupId: group.group_id }, { pollingInterval: 4000 });
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation();
  const [deleteMessage] = useDeleteChatMessageMutation();
  const [deleteGroup, { isLoading: deletingGroup }] = useDeleteChatGroupMutation();
  const [markAllRead] = useMarkAllChatReadMutation();

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageResponse | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // API returns newest-first; the thread reads oldest-to-newest.
  const messages = useMemo(() => [...(rawMessages ?? [])].reverse(), [rawMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Opening a conversation marks it read, same as most chat apps.
  useEffect(() => {
    markAllRead(group.group_id).catch(() => {});
  }, [group.group_id, markAllRead]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setError2(null);
    try {
      await sendMessage({
        groupId: group.group_id,
        data: {
          content,
          message_type: "text",
          reply_to_id: replyTo?.message_id ?? null,
        },
      }).unwrap();
      setDraft("");
      setReplyTo(null);
    } catch (err) {
      setError2(apiMessage(err, "Could not send this message."));
    }
  };

  const onDeleteMessage = async (m: ChatMessageResponse) => {
    const ok = await confirm({
      title: "Delete message",
      message: "This can't be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteMessage({ groupId: group.group_id, messageId: m.message_id }).unwrap();
    } catch (err) {
      setError2(apiMessage(err, "Could not delete this message."));
    }
  };

  const onDeleteGroup = async () => {
    const ok = await confirm({
      title: `Delete ${group.group_name}`,
      message: "This removes the group, every message, and its attached files. This can't be undone.",
      confirmLabel: "Delete group",
    });
    if (!ok) return;
    try {
      await deleteGroup(group.group_id).unwrap();
      onGroupDeleted();
    } catch (err) {
      setError2(apiMessage(err, "Could not delete this group."));
    }
  };

  return (
    <div
      className="flex-1 min-w-0 rounded-2xl border flex flex-col overflow-hidden"
      style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
    >
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--color-divider)" }}
      >
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-brand)" }}
        >
          {group.chat_type === "direct" ? (
            <span className="text-xs font-bold" style={{ color: "var(--color-on-accent)" }}>
              {initialsOf(group.group_name)}
            </span>
          ) : (
            <Users className="h-4 w-4" style={{ color: "var(--color-on-accent)" }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            {group.group_name}
          </p>
          {group.chat_type !== "direct" && (
            <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
              {group.member_count ?? "—"} member{group.member_count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {group.chat_type !== "direct" && (
          <button
            type="button"
            onClick={() => setMembersOpen(true)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--color-blurple)" }}
          >
            Members
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={onDeleteGroup}
            disabled={deletingGroup}
            aria-label="Delete group"
            className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-50"
            style={{ color: "var(--color-error)" }}
          >
            {deletingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5">
        {error ? (
          <EmptyState message={apiMessage(error, "Could not load messages.")} />
        ) : isLoading ? (
          <EmptyState message="Loading messages..." />
        ) : !messages.length ? (
          <EmptyState message="No messages yet — say hello." />
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUserId;
            const repliedTo = m.reply_to;
            return (
              <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%] group">
                  {!mine && (
                    <p
                      className="text-[11px] font-semibold mb-0.5 px-1"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {m.sender_name ?? `Staff #${m.sender_id}`}
                    </p>
                  )}
                  <div
                    className="rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: mine ? "var(--color-blurple)" : "var(--color-surface-elevated)",
                      color: mine ? "var(--color-on-accent)" : "var(--color-text-primary)",
                    }}
                  >
                    {repliedTo && (
                      <div
                        className="rounded-lg px-2.5 py-1.5 mb-1.5 text-xs truncate"
                        style={{
                          background: mine ? "rgba(255,255,255,0.15)" : "var(--color-surface-card)",
                          color: mine ? "var(--color-on-accent)" : "var(--color-text-secondary)",
                          opacity: 0.85,
                        }}
                      >
                        ↩ {repliedTo.content ?? `${repliedTo.message_type} attachment`}
                      </div>
                    )}
                    {m.is_deleted ? (
                      <p className="text-sm italic" style={{ opacity: 0.7 }}>
                        Message deleted
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-2 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {fmtTime(m.created_at)}
                    </span>
                    {!m.is_deleted && (
                      <button
                        type="button"
                        onClick={() => setReplyTo(m)}
                        aria-label="Reply"
                        className="text-[10px] inline-flex items-center gap-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Reply className="h-3 w-3" /> Reply
                      </button>
                    )}
                    {mine && !m.is_deleted && (
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(m)}
                        aria-label="Delete message"
                        className="text-[10px] inline-flex items-center gap-0.5"
                        style={{ color: "var(--color-error)" }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t shrink-0" style={{ borderColor: "var(--color-divider)" }}>
        {replyTo && (
          <div
            className="flex items-center gap-2 px-4 py-2 border-b"
            style={{ borderColor: "var(--color-divider)", background: "var(--color-surface)" }}
          >
            <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
            <p className="text-xs truncate flex-1" style={{ color: "var(--color-text-secondary)" }}>
              Replying to {replyTo.sender_name ?? `Staff #${replyTo.sender_id}`}: {replyTo.content}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {error2 && (
          <p className="text-xs px-4 pt-2" style={{ color: "var(--color-error)" }}>
            {error2}
          </p>
        )}
        <form onSubmit={onSend} className="flex items-center gap-2 px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
            style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>

      {membersOpen && (
        <MembersDialog group={group} canManage={canManage} onClose={() => setMembersOpen(false)} />
      )}
    </div>
  );
}
