"use client";

import React, { useMemo, useState } from "react";
import { MessageSquarePlus, Users } from "lucide-react";
import { EmptyState, SearchBar, apiMessage, initialsOf } from "@/app/(components)/crud";
import {
  useGetAllChatGroupsQuery,
  useGetMyChatGroupsQuery,
} from "@/state/tageTypes/services/communicationApi";
import type { ChatGroupResponse } from "@/state/types/chat";
import NewChatDialog from "./NewChatDialog";

export default function ChatSidebar({
  activeGroupId,
  myStaffId,
  canCreateGroup,
  onSelect,
}: {
  activeGroupId: number | null;
  myStaffId?: number;
  canCreateGroup: boolean;
  onSelect: (group: ChatGroupResponse) => void;
}) {
  // Kept fresh without a websocket by polling — new groups/DMs show up
  // within a few seconds rather than instantly.
  const { data: groups, isLoading, error } = useGetMyChatGroupsQuery(undefined, {
    pollingInterval: 8000,
  });
  // GET /chat/groups/my currently 500s server-side (ChatGroupMember has no
  // `staff_id` column — see chat_repository.get_my_groups). Managers can
  // fall back to the company-wide list, which doesn't hit that code path,
  // so the sidebar isn't a dead end until the backend fix lands. Drop this
  // fallback once /my is fixed.
  const { data: allGroups, isLoading: allGroupsLoading } = useGetAllChatGroupsQuery(undefined, {
    skip: !error || !canCreateGroup,
  });
  const usingFallback = Boolean(error) && canCreateGroup;
  const source = usingFallback ? allGroups : groups;
  const loading = usingFallback ? allGroupsLoading : isLoading;

  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return source ?? [];
    return (source ?? []).filter((g) => g.group_name.toLowerCase().includes(q));
  }, [source, search]);

  return (
    <div
      className="w-full sm:w-72 shrink-0 rounded-2xl border flex flex-col overflow-hidden"
      style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
    >
      <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "var(--color-divider)" }}>
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search chats..." />
        </div>
        <button
          type="button"
          onClick={() => setNewChatOpen(true)}
          aria-label="New chat"
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      {usingFallback && (
        <p
          className="text-[11px] px-3 py-1.5 border-b"
          style={{ color: "var(--color-warning)", borderColor: "var(--color-divider)" }}
        >
          "My chats" failed to load — showing every company group instead.
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && !usingFallback ? (
          <EmptyState message={apiMessage(error, "Could not load chats.")} />
        ) : loading ? (
          <EmptyState message="Loading chats..." />
        ) : !filtered.length ? (
          <EmptyState message={search ? "No chats match that search." : "No chats yet — start one."} />
        ) : (
          filtered.map((g) => {
            const active = g.group_id === activeGroupId;
            return (
              <button
                key={g.group_id}
                type="button"
                onClick={() => onSelect(g)}
                className="w-full flex items-center gap-3 px-3 py-3 border-b last:border-b-0 text-left"
                style={{
                  borderColor: "var(--color-divider)",
                  background: active ? "var(--color-info-tint)" : "transparent",
                }}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {g.chat_type === "direct" ? (
                    <span className="text-xs font-bold" style={{ color: "var(--color-on-accent)" }}>
                      {initialsOf(g.group_name)}
                    </span>
                  ) : (
                    <Users className="h-4 w-4" style={{ color: "var(--color-on-accent)" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: active ? "var(--color-blurple)" : "var(--color-text-primary)" }}
                  >
                    {g.group_name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                    {g.chat_type === "direct"
                      ? "Direct message"
                      : `${g.member_count ?? "—"} member${g.member_count === 1 ? "" : "s"}`}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {newChatOpen && (
        <NewChatDialog
          myStaffId={myStaffId}
          canCreateGroup={canCreateGroup}
          onClose={() => setNewChatOpen(false)}
          onCreated={(group) => {
            setNewChatOpen(false);
            onSelect(group);
          }}
        />
      )}
    </div>
  );
}
