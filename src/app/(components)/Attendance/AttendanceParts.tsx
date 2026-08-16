"use client";

import React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  DoorOpen,
  LogIn,
  LogOut,
} from "lucide-react";
import type { AttendanceResponse } from "@/state/types/attendance";
import { Card } from "@/app/(components)/crud";

// ── helpers ──────────────────────────────────────────────

/** "22:24:00" -> "10:24 PM" */
export function formatTime(t?: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "2026-08-08" -> "Sat, 8 Aug 2026" */
export function formatDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Worked time between check-in and check-out, tolerating a midnight rollover. */
export function formatDuration(
  inTime?: string | null,
  outTime?: string | null
): string | null {
  if (!inTime || !outTime) return null;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let mins = toMinutes(outTime) - toMinutes(inTime);
  if (Number.isNaN(mins)) return null;
  if (mins < 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Weekend days read as "Off" rather than "Present".
 *
 * The API has no notion of a working day — there is no schedule or holiday
 * table — so this is derived from the weekday alone. Any company working
 * Saturdays will need this driven by real settings instead.
 */
export function dayStatus(iso: string): { label: string; isOff: boolean } {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const day = d.getDay();
  const isOff = day === 0 || day === 6;
  return { label: isOff ? "Off" : "Present", isOff };
}

export const monthLabel = (month: number, year: number) =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── stats row ────────────────────────────────────────────

export function StatsRow({
  present,
  checkedOut,
  stillIn,
}: {
  present: number | string;
  checkedOut: number | string;
  stillIn: number | string;
}) {
  const cells = [
    { icon: CircleCheck, label: "Present", value: present, tint: "var(--color-success)" },
    { icon: DoorOpen, label: "Checked Out", value: checkedOut, tint: "var(--color-blurple)" },
    { icon: CalendarDays, label: "Still In", value: stillIn, tint: "var(--color-warning)" },
  ];

  return (
    <Card className="grid grid-cols-3 overflow-hidden">
      {cells.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="flex flex-col items-center gap-2 py-5"
            style={{
              borderLeft: i === 0 ? "none" : "1px solid var(--color-divider)",
            }}
          >
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${c.tint} 15%, transparent)` }}
            >
              <Icon className="h-4 w-4" style={{ color: c.tint }} />
            </div>
            <span className="text-xl font-bold leading-none" style={{ color: c.tint }}>
              {c.value}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {c.label}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

// ── month navigator ──────────────────────────────────────

export function MonthNav({
  month,
  year,
  onChange,
  trailing,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  trailing?: React.ReactNode;
}) {
  const now = new Date();
  const isThisMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    onChange(m, y);
  };

  return (
    <div
      className="flex items-center gap-2 py-3 border-b"
      style={{ borderColor: "var(--color-divider)" }}
    >
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Previous month"
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
        <span
          className="text-sm font-bold truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {monthLabel(month, year)}
        </span>
        {isThisMonth && (
          <span
            className="text-[11px] font-semibold shrink-0"
            style={{ color: "var(--color-blurple)" }}
          >
            This month
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => shift(1)}
        aria-label="Next month"
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {trailing}
    </div>
  );
}

// ── record row ───────────────────────────────────────────

export function AttendanceRow({
  record,
  name,
  avatarUrl,
  onClick,
}: {
  record: AttendanceResponse;
  name: string;
  avatarUrl?: string | null;
  onClick?: () => void;
}) {
  const status = dayStatus(record.date);
  const inAt = formatTime(record.check_in_time);
  const outAt = formatTime(record.check_out_time);
  const duration = formatDuration(record.check_in_time, record.check_out_time);

  const Wrapper = (onClick ? "button" : "div") as React.ElementType;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 text-left ${
        onClick ? "transition-colors" : ""
      }`}
      style={{ borderColor: "var(--color-divider)" }}
      onMouseEnter={
        onClick
          ? (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = "var(--color-divider)";
            }
          : undefined
      }
      onMouseLeave={
        onClick
          ? (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = "transparent";
            }
          : undefined
      }
    >
      <div
        className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{
          background: avatarUrl
            ? "var(--color-surface-card)"
            : "var(--gradient-brand)",
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            className="text-xs font-bold"
            style={{ color: "var(--color-on-accent)" }}
          >
            {initialsOf(name)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {name}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {formatDate(record.date)}
          </span>
          {status.isOff && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Off
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span
            className="text-xs font-medium inline-flex items-center gap-1"
            style={{ color: "var(--color-success)" }}
          >
            <LogIn className="h-3 w-3" />
            {inAt ?? "—"}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            →
          </span>
          <span
            className="text-xs font-medium inline-flex items-center gap-1"
            style={{
              color: outAt ? "var(--color-error)" : "var(--color-warning)",
            }}
          >
            <LogOut className="h-3 w-3" />
            {outAt ?? "still in"}
          </span>
          {duration && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {duration}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {!status.isOff && (
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--color-success)" }}
          >
            Present
          </span>
        )}
        {onClick && (
          <ChevronRight
            className="h-4 w-4"
            style={{ color: "var(--color-text-muted)" }}
          />
        )}
      </div>
    </Wrapper>
  );
}