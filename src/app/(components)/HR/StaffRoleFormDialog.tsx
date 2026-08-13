"use client";

import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  useCreateStaffRoleMutation,
  useUpdateStaffRoleMutation,
} from "@/state/tageTypes/services/staffApi";
import type { StaffRoleResponse } from "@/state/types/user";

const apiMessage = (err: unknown, fallback: string) => {
  const status = (err as { status?: number })?.status;
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (status === 409) return "A role with that name already exists.";
  if (status === 403) return "Your role does not allow managing staff roles.";
  return fallback;
};

export default function StaffRoleFormDialog({
  role,
  onClose,
}: {
  role?: StaffRoleResponse;
  onClose: () => void;
}) {
  const isEdit = Boolean(role);
  const [createRole, { isLoading: creating }] = useCreateStaffRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateStaffRoleMutation();
  const saving = creating || updating;

  const [roleName, setRoleName] = useState(role?.role_name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [baseSalary, setBaseSalary] = useState(
    role?.base_salary != null ? String(role.base_salary) : ""
  );
  const [isManager, setIsManager] = useState(role?.is_manager ?? false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (roleName.trim().length < 2) {
      setError("Role name must be at least 2 characters.");
      return;
    }
    // base_salary is a Decimal column; send a number or omit it entirely.
    const salary = baseSalary.trim() ? Number(baseSalary) : null;
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
      setError("Base salary must be a positive number.");
      return;
    }

    try {
      if (isEdit && role) {
        await updateRole({
          roleId: role.staff_role_id,
          body: {
            role_name: roleName.trim(),
            description: description.trim() || null,
            base_salary: salary,
            is_manager: isManager,
          },
        }).unwrap();
      } else {
        await createRole({
          role_name: roleName.trim(),
          description: description.trim() || null,
          base_salary: salary,
          is_manager: isManager,
        }).unwrap();
      }
      onClose();
    } catch (err) {
      setError(apiMessage(err, "Could not save this role."));
    }
  };

  const fieldStyle = {
    background: "var(--color-surface)",
    borderColor: "var(--color-border)",
    color: "var(--color-text-primary)",
  };

  return (
    <div
      className="fixed inset-0 z-[145] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit staff role" : "Add staff role"}
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <h2
            className="flex-1 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {isEdit ? "Edit staff role" : "Add staff role"}
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

        <form onSubmit={onSubmit}>
          <div className="px-5 py-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Role name
              </span>
              <input
                value={roleName}
                autoFocus
                onChange={(e) => setRoleName(e.target.value)}
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={fieldStyle}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Description
              </span>
              <textarea
                value={description}
                rows={2}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none"
                style={fieldStyle}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Base salary
              </span>
              <input
                value={baseSalary}
                inputMode="decimal"
                placeholder="0.00"
                onChange={(e) => setBaseSalary(e.target.value)}
                className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={fieldStyle}
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isManager}
                onChange={(e) => setIsManager(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                Manager role
              </span>
            </label>
            <p className="text-xs -mt-2" style={{ color: "var(--color-text-muted)" }}>
              Manager roles receive late and early check-out alerts, and appear
              in the managers list.
            </p>

            {error && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
          </div>

          <div
            className="px-5 py-4 border-t flex items-center justify-end gap-2"
            style={{ borderColor: "var(--color-divider)" }}
          >
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
              {isEdit ? "Save changes" : "Create role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
