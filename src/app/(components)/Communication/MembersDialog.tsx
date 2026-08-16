"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Plus, ShieldCheck, UserMinus, X } from "lucide-react";
import { EmptyState, SearchBar, apiMessage, initialsOf } from "@/app/(components)/crud";
import { useConfirm } from "@/app/(components)/crud/confirm";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import {
  useAddChatMembersMutation,
  useGetChatMembersQuery,
  useRemoveChatMemberMutation,
} from "@/state/tageTypes/services/communicationApi";
import type { ChatGroupResponse } from "@/state/types/chat";

/** View/add/remove members of a group. Add/remove are manager-only. */
export default function MembersDialog({
  group,
  canManage,
  onClose,
}: {
  group: ChatGroupResponse;
  canManage: boolean;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const { data: members, isLoading, error } = useGetChatMembersQuery(group.group_id);
  const { data: staff } = useGetAllStaffQuery(undefined, { skip: !canManage });
  const [addMembers, { isLoading: adding }] = useAddChatMembersMutation();
  const [removeMember, { isLoading: removing }] = useRemoveChatMemberMutation();

  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState<Set<number>>(new Set());
  const [pageError, setPageError] = useState<string | null>(null);

  // GET /chat/groups/{id}/members returns each row's users.user_id (not a
  // staff_id — see the note on ChatMemberResponse), but the remove route is
  // DELETE /members/{staff_id}. Resolve user_id -> staff_id via the staff
  // list so "remove" can send the id the route actually expects.
  const staffIdByUserId = useMemo(() => {
    const map = new Map<number, number>();
    staff?.forEach((s) => {
      if (s.user_id != null) map.set(s.user_id, s.staff_id);
    });
    return map;
  }, [staff]);

  const memberUserIds = useMemo(
    () => new Set((members ?? []).map((m) => m.user_id)),
    [members]
  );

  const addableStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (staff ?? [])
      .filter((s) => s.user_id == null || !memberUserIds.has(s.user_id))
      .filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [staff, memberUserIds, search]);

  const togglePick = (id: number) =>
    setPicking((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const onAddPicked = async () => {
    if (!picking.size) return;
    setPageError(null);
    try {
      await addMembers({ groupId: group.group_id, staffIds: Array.from(picking) }).unwrap();
      setPicking(new Set());
    } catch (err) {
      setPageError(apiMessage(err, "Could not add these members."));
    }
  };

  const onRemove = async (userId: number, name: string) => {
    const staffId = staffIdByUserId.get(userId);
    if (staffId == null) {
      setPageError(`Could not resolve ${name}'s staff record.`);
      return;
    }
    const ok = await confirm({
      title: `Remove ${name}`,
      message: "They will lose access to this group.",
      confirmLabel: "Remove member",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await removeMember({ groupId: group.group_id, staffId }).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not remove this member."));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${group.group_name} members`}
        className="w-full max-w-md max-h-[85vh] rounded-2xl border overflow-hidden flex flex-col"
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
            {group.group_name} — members
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {pageError && (
            <p className="text-xs" style={{ color: "var(--color-error)" }}>
              {pageError}
            </p>
          )}

          {error ? (
            <EmptyState message={apiMessage(error, "Could not load members.")} />
          ) : isLoading ? (
            <EmptyState message="Loading members..." />
          ) : !members?.length ? (
            <EmptyState message="No members yet." />
          ) : (
            <div className="flex flex-col gap-1">
              {members.map((m) => (
                <div
                  key={m.member_id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: "var(--color-on-accent)" }}>
                      {initialsOf(m.staff_name ?? `User #${m.user_id}`)}
                    </span>
                  </div>
                  <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>
                    {m.staff_name ?? `User #${m.user_id}`}
                  </span>
                  {m.is_admin && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: "var(--color-blurple)", background: "var(--color-info-tint)" }}
                    >
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onRemove(m.user_id, m.staff_name ?? `User #${m.user_id}`)}
                      disabled={removing || !staffIdByUserId.has(m.user_id)}
                      title={
                        staffIdByUserId.has(m.user_id)
                          ? undefined
                          : "Could not resolve this member's staff record"
                      }
                      aria-label={`Remove ${m.staff_name ?? "member"}`}
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                      style={{ color: "var(--color-error)" }}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <div className="pt-3 border-t" style={{ borderColor: "var(--color-divider)" }}>
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                Add members
              </p>
              <SearchBar value={search} onChange={setSearch} placeholder="Search staff..." />
              <div
                className="rounded-xl border max-h-40 overflow-y-auto mt-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                {!addableStaff.length ? (
                  <p className="text-xs px-3 py-3 text-center" style={{ color: "var(--color-text-muted)" }}>
                    Everyone is already in this group.
                  </p>
                ) : (
                  addableStaff.map((s) => {
                    const selected = picking.has(s.staff_id);
                    return (
                      <button
                        key={s.staff_id}
                        type="button"
                        onClick={() => togglePick(s.staff_id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 border-b last:border-b-0 text-left"
                        style={{
                          borderColor: "var(--color-divider)",
                          background: selected ? "var(--color-info-tint)" : "transparent",
                        }}
                      >
                        <span className="text-sm truncate flex-1" style={{ color: "var(--color-text-primary)" }}>
                          {s.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={onAddPicked}
                disabled={!picking.size || adding}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
              >
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add {picking.size || ""} member{picking.size === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
