"use client";

import React, { useEffect } from "react";
import {
  BadgeCheck,
  Building2,
  Calendar,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Shield,
  User as UserIcon,
  UserRound,
  X,
} from "lucide-react";
import { initialsOf } from "@/app/(components)/crud";
import type {
  DepartmentResponse,
  RoleResponse,
  UserResponse,
} from "@/state/types/user";

// ── shared shell ─────────────────────────────────────────

function Shell({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

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
        aria-label={title}
        className="w-full max-w-lg max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </h2>
            {subtitle && <div className="mt-1">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>

        {footer && (
          <div
            className="shrink-0 px-5 py-4 border-t flex items-center justify-end gap-2"
            style={{ borderColor: "var(--color-divider)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "success" | "muted" | "warning";
}) {
  const map = {
    info: { fg: "var(--color-blurple)", bg: "var(--color-info-tint)" },
    success: { fg: "var(--color-success)", bg: "var(--color-success-tint)" },
    warning: { fg: "var(--color-warning)", bg: "var(--color-warning-tint)" },
    muted: { fg: "var(--color-text-muted)", bg: "var(--color-divider)" },
  } as const;
  const s = map[tone];
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
      style={{ color: s.fg, background: s.bg }}
    >
      {children}
    </span>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-divider)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-text-secondary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Avatar({
  url,
  name,
  size = 56,
}: {
  url?: string | null;
  name: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: url ? "var(--color-surface-card)" : "var(--gradient-brand)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-bold"
          style={{ color: "var(--color-on-accent)", fontSize: size / 3 }}
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-widest"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </p>
  );
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

// ── user detail ──────────────────────────────────────────

export function UserDetailDialog({
  user,
  onClose,
}: {
  user: UserResponse;
  onClose: () => void;
}) {
  const staff = user.staff;

  return (
    <Shell
      title={user.full_name}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            @{user.username}
          </span>
          {user.role?.role_name && <Badge tone="info">{user.role.role_name}</Badge>}
          <Badge tone={user.status === "active" ? "success" : "muted"}>
            {user.status}
          </Badge>
        </div>
      }
      onClose={onClose}
    >
      <div className="flex items-center gap-4">
        <Avatar url={user.avatar_url} name={user.full_name || user.username} size={64} />
        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {user.full_name}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            User #{user.user_id}
          </p>
        </div>
      </div>

      <SectionTitle>Account</SectionTitle>
      <div
        className="rounded-xl border px-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Row icon={Shield} label="System role" value={user.role?.role_name ?? "—"} />
        <Row
          icon={Building2}
          label="Department"
          value={user.department?.department_name ?? "—"}
        />
        <Row icon={Calendar} label="Joined" value={fmt(user.created_at) ?? "—"} />
      </div>

      {/* Staff profile — eager-loaded on the user via User.staff → staff_role. */}
      <SectionTitle>Staff profile</SectionTitle>
      {!staff ? (
        <div
          className="rounded-xl border px-4 py-6 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <UserRound
            className="h-6 w-6 mx-auto mb-2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No staff profile linked to this account.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Without one they cannot scan attendance, request leave, or be billed
            against invoices.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {staff.staff_role?.role_name ? (
              <Badge tone="success">{staff.staff_role.role_name}</Badge>
            ) : (
              <Badge tone="muted">No staff role</Badge>
            )}
            {staff.staff_role?.is_manager && (
              <Badge tone="success">
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-2.5 w-2.5" />
                  Manager
                </span>
              </Badge>
            )}
          </div>

          <div
            className="rounded-xl border px-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Row icon={IdCard} label="Staff name" value={staff.name} />
            <Row icon={Mail} label="Email" value={staff.email ?? "—"} />
            <Row icon={Phone} label="Phone" value={staff.phone ?? "—"} />
            <Row icon={MapPin} label="Address" value={staff.address ?? "—"} />
            <Row
              icon={UserIcon}
              label="Details"
              value={
                [
                  staff.gender,
                  staff.age != null ? `${staff.age} yrs` : null,
                  staff.date_of_birth ? staff.date_of_birth.slice(0, 10) : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
          </div>
        </>
      )}
    </Shell>
  );
}

// ── role detail ──────────────────────────────────────────

export function RoleDetailDialog({
  role,
  users,
  totalUsers,
  onClose,
  onManagePermissions,
}: {
  role: RoleResponse;
  /** Users loaded on the current page — see the note below on counts. */
  users: UserResponse[];
  totalUsers: number;
  onClose: () => void;
  onManagePermissions?: () => void;
}) {
  const members = users.filter((u) => u.role_id === role.role_id);
  // The users list is server-paginated (max 20), so counts are exact only
  // while every user fits on one page.
  const partial = totalUsers > users.length;

  return (
    <Shell
      title={role.role_name}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tone="info">
            {role.permissions.length} permission
            {role.permissions.length === 1 ? "" : "s"}
          </Badge>
          <Badge tone="success">
            {members.length} user{members.length === 1 ? "" : "s"}
            {partial ? " on this page" : ""}
          </Badge>
        </div>
      }
      onClose={onClose}
      footer={
        onManagePermissions && (
          <button
            type="button"
            onClick={onManagePermissions}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{
              background: "var(--color-blurple)",
              color: "var(--color-on-accent)",
            }}
          >
            Manage permissions
          </button>
        )
      }
    >
      <SectionTitle>Permissions</SectionTitle>
      {role.permissions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          This role grants nothing yet. A user with it can sign in but every
          gated screen will be empty.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {role.permissions.map((p) => (
            <span
              key={p.permission_id}
              className="text-[11px] px-2 py-1 rounded-md font-mono"
              style={{
                background: "var(--color-surface-card)",
                color: "var(--color-text-secondary)",
              }}
            >
              {p.code}
            </span>
          ))}
        </div>
      )}

      <SectionTitle>Users with this role</SectionTitle>
      {members.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {partial
            ? "None on this page — load more users to see the rest."
            : "No users have this role."}
        </p>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {members.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <Avatar url={u.avatar_url} name={u.full_name || u.username} size={32} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {u.full_name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  @{u.username}
                  {u.staff?.staff_role?.role_name
                    ? ` · ${u.staff.staff_role.role_name}`
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {partial && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Showing matches from the {users.length} users on this page of{" "}
          {totalUsers}. The API caps the list at 20 per request and has no
          per-role count, so this is a page-local tally.
        </p>
      )}
    </Shell>
  );
}

// ── department detail ────────────────────────────────────

export function DepartmentDetailDialog({
  department,
  users,
  totalUsers,
  onClose,
}: {
  department: DepartmentResponse;
  users: UserResponse[];
  totalUsers: number;
  onClose: () => void;
}) {
  const members = users.filter((u) => u.department_id === department.department_id);
  const partial = totalUsers > users.length;
  const manager = users.find((u) => u.user_id === department.manager_id);

  return (
    <Shell
      title={department.department_name}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tone="success">
            {members.length} user{members.length === 1 ? "" : "s"}
            {partial ? " on this page" : ""}
          </Badge>
          {department.manager_id && (
            <Badge tone="info">
              Manager: {manager?.full_name ?? `#${department.manager_id}`}
            </Badge>
          )}
        </div>
      }
      onClose={onClose}
    >
      <SectionTitle>Members</SectionTitle>
      {members.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {partial
            ? "None on this page — load more users to see the rest."
            : "No users assigned to this department."}
        </p>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {members.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <Avatar url={u.avatar_url} name={u.full_name || u.username} size={32} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {u.full_name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  @{u.username}
                  {u.role?.role_name ? ` · ${u.role.role_name}` : ""}
                </p>
              </div>
              {u.user_id === department.manager_id && (
                <Badge tone="info">Manager</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
