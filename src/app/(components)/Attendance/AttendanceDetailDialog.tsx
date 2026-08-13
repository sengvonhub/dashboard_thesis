"use client";

import React, { useEffect } from "react";
import { Clock, LogIn, LogOut, MapPin, X } from "lucide-react";
import { useGetAttendanceByIdQuery } from "@/state/tageTypes/services/attendanceApi";
import type { AttendanceResponse } from "@/state/types/attendance";
import { formatDate, formatDuration, formatTime } from "./AttendanceParts";

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
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-divider)" }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: tint ?? "var(--color-text-secondary)" }}
        />
      </div>
      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        <p
          className="text-sm truncate"
          style={{ color: tint ?? "var(--color-text-primary)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function AttendanceDetailDialog({
  record,
  onClose,
}: {
  record: AttendanceResponse;
  onClose: () => void;
}) {
  // Refetch by id so the dialog shows the authoritative record (and its
  // eager-loaded staff relation) rather than the list row's snapshot. The
  // route is manager-gated, so this falls back to the row on 403.
  const { data } = useGetAttendanceByIdQuery(record.attendance_id);
  const item = data ?? record;

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const staffName = item.staff?.name ?? `Staff #${item.staff_id}`;
  const duration = formatDuration(item.check_in_time, item.check_out_time);
  const coords =
    item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : null;

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
        aria-label={`${staffName} attendance`}
        className="w-full max-w-md rounded-2xl border overflow-hidden"
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
              <img
                src={item.staff.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-sm font-bold"
                style={{ color: "var(--color-on-accent)" }}
              >
                {staffName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {staffName}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatDate(item.date)}
            </p>
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

        <div className="px-5 py-3">
          <Field
            icon={LogIn}
            label="Checked in"
            value={formatTime(item.check_in_time) ?? "—"}
            tint="var(--color-success)"
          />
          <Field
            icon={LogOut}
            label="Checked out"
            value={formatTime(item.check_out_time) ?? "Still in"}
            tint={
              item.check_out_time ? "var(--color-error)" : "var(--color-warning)"
            }
          />
          <Field icon={Clock} label="Duration" value={duration ?? "—"} />
          <Field
            icon={MapPin}
            label="Scanned at"
            value={coords ?? "No location recorded"}
          />
        </div>
      </div>
    </div>
  );
}