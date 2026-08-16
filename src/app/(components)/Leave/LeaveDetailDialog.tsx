"use client";

import React, { useEffect } from "react";
import { Calendar, CalendarClock, MessageSquareText, ShieldCheck, X } from "lucide-react";
import { useGetLeaveRequestQuery } from "@/state/tageTypes/services/leaveApi";
import { leaveDays, type LeaveRequestResponse } from "@/state/types/leave";
import LeaveCountdown from "./LeaveCountdown";

const STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  pending: { fg: "var(--color-warning)", bg: "var(--color-warning-tint)" },
  approved: { fg: "var(--color-success)", bg: "var(--color-success-tint)" },
  rejected: { fg: "var(--color-error)", bg: "var(--color-error-tint)" },
  cancelled: { fg: "var(--color-text-muted)", bg: "var(--color-divider)" },
};

const fmtDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

function Field({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tint?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-divider)" }}
      >
        <Icon className="h-4 w-4" style={{ color: tint ?? "var(--color-text-secondary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        <p className="text-sm" style={{ color: tint ?? "var(--color-text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function LeaveDetailDialog({
  leave,
  onClose,
}: {
  leave: LeaveRequestResponse;
  onClose: () => void;
}) {
  // Refetch by id so the dialog shows the authoritative record rather than
  // the list row's snapshot — mirrors AttendanceDetailDialog. A staff member
  // viewing their own request falls back to the row on a 403 from the
  // manager-gated `/leave-requests/{id}` route.
  const { data } = useGetLeaveRequestQuery(leave.leave_id);
  const item = data ?? leave;

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const staffName = item.staff?.name ?? `Staff #${item.staff_id}`;
  const days = leaveDays(item.start_date, item.end_date);
  const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${staffName} leave request`}
        className="w-full max-w-md rounded-2xl border overflow-hidden max-h-[88vh] overflow-y-auto"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: item.staff?.avatar_url
                ? "var(--color-surface-card)"
                : "var(--gradient-brand)",
            }}
          >
            {item.staff?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.staff.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: "var(--color-on-accent)" }}>
                {staffName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate capitalize"
              style={{ color: "var(--color-text-primary)" }}
            >
              {item.leave_type} leave
            </h2>
            <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
              {staffName}
            </p>
          </div>

          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
            style={{ color: statusStyle.fg, background: statusStyle.bg }}
          >
            {item.status}
          </span>

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

        <div className="px-5 py-3">
          <Field
            icon={Calendar}
            label="Duration"
            value={`${fmtDate(item.start_date)} → ${fmtDate(item.end_date)} · ${days} day${
              days === 1 ? "" : "s"
            }`}
          />
          {item.reason && (
            <Field icon={MessageSquareText} label="Reason" value={item.reason} />
          )}
          {item.approved_by_name && (
            <Field
              icon={ShieldCheck}
              label={item.status === "rejected" ? "Reviewed by" : "Approved by"}
              value={item.approved_by_name}
            />
          )}
          <Field
            icon={CalendarClock}
            label="Requested"
            value={fmtDateTime(item.created_at)}
          />

          <LeaveCountdown
            startDate={item.start_date}
            endDate={item.end_date}
            status={item.status}
          />
        </div>
      </div>
    </div>
  );
}
