"use client";

import React, { useState } from "react";
import { MessageSquarePlus, Reply, Send, ShieldCheck, Trash2, Users, X } from "lucide-react";

/**
 * Pure visual mockup — every conversation, message, and member below is
 * hardcoded local state. Nothing here calls the API. This exists only so
 * the chat UI's design can be reviewed while the backend's
 * ChatGroupMember.staff_id/user_id bug (see chat history) is still open.
 *
 * Swap communication/page.tsx back to <ModulePlaceholder> or the real
 * feature (src/app/(components)/Communication/{ChatSidebar,ChatThread}.tsx)
 * when ready — this file is not wired into anything else.
 */

type MockMessage = {
  id: number;
  mine: boolean;
  sender: string;
  content: string;
  time: string;
  replyTo?: { sender: string; content: string };
};

type MockConversation = {
  id: number;
  name: string;
  kind: "direct" | "group";
  subtitle: string;
  members?: { name: string; admin?: boolean }[];
  messages: MockMessage[];
};

const CONVERSATIONS: MockConversation[] = [
  {
    id: 1,
    name: "Sophea Chan",
    kind: "direct",
    subtitle: "Customer · Order #4821",
    messages: [
      {
        id: 1,
        mine: false,
        sender: "Sophea Chan",
        content: "Hi! I placed an order yesterday for 500 business cards — is it still on track for pickup Friday?",
        time: "9:02 AM",
      },
      {
        id: 2,
        mine: true,
        sender: "You",
        content: "Hi Sophea! Let me check the print queue for you one sec.",
        time: "9:04 AM",
      },
      {
        id: 3,
        mine: true,
        sender: "You",
        content: "Yes, you're all set — it's queued for Thursday printing, ready for pickup Friday morning.",
        time: "9:06 AM",
      },
      {
        id: 4,
        mine: false,
        sender: "Sophea Chan",
        content: "Perfect, thank you! Could I also add a matte finish to that order?",
        time: "9:08 AM",
        replyTo: { sender: "You", content: "Yes, you're all set — it's queued for Thursday printing..." },
      },
      {
        id: 5,
        mine: true,
        sender: "You",
        content: "Of course — I've updated it to matte lamination. No extra wait, same pickup time.",
        time: "9:11 AM",
      },
    ],
  },
  {
    id: 2,
    name: "Print Production Team",
    kind: "group",
    subtitle: "6 members",
    members: [
      { name: "You", admin: true },
      { name: "Dara Sok" },
      { name: "Vichet Pov" },
      { name: "Chenda Ly" },
      { name: "Rithy Meas" },
      { name: "Bopha Keo" },
    ],
    messages: [
      {
        id: 1,
        mine: false,
        sender: "Dara Sok",
        content: "Large-format printer is loaded and ready for the banner run this afternoon.",
        time: "8:15 AM",
      },
      {
        id: 2,
        mine: false,
        sender: "Vichet Pov",
        content: "Nice — I'll bring the vinyl stock down from storage.",
        time: "8:17 AM",
      },
      {
        id: 3,
        mine: true,
        sender: "You",
        content: "Thanks both. Client wants the banners by 4pm today, so let's aim to finish printing by 2.",
        time: "8:20 AM",
      },
      {
        id: 4,
        mine: false,
        sender: "Chenda Ly",
        content: "On it — proofs are already approved, so we're good to go straight to print.",
        time: "8:22 AM",
      },
    ],
  },
  {
    id: 3,
    name: "Rithy Meas",
    kind: "direct",
    subtitle: "Staff",
    messages: [
      {
        id: 1,
        mine: false,
        sender: "Rithy Meas",
        content: "Can you cover my shift Saturday? Family thing came up.",
        time: "Yesterday",
      },
      {
        id: 2,
        mine: true,
        sender: "You",
        content: "Sure, no problem — I've got it covered.",
        time: "Yesterday",
      },
    ],
  },
];

function Avatar({ name, size = "h-10 w-10", isGroup = false }: { name: string; size?: string; isGroup?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center shrink-0`}
      style={{ background: "var(--gradient-brand)" }}
    >
      {isGroup ? (
        <Users className="h-4 w-4" style={{ color: "var(--color-on-accent)" }} />
      ) : (
        <span className="text-xs font-bold" style={{ color: "var(--color-on-accent)" }}>
          {initials}
        </span>
      )}
    </div>
  );
}

export default function ChatDesignPreview() {
  const [activeId, setActiveId] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<MockMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  // Local-only extra messages typed during this preview session — never persisted.
  const [localMessages, setLocalMessages] = useState<Record<number, MockMessage[]>>({});

  const active = CONVERSATIONS.find((c) => c.id === activeId)!;
  const messages = [...active.messages, ...(localMessages[active.id] ?? [])];

  const filtered = CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setLocalMessages((prev) => ({
      ...prev,
      [active.id]: [
        ...(prev[active.id] ?? []),
        {
          id: Date.now(),
          mine: true,
          sender: "You",
          content,
          time: "Just now",
          replyTo: replyTo ? { sender: replyTo.sender, content: replyTo.content } : undefined,
        },
      ],
    }));
    setDraft("");
    setReplyTo(null);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* sidebar */}
        <div
          className="w-full sm:w-72 shrink-0 rounded-2xl border flex flex-col overflow-hidden"
          style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
        >
          <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-divider)" }}>
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full rounded-xl border pl-3 pr-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>
            <button
              type="button"
              aria-label="New chat"
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.map((c) => {
              const isActive = c.id === activeId;
              const lastMsg = c.messages[c.messages.length - 1];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setReplyTo(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 border-b last:border-b-0 text-left"
                  style={{
                    borderColor: "var(--color-divider)",
                    background: isActive ? "var(--color-info-tint)" : "transparent",
                  }}
                >
                  <Avatar name={c.name} isGroup={c.kind === "group"} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: isActive ? "var(--color-blurple)" : "var(--color-text-primary)" }}
                    >
                      {c.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {lastMsg ? `${lastMsg.mine ? "You: " : ""}${lastMsg.content}` : c.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* thread */}
        <div
          className="flex-1 min-w-0 rounded-2xl border flex flex-col overflow-hidden"
          style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <Avatar name={active.name} size="h-9 w-9" isGroup={active.kind === "group"} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                {active.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                {active.subtitle}
              </p>
            </div>
            {active.kind === "group" && (
              <button
                type="button"
                onClick={() => setMembersOpen(true)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                style={{ color: "var(--color-blurple)" }}
              >
                Members
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%] group">
                  {!m.mine && active.kind === "group" && (
                    <p className="text-[11px] font-semibold mb-0.5 px-1" style={{ color: "var(--color-text-muted)" }}>
                      {m.sender}
                    </p>
                  )}
                  <div
                    className="rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: m.mine ? "var(--color-blurple)" : "var(--color-surface-elevated)",
                      color: m.mine ? "var(--color-on-accent)" : "var(--color-text-primary)",
                    }}
                  >
                    {m.replyTo && (
                      <div
                        className="rounded-lg px-2.5 py-1.5 mb-1.5 text-xs truncate"
                        style={{
                          background: m.mine ? "rgba(255,255,255,0.15)" : "var(--color-surface-card)",
                          color: m.mine ? "var(--color-on-accent)" : "var(--color-text-secondary)",
                          opacity: 0.85,
                        }}
                      >
                        ↩ {m.replyTo.sender}: {m.replyTo.content}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                  <div
                    className={`flex items-center gap-2 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      m.mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      {m.time}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(m)}
                      aria-label="Reply"
                      className="text-[10px] inline-flex items-center gap-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </button>
                    {m.mine && (
                      <button
                        type="button"
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
            ))}
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
                  Replying to {replyTo.sender}: {replyTo.content}
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
                disabled={!draft.trim()}
                aria-label="Send"
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
                style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {membersOpen && active.members && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4"
          style={{ background: "var(--color-scrim)" }}
          onClick={() => setMembersOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
            style={{
              background: "var(--color-surface-elevated)",
              borderColor: "var(--color-border)",
              boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <h2 className="flex-1 text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {active.name} — members
              </h2>
              <button
                type="button"
                onClick={() => setMembersOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {active.members.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
                  <Avatar name={m.name} size="h-8 w-8" />
                  <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>
                    {m.name}
                  </span>
                  {m.admin && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: "var(--color-blurple)", background: "var(--color-info-tint)" }}
                    >
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
