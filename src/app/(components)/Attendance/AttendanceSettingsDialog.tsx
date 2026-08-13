"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock,
  Compass,
  Globe,
  Info,
  Loader2,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  ShieldCheck,
  Target,
  Timer,
  Users,
  X,
} from "lucide-react";
import MapPicker from "./MapPicker";
import OfficeQrCard from "./OfficeQrCard";
import {
  useGetAttendanceSettingsQuery,
  useUpdateAttendanceSettingsMutation,
} from "@/state/tageTypes/services/attendanceApi";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import { useGetDepartmentsQuery } from "@/state/tageTypes/services/usersApi";
import type { AttendanceSettingsUpdate } from "@/state/types/attendance";

type Tab = "geofence" | "policy" | "staff";

const apiMessage = (err: unknown, fallback: string) => {
  const status = (err as { status?: number })?.status;
  if (status === 403) return "Your role does not allow changing attendance settings.";
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  return fallback;
};

/**
 * First-run defaults.
 *
 * GET /attendance-settings/ 404s until a settings row exists, and PATCH
 * upserts — so a 404 means "not configured yet", and the form is seeded so a
 * manager can save straight away instead of facing empty required fields.
 */
const DEFAULTS = {
  office_latitude: "",
  office_longitude: "",
  allowed_radius_meters: "100",
  office_open_time: "09:00:00",
  office_close_time: "17:00:00",
  timezone: "Asia/Phnom_Penh",
  late_threshold_minutes: "15",
  overtime_threshold_minutes: "480",
};

function Banner({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ElementType;
  tone: "info" | "warn";
  children: React.ReactNode;
}) {
  const color = tone === "warn" ? "var(--color-warning)" : "var(--color-info)";
  const bg = tone === "warn" ? "var(--color-warning-tint)" : "var(--color-info-tint)";
  return (
    <div
      className="flex gap-3 rounded-xl p-3.5"
      style={{ background: bg, border: `1px solid ${color}` }}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color }} />
      <p className="text-xs leading-relaxed" style={{ color }}>
        {children}
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <div
        className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
      </div>
    </label>
  );
}

export default function AttendanceSettingsDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("geofence");
  const [mapOpen, setMapOpen] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  const { data: settings, isLoading, error: loadError } =
    useGetAttendanceSettingsQuery();
  const [save, { isLoading: saving }] = useUpdateAttendanceSettingsMutation();

  const { data: staff } = useGetAllStaffQuery(undefined, { skip: tab !== "staff" });
  const { data: departments } = useGetDepartmentsQuery(undefined, {
    skip: tab !== "staff",
  });

  const [form, setForm] = useState({
    office_latitude: "",
    office_longitude: "",
    allowed_radius_meters: "",
    office_open_time: "",
    office_close_time: "",
    timezone: "",
    late_threshold_minutes: "",
    overtime_threshold_minutes: "",
  });

  // 404 = no settings row yet. Seed the defaults so the first save can create
  // one; anything else is a real error and leaves the form alone.
  const notConfigured =
    (loadError as { status?: number } | undefined)?.status === 404;

  useEffect(() => {
    if (notConfigured) {
      setForm(DEFAULTS);
      return;
    }
    if (!settings) return;
    setForm({
      office_latitude: String(settings.office_latitude ?? ""),
      office_longitude: String(settings.office_longitude ?? ""),
      allowed_radius_meters: String(settings.allowed_radius_meters ?? ""),
      office_open_time: settings.office_open_time ?? "",
      office_close_time: settings.office_close_time ?? "",
      timezone: settings.timezone ?? "",
      late_threshold_minutes: String(settings.late_threshold_minutes ?? ""),
      overtime_threshold_minutes: String(
        settings.overtime_threshold_minutes ?? ""
      ),
    });
  }, [settings, notConfigured]);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const lat = Number(form.office_latitude);
  const lng = Number(form.office_longitude);
  const radius = Number(form.allowed_radius_meters);

  const onSave = async () => {
    setMsg({});
    // Distinguish "not filled in" from "filled in wrong" — an empty string
    // coerces to 0, which silently passes a naive range check and made an
    // unconfigured geofence look like a validation failure.
    if (!form.office_latitude.trim() || !form.office_longitude.trim()) {
      setMsg({ error: "Set the office coordinates first — type them in or use Pick from Map." });
      setTab("geofence");
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setMsg({ error: "Latitude must be a number between -90 and 90." });
      setTab("geofence");
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setMsg({ error: "Longitude must be a number between -180 and 180." });
      setTab("geofence");
      return;
    }
    if (!form.allowed_radius_meters.trim() || !Number.isFinite(radius) || radius <= 0) {
      setMsg({ error: "Allowed radius must be a positive number of metres." });
      setTab("geofence");
      return;
    }

    // Only send fields that carry a value — the handler uses
    // exclude_unset=True, so omitted keys are left untouched. Coordinates go
    // as numbers, matching the API's `double` contract.
    const body: AttendanceSettingsUpdate = {
      office_latitude: lat,
      office_longitude: lng,
      allowed_radius_meters: radius,
    };
    if (form.office_open_time.trim()) body.office_open_time = form.office_open_time.trim();
    if (form.office_close_time.trim()) body.office_close_time = form.office_close_time.trim();
    if (form.timezone.trim()) body.timezone = form.timezone.trim();
    // `|| undefined` would drop a deliberate 0, so test for a filled field.
    if (form.late_threshold_minutes.trim()) {
      body.late_threshold_minutes = Number(form.late_threshold_minutes);
    }
    if (form.overtime_threshold_minutes.trim()) {
      body.overtime_threshold_minutes = Number(form.overtime_threshold_minutes);
    }

    try {
      await save(body).unwrap();
      setMsg({ ok: "Settings saved." });
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not save settings.") });
    }
  };

  /** Staff grouped by department, for the third tab. */
  const grouped = useMemo(() => {
    if (!staff) return [];
    const byDept = new Map<string, typeof staff>();
    for (const s of staff) {
      const key = s.staff_role?.role_name ?? "Unassigned";
      byDept.set(key, [...(byDept.get(key) ?? []), s]);
    }
    return [...byDept.entries()];
  }, [staff]);

  const overtimeHours = Number(form.overtime_threshold_minutes);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "geofence", label: "Geofence", icon: MapPin },
    { id: "policy", label: "Policy", icon: ShieldCheck },
    { id: "staff", label: "Staff & Dept", icon: Users },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
        style={{ background: "var(--color-scrim)" }}
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Attendance settings"
          className="w-full max-w-3xl h-[85vh] rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <h2
            className="flex-1 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Attendance settings
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

        {/* tabs — left-aligned row, web convention rather than full-width thirds */}
        <div
          className="flex gap-1 px-5 border-b shrink-0"
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

        {/* body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <div className="w-full flex flex-col gap-4">
            {notConfigured && (
              <Banner icon={Info} tone="warn">
                This company has no attendance settings yet. Set the office
                location and radius below, then save to create them — staff
                cannot check in until a geofence exists.
              </Banner>
            )}

            {loadError && !notConfigured && (
              <Banner icon={Info} tone="warn">
                Could not load attendance settings —{" "}
                {apiMessage(loadError, "the API returned an error.")}
              </Banner>
            )}

            {/* ── GEOFENCE ── */}
            {tab === "geofence" && (
              <>
                <Banner icon={MapPin} tone="info">
                  Set the office GPS coordinates and the allowed check-in radius.
                  Staff must be within this radius to check in/out.
                </Banner>

                <Field
                  icon={Compass}
                  label="Office Latitude"
                  value={form.office_latitude}
                  onChange={set("office_latitude")}
                  inputMode="decimal"
                />
                <Field
                  icon={Compass}
                  label="Office Longitude"
                  value={form.office_longitude}
                  onChange={set("office_longitude")}
                  inputMode="decimal"
                />

                <button
                  onClick={() => setMapOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  style={{
                    background: "var(--color-blurple)",
                    color: "var(--color-on-accent)",
                  }}
                >
                  <MapIcon className="h-4 w-4" />
                  Pick from Map
                </button>

                <Field
                  icon={Target}
                  label="Allowed Radius (metres)"
                  value={form.allowed_radius_meters}
                  onChange={set("allowed_radius_meters")}
                  inputMode="numeric"
                />

                <Banner icon={Info} tone="info">
                  Tip: Open Google Maps, long-press your office, and copy the
                  coordinates.
                </Banner>

                <div className="pt-2">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Office QR
                  </p>
                  <OfficeQrCard />
                </div>
              </>
            )}

            {/* ── POLICY ── */}
            {tab === "policy" && (
              <>
                <Banner icon={ShieldCheck} tone="warn">
                  Define office hours, timezone, late threshold, and overtime
                  rules.
                </Banner>

                <p
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Office hours
                </p>
                <Field
                  icon={LogIn}
                  label="Office Open Time"
                  value={form.office_open_time}
                  onChange={set("office_open_time")}
                />
                <Field
                  icon={LogOut}
                  label="Office Close Time"
                  value={form.office_close_time}
                  onChange={set("office_close_time")}
                />
                <Field
                  icon={Globe}
                  label="Timezone"
                  value={form.timezone}
                  onChange={set("timezone")}
                />

                <p
                  className="text-[11px] font-semibold uppercase tracking-widest pt-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Thresholds
                </p>
                <Field
                  icon={Clock}
                  label="Late Threshold (minutes after shift start)"
                  value={form.late_threshold_minutes}
                  onChange={set("late_threshold_minutes")}
                  inputMode="numeric"
                />
                <Field
                  icon={Timer}
                  label="Overtime Threshold (minutes of work)"
                  value={form.overtime_threshold_minutes}
                  onChange={set("overtime_threshold_minutes")}
                  inputMode="numeric"
                />

                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--color-warning-tint)",
                    border: "1px solid var(--color-warning)",
                  }}
                >
                  <p
                    className="text-sm font-bold mb-2"
                    style={{ color: "var(--color-warning)" }}
                  >
                    Current Policy
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-warning)" }}>
                    • Staff arriving more than {form.late_threshold_minutes || "—"}{" "}
                    min after shift start are marked Late.
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-warning)" }}
                  >
                    • Overtime is counted after{" "}
                    {Number.isFinite(overtimeHours) && overtimeHours > 0
                      ? `${Math.floor(overtimeHours / 60)}h ${overtimeHours % 60}m`
                      : "—"}{" "}
                    of work.
                  </p>
                </div>
              </>
            )}

            {/* ── STAFF & DEPT ── */}
            {tab === "staff" && (
              <>
                <Banner icon={Users} tone="info">
                  Everyone the attendance policy applies to. Scoping different
                  rules per department needs a per-department settings route,
                  which the API does not expose yet.
                </Banner>

                {departments && departments.length > 0 && (
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Departments ({departments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((d) => (
                        <span
                          key={d.department_id}
                          className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                          style={{
                            background: "var(--color-surface-card)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          <Building2 className="h-3 w-3" />
                          {d.department_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Staff ({staff?.length ?? 0})
                  </p>
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    {grouped.map(([role, members]) => (
                      <div key={role}>
                        <p
                          className="px-3 py-1.5 text-[11px] font-semibold"
                          style={{
                            background: "var(--color-surface-card)",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {role}
                        </p>
                        {members.map((m) => (
                          <div
                            key={m.staff_id}
                            className="flex items-center justify-between px-3 py-2.5 border-t"
                            style={{ borderColor: "var(--color-divider)" }}
                          >
                            <span
                              className="text-sm"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {m.name}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {m.email ?? "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {!staff?.length && (
                      <p
                        className="px-3 py-6 text-sm text-center"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        No staff found.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* footer — primary action bottom-right, web convention */}
        <div
          className="shrink-0 px-5 py-4 border-t flex items-center gap-3"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <p
            className="flex-1 text-xs min-w-0"
            style={{
              color: msg.error
                ? "var(--color-error)"
                : msg.ok
                ? "var(--color-success)"
                : "var(--color-text-muted)",
            }}
          >
            {msg.error ?? msg.ok ?? "Changes apply to every scan in this company."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold border shrink-0"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isLoading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 shrink-0"
            style={{
              background: "var(--color-blurple)",
              color: "var(--color-on-accent)",
            }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
        </div>
      </div>

      {mapOpen && (
        <MapPicker
          // Falls back to Phnom Penh when nothing is configured yet.
          initialLat={Number.isFinite(lat) && lat !== 0 ? lat : 11.5564}
          initialLng={Number.isFinite(lng) && lng !== 0 ? lng : 104.9282}
          radiusMeters={Number.isFinite(radius) ? radius : undefined}
          onClose={() => setMapOpen(false)}
          onConfirm={(newLat, newLng) => {
            setForm((f) => ({
              ...f,
              office_latitude: newLat.toFixed(6),
              office_longitude: newLng.toFixed(6),
            }));
            setMapOpen(false);
          }}
        />
      )}
    </>
  );
}
