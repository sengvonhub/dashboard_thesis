"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  Eye,
  MoreVertical,
  Pencil,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  SearchBar,
  SelectField,
  TextField,
  apiMessage,
  initialsOf,
} from "@/app/(components)/crud";
import RolePermissionsDialog from "@/app/(components)/Users/RolePermissionsDialog";
import {
  DepartmentDetailDialog,
  RoleDetailDialog,
  UserDetailDialog,
} from "@/app/(components)/Users/UserDetailDialogs";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { Permissions } from "@/state/permissions";
import {
  useCreateDepartmentMutation,
  useCreateRoleMutation,
  useCreateUserMutation,
  useDeleteDepartmentMutation,
  useDeleteRoleMutation,
  useDeleteUserMutation,
  useGetDepartmentsQuery,
  useGetRolesQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/state/tageTypes/services/usersApi";
import { useAuth } from "@/state/tageTypes/lib/hook";
import type {
  DepartmentResponse,
  RoleResponse,
  UserResponse,
  UserStatus,
} from "@/state/types/user";

type Tab = "users" | "roles" | "departments";

/** Overflow menu — the "⋮" on each user row. */
function RowMenu({
  items,
}: {
  items: { label: string; icon: React.ElementType; danger?: boolean; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-30 w-44 rounded-xl border overflow-hidden py-1"
          style={{
            background: "var(--color-surface-overlay)",
            borderColor: "var(--color-border)",
            boxShadow: "0 16px 40px -16px rgba(0,0,0,0.6)",
          }}
        >
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                type="button"
                key={it.label}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  it.onClick();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm"
                style={{
                  color: it.danger
                    ? "var(--color-error)"
                    : "var(--color-text-primary)",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { has } = usePermissions();
  const { companyId } = useAuth();

  const canViewUsers = has(Permissions.VIEW_USERS);
  const canManageUsers = has(Permissions.MANAGE_USERS);
  const canManageRoles = has(Permissions.MANAGE_ROLES);
  const canManageDepartments = has(Permissions.MANAGE_DEPARTMENTS);

  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageError, setPageError] = useState<string | null>(null);

  // The API caps `limit` at 20.
  const LIMIT = 20;
  const userArgs = useMemo(() => ({ skip: page * LIMIT, limit: LIMIT }), [page]);

  const { data: userPage, isLoading: usersLoading } = useGetUsersQuery(userArgs, {
    skip: !canViewUsers,
  });
  // Both are gated on their own MANAGE_* permission, so skip when absent.
  const { data: roles, isLoading: rolesLoading } = useGetRolesQuery(undefined, {
    skip: !canManageRoles,
  });
  const { data: departments, isLoading: deptLoading } = useGetDepartmentsQuery(
    undefined,
    { skip: !canManageDepartments }
  );

  const [createUser, { isLoading: creatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: updatingUser }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deletingUser }] = useDeleteUserMutation();
  const [createRole, { isLoading: creatingRole }] = useCreateRoleMutation();
  const [deleteRole, { isLoading: deletingRole }] = useDeleteRoleMutation();
  const [createDept, { isLoading: creatingDept }] = useCreateDepartmentMutation();
  const [deleteDept, { isLoading: deletingDept }] = useDeleteDepartmentMutation();

  // dialogs
  const [userOpen, setUserOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [permsFor, setPermsFor] = useState<RoleResponse | null>(null);
  const [detailUser, setDetailUser] = useState<UserResponse | null>(null);
  const [detailRole, setDetailRole] = useState<RoleResponse | null>(null);
  const [detailDept, setDetailDept] = useState<DepartmentResponse | null>(null);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);

  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role_id: "",
    department_id: "",
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    role_id: "",
    department_id: "",
    status: "active" as UserStatus,
  });
  const [roleName, setRoleName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptManager, setDeptManager] = useState("");
  const [error, setError] = useState<string | null>(null);

  const users = userPage?.items ?? [];
  const total = userPage?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  /**
   * Per-role / per-department tallies. The list endpoint is paginated (20 max)
   * and filtered to active users, and there is no aggregate route, so these are
   * counted from the users on the current page — exact only while everyone fits
   * on one page, which `partialCounts` flags.
   */
  const partialCounts = total > users.length;
  const roleCounts = useMemo(() => {
    const m = new Map<number, number>();
    users.forEach((u) => {
      if (u.role_id != null) m.set(u.role_id, (m.get(u.role_id) ?? 0) + 1);
    });
    return m;
  }, [users]);
  const deptCounts = useMemo(() => {
    const m = new Map<number, number>();
    users.forEach((u) => {
      if (u.department_id != null)
        m.set(u.department_id, (m.get(u.department_id) ?? 0) + 1);
    });
    return m;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [
        u.username,
        u.full_name,
        u.role?.role_name,
        u.department?.department_name,
        u.staff?.staff_role?.role_name,
      ]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [users, search]);

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setPageError(null);
    try {
      await fn();
    } catch (err) {
      setPageError(apiMessage(err, fallback));
    }
  };

  const openEdit = (u: UserResponse) => {
    setError(null);
    setEditForm({
      full_name: u.full_name ?? "",
      role_id: u.role_id != null ? String(u.role_id) : "",
      department_id: u.department_id != null ? String(u.department_id) : "",
      status: u.status,
    });
    setEditUser(u);
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (userForm.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (userForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!userForm.role_id) {
      setError("A role is required.");
      return;
    }
    try {
      await createUser({
        username: userForm.username.trim(),
        password: userForm.password,
        full_name: userForm.full_name.trim(),
        role_id: Number(userForm.role_id),
        department_id: userForm.department_id
          ? Number(userForm.department_id)
          : undefined,
      }).unwrap();
      setUserOpen(false);
      setUserForm({ username: "", password: "", full_name: "", role_id: "", department_id: "" });
    } catch (err) {
      setError(apiMessage(err, "Could not create this user."));
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    try {
      await updateUser({
        userId: editUser.user_id,
        body: {
          full_name: editForm.full_name.trim(),
          role_id: editForm.role_id ? Number(editForm.role_id) : undefined,
          department_id: editForm.department_id
            ? Number(editForm.department_id)
            : undefined,
          status: editForm.status,
        },
      }).unwrap();
      setEditUser(null);
    } catch (err) {
      setError(apiMessage(err, "Could not update this user."));
    }
  };

  const submitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (roleName.trim().length < 2) {
      setError("Role name must be at least 2 characters.");
      return;
    }
    if (companyId == null) {
      setError("No company on your session — sign in again.");
      return;
    }
    try {
      // RoleCreate requires company_id in the body even though the server
      // scopes by the token; send the session's own company.
      await createRole({
        role_name: roleName.trim(),
        company_id: companyId,
        permission_codes: [],
      }).unwrap();
      setRoleOpen(false);
      setRoleName("");
    } catch (err) {
      setError(apiMessage(err, "Could not create this role."));
    }
  };

  const submitDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (deptName.trim().length < 2) {
      setError("Department name must be at least 2 characters.");
      return;
    }
    if (companyId == null) {
      setError("No company on your session — sign in again.");
      return;
    }
    try {
      await createDept({
        department_name: deptName.trim(),
        manager_id: deptManager ? Number(deptManager) : null,
        company_id: companyId,
      }).unwrap();
      setDeptOpen(false);
      setDeptName("");
      setDeptManager("");
    } catch (err) {
      setError(apiMessage(err, "Could not create this department."));
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: "users", label: "Users", icon: Users, show: canViewUsers },
    { id: "roles", label: "Roles", icon: Shield, show: canManageRoles },
    { id: "departments", label: "Departments", icon: Building2, show: canManageDepartments },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  const actionFor: Record<Tab, { label: string; can: boolean; open: () => void }> = {
    users: { label: "Add user", can: canManageUsers, open: () => setUserOpen(true) },
    roles: { label: "Add role", can: canManageRoles, open: () => setRoleOpen(true) },
    departments: {
      label: "Add department",
      can: canManageDepartments,
      open: () => setDeptOpen(true),
    },
  };
  const action = actionFor[tab];

  if (!visibleTabs.length) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <CrudHeader title="Users" />
        <EmptyState message="You do not have permission to view users, roles or departments." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="User management"
        subtitle={`${total} user${total === 1 ? "" : "s"} · ${roles?.length ?? 0} roles · ${departments?.length ?? 0} departments`}
        actionLabel={action.can ? action.label : undefined}
        onAction={action.can ? action.open : undefined}
      />

      <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-divider)" }}>
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-2 px-3 py-2.5"
              style={{
                color: active ? "var(--color-blurple)" : "var(--color-text-secondary)",
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

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search username, name, role, staff role, department..."
          />

          <Card className="overflow-hidden">
            {usersLoading ? (
              <EmptyState message="Loading users..." />
            ) : !filteredUsers.length ? (
              <EmptyState message={search ? "No users match that search." : "No users yet."} />
            ) : (
              filteredUsers.map((u: UserResponse) => (
                <div
                  key={u.user_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailUser(u)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailUser(u);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 cursor-pointer text-left"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  <div
                    className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{
                      background: u.avatar_url
                        ? "var(--color-surface-elevated)"
                        : "var(--gradient-brand)",
                    }}
                  >
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: "var(--color-on-accent)" }}>
                        {initialsOf(u.full_name || u.username)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {u.full_name}
                      </span>
                      {/* System role — what the account may do. */}
                      {u.role?.role_name && (
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            color: "var(--color-blurple)",
                            background: "var(--color-info-tint)",
                          }}
                        >
                          {u.role.role_name}
                        </span>
                      )}
                      {/* Staff role — the job title on the linked staff record. */}
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={
                          u.staff?.staff_role?.role_name
                            ? {
                                color: "var(--color-success)",
                                background: "var(--color-success-tint)",
                              }
                            : {
                                color: "var(--color-text-muted)",
                                background: "var(--color-divider)",
                              }
                        }
                      >
                        {u.staff?.staff_role?.role_name ?? "No staff role"}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                      @{u.username}
                      {u.department?.department_name ? ` · ${u.department.department_name}` : ""}
                    </p>
                  </div>

                  {canManageUsers ? (
                    <RowMenu
                      items={[
                        { label: "View details", icon: Eye, onClick: () => setDetailUser(u) },
                        { label: "Edit user", icon: Pencil, onClick: () => openEdit(u) },
                        {
                          label: "Delete user",
                          icon: Trash2,
                          danger: true,
                          onClick: () => {
                            if (!window.confirm(`Delete user ${u.username}? This cannot be undone.`))
                              return;
                            run(
                              () => deleteUser(u.user_id).unwrap(),
                              "Could not delete this user."
                            );
                          },
                        },
                      ]}
                    />
                  ) : (
                    <Chevron
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                  )}
                </div>
              ))
            )}
          </Card>

          {(deletingUser || updatingUser) && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Saving…
            </p>
          )}

          {/* Server-side paging — the list endpoint is paginated at 20 max. */}
          {total > LIMIT && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="h-8 w-8 rounded-lg border flex items-center justify-center disabled:opacity-40"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  aria-label="Next page"
                  className="h-8 w-8 rounded-lg border flex items-center justify-center disabled:opacity-40"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ROLES ── */}
      {tab === "roles" && canManageRoles && (
        <Card className="overflow-hidden">
          {rolesLoading ? (
            <EmptyState message="Loading roles..." />
          ) : !roles?.length ? (
            <EmptyState message="No roles yet." />
          ) : (
            roles.map((r) => {
              const count = roleCounts.get(r.role_id) ?? 0;
              return (
                <div
                  key={r.role_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailRole(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailRole(r);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 cursor-pointer"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-info-tint)" }}
                  >
                    <Shield className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {r.role_name}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          color: "var(--color-success)",
                          background: "var(--color-success-tint)",
                        }}
                      >
                        {count} user{count === 1 ? "" : "s"}
                        {partialCounts ? "+" : ""}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {r.permissions.length} permission
                      {r.permissions.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPermsFor(r);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border shrink-0"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Permissions
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Delete role “${r.role_name}”?`)) return;
                      run(
                        () => deleteRole(r.role_id).unwrap(),
                        "Could not delete this role — users may still be assigned to it."
                      );
                    }}
                    disabled={deletingRole}
                    aria-label={`Delete ${r.role_name}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    style={{ color: "var(--color-error)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </Card>
      )}

      {/* ── DEPARTMENTS ── */}
      {tab === "departments" && canManageDepartments && (
        <Card className="overflow-hidden">
          {deptLoading ? (
            <EmptyState message="Loading departments..." />
          ) : !departments?.length ? (
            <EmptyState message="No departments yet." />
          ) : (
            departments.map((d: DepartmentResponse) => {
              const count = deptCounts.get(d.department_id) ?? 0;
              const manager = users.find((u) => u.user_id === d.manager_id);
              return (
                <div
                  key={d.department_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailDept(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailDept(d);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 cursor-pointer"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-success-tint)" }}
                  >
                    <Building2 className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {d.department_name}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={{
                          color: "var(--color-success)",
                          background: "var(--color-success-tint)",
                        }}
                      >
                        {count} user{count === 1 ? "" : "s"}
                        {partialCounts ? "+" : ""}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                      {d.manager_id
                        ? `Manager: ${manager?.full_name ?? `#${d.manager_id}`}`
                        : "No manager assigned"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!window.confirm(`Delete department “${d.department_name}”?`)) return;
                      run(
                        () => deleteDept(d.department_id).unwrap(),
                        "Could not delete this department."
                      );
                    }}
                    disabled={deletingDept}
                    aria-label={`Delete ${d.department_name}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    style={{ color: "var(--color-error)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </Card>
      )}

      {partialCounts && tab !== "users" && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Counts cover the {users.length} users on the current page of {total}. The
          API returns at most 20 users per request and has no per-role count, so
          totals beyond that are marked with a “+”.
        </p>
      )}

      {/* dialogs */}
      {userOpen && (
        <Dialog
          title="Add user"
          onClose={() => setUserOpen(false)}
          onSubmit={submitUser}
          submitLabel="Create user"
          saving={creatingUser}
          error={error}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Username"
              value={userForm.username}
              onChange={(v) => setUserForm((f) => ({ ...f, username: v }))}
            />
            <TextField
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(v) => setUserForm((f) => ({ ...f, password: v }))}
            />
          </div>
          <TextField
            label="Full name"
            value={userForm.full_name}
            onChange={(v) => setUserForm((f) => ({ ...f, full_name: v }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Role"
              value={userForm.role_id}
              placeholder="— pick a role —"
              onChange={(v) => setUserForm((f) => ({ ...f, role_id: v }))}
              options={(roles ?? []).map((r) => ({
                value: String(r.role_id),
                label: r.role_name,
              }))}
            />
            <SelectField
              label="Department"
              value={userForm.department_id}
              placeholder="— none —"
              onChange={(v) => setUserForm((f) => ({ ...f, department_id: v }))}
              options={(departments ?? []).map((d) => ({
                value: String(d.department_id),
                label: d.department_name,
              }))}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Usernames are unique across the whole platform, not just this company.
          </p>
        </Dialog>
      )}

      {editUser && (
        <Dialog
          title={`Edit ${editUser.username}`}
          onClose={() => setEditUser(null)}
          onSubmit={submitEdit}
          submitLabel="Save changes"
          saving={updatingUser}
          error={error}
        >
          <TextField
            label="Full name"
            value={editForm.full_name}
            onChange={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Role"
              value={editForm.role_id}
              placeholder="— pick a role —"
              onChange={(v) => setEditForm((f) => ({ ...f, role_id: v }))}
              options={(roles ?? []).map((r) => ({
                value: String(r.role_id),
                label: r.role_name,
              }))}
            />
            <SelectField
              label="Department"
              value={editForm.department_id}
              placeholder="— none —"
              onChange={(v) => setEditForm((f) => ({ ...f, department_id: v }))}
              options={(departments ?? []).map((d) => ({
                value: String(d.department_id),
                label: d.department_name,
              }))}
            />
          </div>
          <SelectField
            label="Status"
            value={editForm.status}
            onChange={(v) => setEditForm((f) => ({ ...f, status: v as UserStatus }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            The staff profile (job role, photo, contact details) is edited from the
            Staff screen — this form only changes the login account.
          </p>
        </Dialog>
      )}

      {roleOpen && (
        <Dialog
          title="Add role"
          onClose={() => setRoleOpen(false)}
          onSubmit={submitRole}
          submitLabel="Create role"
          saving={creatingRole}
          error={error}
        >
          <TextField label="Role name" value={roleName} onChange={setRoleName} />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            The role starts with no permissions — assign them from the Permissions
            button once it exists.
          </p>
        </Dialog>
      )}

      {deptOpen && (
        <Dialog
          title="Add department"
          onClose={() => setDeptOpen(false)}
          onSubmit={submitDept}
          submitLabel="Create department"
          saving={creatingDept}
          error={error}
        >
          <TextField label="Department name" value={deptName} onChange={setDeptName} />
          <SelectField
            label="Manager"
            value={deptManager}
            placeholder="— none —"
            onChange={setDeptManager}
            options={users.map((u) => ({
              value: String(u.user_id),
              label: u.full_name || u.username,
            }))}
          />
        </Dialog>
      )}

      {detailUser && (
        <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />
      )}

      {detailRole && (
        <RoleDetailDialog
          role={detailRole}
          users={users}
          totalUsers={total}
          onClose={() => setDetailRole(null)}
          onManagePermissions={() => {
            setPermsFor(detailRole);
            setDetailRole(null);
          }}
        />
      )}

      {detailDept && (
        <DepartmentDetailDialog
          department={detailDept}
          users={users}
          totalUsers={total}
          onClose={() => setDetailDept(null)}
        />
      )}

      {permsFor && (
        <RolePermissionsDialog role={permsFor} onClose={() => setPermsFor(null)} />
      )}
    </div>
  );
}
