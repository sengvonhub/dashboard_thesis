"use client";

import React, { useMemo, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import StaffFormDialog from "@/app/(components)/HR/StaffFormDialog";
import StaffRoleFormDialog from "@/app/(components)/HR/StaffRoleFormDialog";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { Permissions } from "@/state/permissions";
import {
  useDeleteStaffMutation,
  useDeleteStaffRoleMutation,
  useGetAllStaffQuery,
  useGetStaffRolesQuery,
} from "@/state/tageTypes/services/staffApi";
import type { StaffResponse, StaffRoleResponse } from "@/state/types/user";

type Tab = "staff" | "roles";

const apiMessage = (err: unknown, fallback: string) => {
  const status = (err as { status?: number })?.status;
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (status === 403) return "Your role does not allow this.";
  if (status === 409) return "That is already in use.";
  return fallback;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StaffCard({
  staff,
  canManage,
  onEdit,
  onDelete,
  deleting,
}: {
  staff: StaffResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        background: "var(--color-surface-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: staff.avatar_url
              ? "var(--color-surface-elevated)"
              : "var(--gradient-brand)",
          }}
        >
          {staff.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span
              className="text-sm font-bold"
              style={{ color: "var(--color-on-accent)" }}
            >
              {initialsOf(staff.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {staff.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {staff.staff_role?.role_name && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--color-info)",
                  background: "var(--color-info-tint)",
                }}
              >
                {staff.staff_role.role_name}
              </span>
            )}
            {staff.staff_role?.is_manager && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  color: "var(--color-success)",
                  background: "var(--color-success-tint)",
                }}
              >
                <BadgeCheck className="h-2.5 w-2.5" />
                Manager
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${staff.name}`}
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Delete ${staff.name}`}
              className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-50"
              style={{ color: "var(--color-error)" }}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {staff.email && (
          <span
            className="text-xs inline-flex items-center gap-2 truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Mail className="h-3 w-3 shrink-0" />
            {staff.email}
          </span>
        )}
        {staff.phone && (
          <span
            className="text-xs inline-flex items-center gap-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Phone className="h-3 w-3 shrink-0" />
            {staff.phone}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HrPage() {
  const { has } = usePermissions();
  // Every write route here is gated on MANAGE_USERS, so reads stay open to
  // any signed-in user (GET /staff/ is only require_login) but the controls
  // only appear for those who can actually use them.
  const canManage = has(Permissions.MANAGE_USERS);

  const [tab, setTab] = useState<Tab>("staff");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [staffDialog, setStaffDialog] = useState<
    { mode: "create" } | { mode: "edit"; staff: StaffResponse } | null
  >(null);
  const [roleDialog, setRoleDialog] = useState<
    { mode: "create" } | { mode: "edit"; role: StaffRoleResponse } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const { data: staff, isLoading: staffLoading } = useGetAllStaffQuery();
  const { data: roles, isLoading: rolesLoading } = useGetStaffRolesQuery(undefined, {
    // /staff-roles is MANAGE_USERS-gated; skip it for users who'd only 403.
    skip: !canManage,
  });
  const [deleteStaff, { isLoading: deletingStaff }] = useDeleteStaffMutation();
  const [deleteRole, { isLoading: deletingRole }] = useDeleteStaffRoleMutation();

  const filtered = useMemo(() => {
    if (!staff) return [];
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesQuery =
        !q ||
        [s.name, s.email, s.phone, s.staff_role?.role_name]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q));
      const matchesRole =
        !roleFilter || String(s.staff_role_id ?? "") === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [staff, search, roleFilter]);

  const managerCount = useMemo(
    () => (staff ?? []).filter((s) => s.staff_role?.is_manager).length,
    [staff]
  );

  const onDeleteStaff = async (s: StaffResponse) => {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteStaff(s.staff_id).unwrap();
    } catch (err) {
      setError(apiMessage(err, "Could not delete this staff member."));
    }
  };

  const onDeleteRole = async (r: StaffRoleResponse) => {
    if (!window.confirm(`Delete the role “${r.role_name}”?`)) return;
    setError(null);
    try {
      await deleteRole(r.staff_role_id).unwrap();
    } catch (err) {
      setError(
        apiMessage(err, "Could not delete this role — staff may still be assigned to it.")
      );
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "staff", label: "Staff", icon: Users },
    ...(canManage
      ? [{ id: "roles" as Tab, label: "Roles", icon: Briefcase }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            HR / Staff
          </h1>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {staff?.length ?? 0} staff · {managerCount} manager
            {managerCount === 1 ? "" : "s"}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              tab === "staff"
                ? setStaffDialog({ mode: "create" })
                : setRoleDialog({ mode: "create" })
            }
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{
              background: "var(--color-blurple)",
              color: "var(--color-on-accent)",
            }}
          >
            <Plus className="h-4 w-4" />
            {tab === "staff" ? "Add staff" : "Add role"}
          </button>
        )}
      </div>

      {/* tabs */}
      <div
        className="flex gap-1 border-b"
        style={{ borderColor: "var(--color-divider)" }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-2 px-3 py-2.5"
              style={{
                color: active
                  ? "var(--color-blurple)"
                  : "var(--color-text-secondary)",
                borderBottom: active
                  ? "2px solid var(--color-blurple)"
                  : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {/* ── STAFF ── */}
      {tab === "staff" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, role..."
                className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </div>

            {canManage && roles && roles.length > 0 && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <option value="">All roles</option>
                {roles.map((r) => (
                  <option key={r.staff_role_id} value={r.staff_role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {staffLoading ? (
            <p className="py-10 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              Loading staff...
            </p>
          ) : !filtered.length ? (
            <p className="py-10 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              {search || roleFilter ? "No staff match that filter." : "No staff yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((s) => (
                <StaffCard
                  key={s.staff_id}
                  staff={s}
                  canManage={canManage}
                  deleting={deletingStaff}
                  onEdit={() => setStaffDialog({ mode: "edit", staff: s })}
                  onDelete={() => onDeleteStaff(s)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ROLES ── */}
      {tab === "roles" && canManage && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-border)",
          }}
        >
          {rolesLoading ? (
            <p className="py-10 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              Loading roles...
            </p>
          ) : !roles?.length ? (
            <p className="py-10 text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
              No staff roles yet.
            </p>
          ) : (
            roles.map((r) => {
              const count = (staff ?? []).filter(
                (s) => s.staff_role_id === r.staff_role_id
              ).length;
              return (
                <div
                  key={r.staff_role_id}
                  className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: r.is_manager
                        ? "var(--color-success-tint)"
                        : "var(--color-info-tint)",
                    }}
                  >
                    {r.is_manager ? (
                      <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                    ) : (
                      <Briefcase className="h-4 w-4" style={{ color: "var(--color-info)" }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {r.role_name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                      {[
                        r.description,
                        r.base_salary != null ? `Base ${r.base_salary}` : null,
                        `${count} staff`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRoleDialog({ mode: "edit", role: r })}
                      aria-label={`Edit ${r.role_name}`}
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRole(r)}
                      disabled={deletingRole}
                      aria-label={`Delete ${r.role_name}`}
                      className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-50"
                      style={{ color: "var(--color-error)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {staffDialog && (
        <StaffFormDialog
          staff={staffDialog.mode === "edit" ? staffDialog.staff : undefined}
          onClose={() => setStaffDialog(null)}
        />
      )}
      {roleDialog && (
        <StaffRoleFormDialog
          role={roleDialog.mode === "edit" ? roleDialog.role : undefined}
          onClose={() => setRoleDialog(null)}
        />
      )}
    </div>
  );
}
