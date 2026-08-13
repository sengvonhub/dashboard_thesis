"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import {
  useCreateStaffMutation,
  useGetStaffRolesQuery,
  useUpdateStaffMutation,
} from "@/state/tageTypes/services/staffApi";
import type { StaffResponse } from "@/state/types/user";

const apiMessage = (err: unknown, fallback: string) => {
  const status = (err as { status?: number })?.status;
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (status === 409) return "That email is already in use.";
  if (status === 403) return "Your role does not allow this.";
  if (status === 422) return "The server rejected the form — check the fields.";
  return fallback;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      />
    </label>
  );
}

export default function StaffFormDialog({
  staff,
  onClose,
}: {
  /** Omitted for create. */
  staff?: StaffResponse;
  onClose: () => void;
}) {
  const isEdit = Boolean(staff);
  const { data: roles } = useGetStaffRolesQuery();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: updating }] = useUpdateStaffMutation();
  const saving = creating || updating;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    address: "",
    staff_role_id: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!staff) return;
    setForm({
      name: staff.name ?? "",
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      gender: staff.gender ?? "",
      date_of_birth: staff.date_of_birth ? staff.date_of_birth.slice(0, 10) : "",
      address: staff.address ?? "",
      staff_role_id: staff.staff_role_id != null ? String(staff.staff_role_id) : "",
    });
  }, [staff]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickAvatar = (file: File | null) => {
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    const roleId = form.staff_role_id ? Number(form.staff_role_id) : null;

    try {
      if (isEdit && staff) {
        await updateStaff({
          staffId: staff.staff_id,
          data: {
            name: form.name.trim(),
            staff_role_id: roleId,
            gender: form.gender || null,
            date_of_birth: form.date_of_birth || null,
            address: form.address || null,
            email: form.email || null,
            phone: form.phone || null,
            avatar_file: avatarFile,
          },
        }).unwrap();
      } else {
        // POST /staff/ takes JSON and ignores uploads, so a chosen avatar
        // cannot be sent here — it needs a follow-up PATCH.
        await createStaff({
          name: form.name.trim(),
          staff_role_id: roleId,
          gender: (form.gender || null) as never,
          date_of_birth: form.date_of_birth || null,
          address: form.address || null,
          email: form.email || null,
          phone: form.phone || null,
        }).unwrap();
      }
      onClose();
    } catch (err) {
      setError(apiMessage(err, "Could not save this staff member."));
    }
  };

  const shownAvatar = avatarPreview ?? staff?.avatar_url ?? null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit staff" : "Add staff"}
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
          <h2
            className="flex-1 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {isEdit ? `Edit ${staff?.name}` : "Add staff member"}
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

        <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {/* avatar — edit only, since POST /staff/ takes no upload */}
            {isEdit && (
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      background: shownAvatar
                        ? "var(--color-surface-card)"
                        : "var(--gradient-brand)",
                    }}
                  >
                    {shownAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={shownAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-xl font-bold"
                        style={{ color: "var(--color-on-accent)" }}
                      >
                        {form.name.slice(0, 2).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change photo"
                    className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2"
                    style={{
                      background: "var(--color-blurple)",
                      borderColor: "var(--color-surface-elevated)",
                    }}
                  >
                    <Camera className="w-3.5 h-3.5" style={{ color: "var(--color-on-accent)" }} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
                  />
                </div>
                {avatarFile && (
                  <p className="text-xs" style={{ color: "var(--color-warning)" }}>
                    New photo selected — save to upload.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" value={form.name} onChange={set("name")} />

              <label className="flex flex-col gap-1.5">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Staff role
                </span>
                <select
                  value={form.staff_role_id}
                  onChange={(e) => set("staff_role_id")(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">— none —</option>
                  {roles?.map((r) => (
                    <option key={r.staff_role_id} value={r.staff_role_id}>
                      {r.role_name}
                      {r.is_manager ? " (manager)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <Field label="Email" type="email" value={form.email} onChange={set("email")} />
              <Field label="Phone" value={form.phone} onChange={set("phone")} />

              <label className="flex flex-col gap-1.5">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Gender
                </span>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <Field
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={set("date_of_birth")}
              />
            </div>

            <Field label="Address" value={form.address} onChange={set("address")} />

            {error && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
          </div>

          <div
            className="shrink-0 px-5 py-4 border-t flex items-center justify-end gap-2"
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
              {isEdit ? "Save changes" : "Create staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
