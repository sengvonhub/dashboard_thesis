"use client";

import React, { useMemo, useState } from "react";
import { Dialog, SearchBar, TextField, apiMessage, initialsOf } from "@/app/(components)/crud";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import {
  useCreateChatGroupMutation,
  useCreateDirectChatMutation,
} from "@/state/tageTypes/services/communicationApi";
import type { ChatGroupResponse } from "@/state/types/chat";

/** Create a group chat or start a DM — one dialog, a type toggle up top. */
export default function NewChatDialog({
  myStaffId,
  canCreateGroup,
  onClose,
  onCreated,
}: {
  myStaffId?: number;
  canCreateGroup: boolean;
  onClose: () => void;
  onCreated: (group: ChatGroupResponse) => void;
}) {
  const [mode, setMode] = useState<"group" | "direct">(canCreateGroup ? "group" : "direct");
  const { data: staff } = useGetAllStaffQuery();
  const [createGroup, { isLoading: creatingGroup }] = useCreateChatGroupMutation();
  const [createDirect, { isLoading: creatingDirect }] = useCreateDirectChatMutation();

  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  // Group-create resolves each member_ids entry via get_by_user_id, not
  // get_by_id, despite the schema calling the field "staff_ids" — so this
  // set holds user_ids, unlike everywhere else in this feature that works
  // in staff_ids. See ChatService.create_group.
  const [memberUserIds, setMemberUserIds] = useState<Set<number>>(new Set());
  const [directStaffId, setDirectStaffId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectableStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (staff ?? [])
      .filter((s) => s.staff_id !== myStaffId)
      .filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [staff, search, myStaffId]);

  // Only staff with a linked user account can be resolved by
  // get_by_user_id, so they're the only ones addable to a new group.
  const groupSelectableStaff = useMemo(
    () => selectableStaff.filter((s) => s.user_id != null),
    [selectableStaff]
  );
  const hiddenUnlinkedCount = selectableStaff.length - groupSelectableStaff.length;

  const toggleMember = (userId: number) =>
    setMemberUserIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const isValid =
    mode === "group"
      ? groupName.trim().length > 0 && memberUserIds.size > 0
      : directStaffId != null;

  const saving = creatingGroup || creatingDirect;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError(
        mode === "group"
          ? "Name the group and pick at least one member."
          : "Pick who to message."
      );
      return;
    }
    try {
      const group =
        mode === "group"
          ? await createGroup({
              group_name: groupName.trim(),
              chat_type: "group",
              member_ids: Array.from(memberUserIds),
            }).unwrap()
          : await createDirect({ staff_id: directStaffId! }).unwrap();
      onCreated(group);
    } catch (err) {
      setError(apiMessage(err, "Could not start this chat."));
    }
  };

  return (
    <Dialog
      title="New chat"
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "group" ? "Create group" : "Start chat"}
      saving={saving}
      error={error}
    >
      {canCreateGroup && (
        <div className="flex gap-1.5">
          {(["group", "direct"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold border"
              style={{
                background: mode === m ? "var(--color-info-tint)" : "transparent",
                borderColor: mode === m ? "var(--color-blurple)" : "var(--color-border)",
                color: mode === m ? "var(--color-blurple)" : "var(--color-text-secondary)",
              }}
            >
              {m === "group" ? "Group" : "Direct message"}
            </button>
          ))}
        </div>
      )}

      {mode === "group" && (
        <TextField label="Group name" value={groupName} onChange={setGroupName} />
      )}

      <div className="flex flex-col gap-1.5">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {mode === "group" ? `Members (${memberUserIds.size} selected)` : "Send to"}
        </span>
        <SearchBar value={search} onChange={setSearch} placeholder="Search staff..." />
        <div
          className="rounded-xl border max-h-56 overflow-y-auto"
          style={{ borderColor: "var(--color-border)" }}
        >
          {!(mode === "group" ? groupSelectableStaff : selectableStaff).length ? (
            <p className="text-xs px-3 py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
              No staff found.
            </p>
          ) : (
            (mode === "group" ? groupSelectableStaff : selectableStaff).map((s) => {
              const selected =
                mode === "group" ? memberUserIds.has(s.user_id!) : directStaffId === s.staff_id;
              return (
                <button
                  key={s.staff_id}
                  type="button"
                  onClick={() =>
                    mode === "group" ? toggleMember(s.user_id!) : setDirectStaffId(s.staff_id)
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2 border-b last:border-b-0 text-left"
                  style={{
                    borderColor: "var(--color-divider)",
                    background: selected ? "var(--color-info-tint)" : "transparent",
                  }}
                >
                  <div
                    className="h-7 w-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{
                      background: s.avatar_url ? "var(--color-surface-card)" : "var(--gradient-brand)",
                    }}
                  >
                    {s.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold" style={{ color: "var(--color-on-accent)" }}>
                        {initialsOf(s.name)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
                    {s.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {mode === "group" && hiddenUnlinkedCount > 0 && (
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {hiddenUnlinkedCount} staff without a linked user account {hiddenUnlinkedCount === 1 ? "is" : "are"}{" "}
            hidden — link one from HR / Staff first.
          </p>
        )}
      </div>
    </Dialog>
  );
}
