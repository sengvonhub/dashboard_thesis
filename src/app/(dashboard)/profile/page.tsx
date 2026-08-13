"use client";

import React, { useEffect, useRef, useState } from "react";
import { Building2, Camera, KeyRound, Loader2, Save, UserCog } from "lucide-react";
import { useProfile } from "@/state/tageTypes/lib/useProfile";
import { useMe } from "@/state/tageTypes/lib/useMe";
import { useUpdateStaffMutation } from "@/state/tageTypes/services/staffApi";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { Permissions } from "@/state/permissions";
import { useUpdateUserMutation } from "@/state/tageTypes/services/usersApi";
import { useUpdateCompanyMutation } from "@/state/tageTypes/services/companyApi";
import { useChangePasswordMutation } from "@/state/tageTypes/services/authApi";

// ── shared bits ────────────────────────────────────────────

function Card({
  icon: Icon,
  tint,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  tint: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-5 flex flex-col gap-5"
      style={{
        background: "var(--color-surface-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <header className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${tint}26` }}
        >
          <Icon className="h-5 w-5" style={{ color: tint }} />
        </div>
        <div className="min-w-0">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {subtitle}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled || !onChange}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-70"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function Status({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null;
  return (
    <p
      className="text-xs"
      style={{ color: error ? "var(--color-error)" : "var(--color-success)" }}
    >
      {error ?? ok}
    </p>
  );
}

function SaveButton({
  disabled,
  busy,
  label = "Save changes",
}: {
  disabled?: boolean;
  busy?: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "var(--color-blurple)", color: "var(--color-on-accent)" }}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

const apiMessage = (err: unknown, fallback: string) => {
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  const status = (err as { status?: number })?.status;
  if (status === 403) return "Your role does not allow this change.";
  return fallback;
};

// ── page ───────────────────────────────────────────────────

export default function ProfilePage() {
  const { profile, company, isLoading, userError, companyError } = useProfile();
  const { has } = usePermissions();

  // PATCH /users/{id} is gated on MANAGE_USERS and PATCH /companies/{id} on
  // MANAGE_COMPANY — there is no self-service "update me" route, so a user
  // without MANAGE_USERS can read their profile but not edit it.
  const canEditUser = has(Permissions.MANAGE_USERS);
  const canEditCompany = has(Permissions.MANAGE_COMPANY);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Profile
        </h1>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Your account and company details
        </p>
      </div>

      {isLoading && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading profile...
        </p>
      )}

      {/* Your own staff record — the only part of this page you can edit
          without admin permissions (PATCH /staff/{id} is require_login). */}
      <StaffCard />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <UserCard
          profile={profile}
          error={userError}
          canEdit={canEditUser}
        />
        <div className="flex flex-col gap-6">
          <CompanyCard
            company={company}
            error={companyError}
            canEdit={canEditCompany}
          />
          <PasswordCard />
        </div>
      </div>
    </div>
  );
}

// ── staff (self-service) ───────────────────────────────────

function StaffCard() {
  const { staff, staffId, displayName, initials, roleName, hasStaffRecord, isLoading, error } =
    useMe();
  const [updateStaff, { isLoading: saving }] = useUpdateStaffMutation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    address: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name ?? "",
        email: staff.email ?? "",
        phone: staff.phone ?? "",
        gender: staff.gender ?? "",
        // <input type="date"> needs YYYY-MM-DD; the API may send a full ISO string.
        date_of_birth: staff.date_of_birth ? staff.date_of_birth.slice(0, 10) : "",
        address: staff.address ?? "",
      });
    }
  }, [staff]);

  // Revoke the object URL when it is replaced or the card unmounts.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickAvatar = (file: File | null) => {
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFailed(false);
  };

  const dirty =
    !!staff &&
    (avatarFile !== null ||
      form.name !== (staff.name ?? "") ||
      form.email !== (staff.email ?? "") ||
      form.phone !== (staff.phone ?? "") ||
      form.gender !== (staff.gender ?? "") ||
      form.date_of_birth !== (staff.date_of_birth ? staff.date_of_birth.slice(0, 10) : "") ||
      form.address !== (staff.address ?? ""));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) return;
    setMsg({});
    // `name` is required by the API even on a partial update (StaffUpdate
    // inherits a required `name` with min_length=2), so guard it here rather
    // than letting the request come back 422.
    if (form.name.trim().length < 2) {
      setMsg({ error: "Name must be at least 2 characters." });
      return;
    }
    try {
      await updateStaff({
        staffId,
        data: { ...form, avatar_file: avatarFile },
      }).unwrap();
      setAvatarFile(null);
      setMsg({ ok: "Profile updated." });
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not update your profile.") });
    }
  };

  if (isLoading) {
    return (
      <Card icon={UserCog} tint="#7C6FF7" title="My profile" subtitle="Loading...">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Fetching your staff record...
        </p>
      </Card>
    );
  }

  // /staff/my resolves staff_id straight from the JWT, so a user account with
  // no staff record errors rather than returning empty.
  if (error || !hasStaffRecord) {
    return (
      <Card icon={UserCog} tint="#7C6FF7" title="My profile" subtitle="Staff record">
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No staff record is linked to your account, so there is nothing to edit
          here. Your account details are below.
        </p>
      </Card>
    );
  }

  const shownAvatar = avatarPreview ?? staff?.avatar_url ?? null;

  return (
    <Card icon={UserCog} tint="#7C6FF7" title="My profile" subtitle="Edit your own details">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* avatar + identity */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: shownAvatar
                  ? "var(--color-surface-elevated)"
                  : "var(--gradient-brand)",
              }}
            >
              {shownAvatar && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span
                  className="text-xl font-bold"
                  style={{ color: "var(--color-on-accent)" }}
                >
                  {initials}
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
                borderColor: "var(--color-surface-card)",
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

          <div className="min-w-0">
            <p
              className="text-lg font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {displayName}
            </p>
            {roleName && (
              <span
                className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: "var(--color-info)", background: "var(--color-info-tint)" }}
              >
                {roleName}
              </span>
            )}
            {avatarFile && (
              <p className="text-xs mt-1" style={{ color: "var(--color-warning)" }}>
                New photo selected — save to upload.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" value={form.name} onChange={set("name")} />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field label="Phone" value={form.phone} onChange={set("phone")} />
          <label className="flex flex-col gap-1.5">
            <span
              className="text-[11px] font-semibold tracking-wide uppercase"
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
          <Field label="Address" value={form.address} onChange={set("address")} />
        </div>

        <Status error={msg.error} ok={msg.ok} />

        <div className="flex justify-end">
          <SaveButton disabled={!dirty} busy={saving} />
        </div>
      </form>
    </Card>
  );
}

// ── user ───────────────────────────────────────────────────

function UserCard({
  profile,
  error,
  canEdit,
}: {
  profile: ReturnType<typeof useProfile>["profile"];
  error: unknown;
  canEdit: boolean;
}) {
  const [updateUser, { isLoading: saving }] = useUpdateUserMutation();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  // Seed the form once the fetch lands, and re-seed if it refetches.
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
    }
  }, [profile]);

  const dirty =
    !!profile &&
    (fullName !== (profile.full_name ?? "") ||
      username !== (profile.username ?? ""));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setMsg({});
    try {
      await updateUser({
        userId: profile.user_id,
        body: { full_name: fullName, username },
      }).unwrap();
      setMsg({ ok: "Profile updated." });
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not update profile.") });
    }
  };

  if (error) {
    return (
      <Card icon={UserCog} tint="#60A5FA" title="Account" subtitle="Your details">
        <Status error={apiMessage(error, "Could not load your profile.")} />
      </Card>
    );
  }

  return (
    <Card icon={UserCog} tint="#60A5FA" title="Account" subtitle="Your details">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Full name"
            value={fullName}
            onChange={canEdit ? setFullName : undefined}
          />
          <Field
            label="Username"
            value={username}
            onChange={canEdit ? setUsername : undefined}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
          <ReadOnly label="User ID" value={profile?.user_id} />
          <ReadOnly label="Role" value={profile?.role?.role_name} />
          <ReadOnly
            label="Department"
            value={profile?.department?.department_name}
          />
          <ReadOnly label="Status" value={profile?.status} />
          <ReadOnly
            label="Joined"
            value={
              profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : null
            }
          />
          <ReadOnly label="Staff record" value={profile?.staff?.name} />
        </div>

        <Status error={msg.error} ok={msg.ok} />

        {canEdit ? (
          <div className="flex justify-end">
            <SaveButton disabled={!dirty} busy={saving} />
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Editing your profile requires the{" "}
            <code>{Permissions.MANAGE_USERS}</code> permission.
          </p>
        )}
      </form>
    </Card>
  );
}

// ── company ────────────────────────────────────────────────

function CompanyCard({
  company,
  error,
  canEdit,
}: {
  company: ReturnType<typeof useProfile>["company"];
  error: unknown;
  canEdit: boolean;
}) {
  const [updateCompany, { isLoading: saving }] = useUpdateCompanyMutation();
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  useEffect(() => {
    if (company) {
      setForm({
        company_name: company.company_name ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
      });
    }
  }, [company]);

  const dirty =
    !!company &&
    (form.company_name !== (company.company_name ?? "") ||
      form.email !== (company.email ?? "") ||
      form.phone !== (company.phone ?? "") ||
      form.address !== (company.address ?? ""));

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setMsg({});
    try {
      await updateCompany({
        companyId: company.company_id,
        body: form,
      }).unwrap();
      setMsg({ ok: "Company updated." });
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not update company.") });
    }
  };

  if (error) {
    return (
      <Card icon={Building2} tint="#34D399" title="Company" subtitle="Organisation details">
        <Status error={apiMessage(error, "Could not load company.")} />
      </Card>
    );
  }

  return (
    <Card
      icon={Building2}
      tint="#34D399"
      title="Company"
      subtitle="Organisation details"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Company name"
          value={form.company_name}
          onChange={canEdit ? set("company_name") : undefined}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={canEdit ? set("email") : undefined}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={canEdit ? set("phone") : undefined}
          />
        </div>
        <Field
          label="Address"
          value={form.address}
          onChange={canEdit ? set("address") : undefined}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <ReadOnly label="Code" value={company?.company_code} />
          <ReadOnly label="Plan" value={company?.plan_type} />
          <ReadOnly label="Status" value={company?.status} />
          <ReadOnly label="Max users" value={company?.max_users} />
          <ReadOnly label="Timezone" value={company?.timezone} />
          <ReadOnly label="Currency" value={company?.currency} />
        </div>

        <Status error={msg.error} ok={msg.ok} />

        {canEdit ? (
          <div className="flex justify-end">
            <SaveButton disabled={!dirty} busy={saving} />
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Editing the company requires the{" "}
            <code>{Permissions.MANAGE_COMPANY}</code> permission.
          </p>
        )}
      </form>
    </Card>
  );
}

// ── password ───────────────────────────────────────────────

function PasswordCard() {
  const [changePassword, { isLoading: saving }] = useChangePasswordMutation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({});
    if (newPassword !== confirm) {
      setMsg({ error: "New passwords do not match." });
      return;
    }
    // Matches ChangePasswordRequest: old min_length=6, new min_length=8.
    if (newPassword.length < 8) {
      setMsg({ error: "New password must be at least 8 characters." });
      return;
    }
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }).unwrap();
      setMsg({ ok: "Password changed." });
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not change password.") });
    }
  };

  return (
    <Card
      icon={KeyRound}
      tint="#FBBF24"
      title="Password"
      subtitle="Change your own password"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Current password"
          type="password"
          value={oldPassword}
          onChange={setOldPassword}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
          />
          <Field
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
          />
        </div>

        <Status error={msg.error} ok={msg.ok} />

        <div className="flex justify-end">
          <SaveButton
            disabled={!oldPassword || !newPassword || !confirm}
            busy={saving}
            label="Change password"
          />
        </div>
      </form>
    </Card>
  );
}
