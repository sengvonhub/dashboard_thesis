"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Shield, X } from "lucide-react";
import { Permissions, type PermissionCode } from "@/state/permissions";
import { useSetRolePermissionsMutation } from "@/state/tageTypes/services/usersApi";
import type { RoleResponse } from "@/state/types/user";
import { apiMessage } from "@/app/(components)/crud";

/**
 * Grouped for the UI only — the API stores a flat list of codes and has no
 * concept of a group. Anything not listed here still renders under "Other" so
 * a code added on the server can never silently disappear from this screen.
 */
const GROUPS: { label: string; codes: PermissionCode[] }[] = [
  {
    label: "Profile",
    codes: [Permissions.READ_OWN_PROFILE, Permissions.VIEW_OWN_PROFILE],
  },
  {
    label: "Attendance",
    codes: [
      Permissions.VIEW_OWN_ATTENDANCE,
      Permissions.VIEW_TEAM_ATTENDANCE,
      Permissions.MANAGE_ATTENDANCE_SETTINGS,
    ],
  },
  {
    label: "Leave",
    codes: [
      Permissions.REQUEST_LEAVE,
      Permissions.APPROVE_LEAVE,
      Permissions.VIEW_TEAM_LEAVE,
    ],
  },
  {
    label: "Salary",
    codes: [
      Permissions.VIEW_OWN_SALARY,
      Permissions.VIEW_TEAM_SALARY,
      Permissions.MANAGE_SALARY,
    ],
  },
  {
    label: "People",
    codes: [
      Permissions.VIEW_USERS,
      Permissions.MANAGE_USERS,
      Permissions.MANAGE_STAFF,
    ],
  },
  {
    label: "Company",
    codes: [
      Permissions.VIEW_COMPANY,
      Permissions.MANAGE_COMPANY,
      Permissions.MANAGE_ROLES,
      Permissions.MANAGE_DEPARTMENTS,
    ],
  },
];

const humanise = (code: string) =>
  code.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function RolePermissionsDialog({
  role,
  onClose,
}: {
  role: RoleResponse;
  onClose: () => void;
}) {
  const [setPermissions, { isLoading: saving }] = useSetRolePermissionsMutation();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.permissions.map((p) => p.code))
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  /** Codes the server knows about that this UI does not group explicitly. */
  const ungrouped = useMemo(() => {
    const known = new Set(GROUPS.flatMap((g) => g.codes as string[]));
    return role.permissions.map((p) => p.code).filter((c) => !known.has(c));
  }, [role.permissions]);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const toggleGroup = (codes: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => (on ? next.add(c) : next.delete(c)));
      return next;
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // PUT replaces the whole set — send every code that should remain.
      await setPermissions({
        roleId: role.role_id,
        body: { permission_codes: [...selected] },
      }).unwrap();
      onClose();
    } catch (err) {
      setError(apiMessage(err, "Could not update this role's permissions."));
    }
  };

  const allGroups = [
    ...GROUPS,
    ...(ungrouped.length
      ? [{ label: "Other", codes: ungrouped as PermissionCode[] }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Permissions for ${role.role_name}`}
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
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
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--color-info-tint)" }}
          >
            <Shield className="h-4 w-4" style={{ color: "var(--color-info)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {role.role_name}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {selected.size} permission{selected.size === 1 ? "" : "s"} selected
            </p>
          </div>
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

        <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
            {allGroups.map((group) => {
              const allOn = group.codes.every((c) => selected.has(c));
              return (
                <div key={group.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {group.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.codes, !allOn)}
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-blurple)" }}
                    >
                      {allOn ? "Clear all" : "Select all"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.codes.map((code) => {
                      const on = selected.has(code);
                      return (
                        <button
                          type="button"
                          key={code}
                          onClick={() => toggle(code)}
                          className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors"
                          style={{
                            borderColor: on
                              ? "var(--color-blurple)"
                              : "var(--color-border)",
                            background: on
                              ? "var(--color-info-tint)"
                              : "var(--color-surface-card)",
                          }}
                        >
                          <span
                            className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              background: on
                                ? "var(--color-blurple)"
                                : "transparent",
                              border: on
                                ? "none"
                                : "1px solid var(--color-border)",
                            }}
                          >
                            {on && (
                              <Check
                                className="h-3 w-3"
                                style={{ color: "var(--color-on-accent)" }}
                              />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span
                              className="block text-sm truncate"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {humanise(code)}
                            </span>
                            <span
                              className="block text-[11px] truncate"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {code}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {error && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
          </div>

          <div
            className="shrink-0 px-5 py-4 border-t flex items-center justify-between gap-2"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Saving replaces every permission on this role.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold border"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "var(--color-blurple)",
                  color: "var(--color-on-accent)",
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save permissions
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
