"use client";

import React, { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import type { LeaveStatus } from "@/state/types/leave";

const startOfDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
const endOfDay = (iso: string) => new Date(`${iso.slice(0, 10)}T23:59:59`).getTime();

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const MIN_MS = 60000;

/**
 * Live days/hours/mins/secs readout for an approved leave that's upcoming or
 * in progress. Ticks every second via its own interval, so mounting several
 * of these (one per row) is fine — each is cheap and independent.
 */
export default function LeaveCountdown({
  startDate,
  endDate,
  status,
}: {
  startDate: string;
  endDate: string;
  status: LeaveStatus;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Only an approved leave is actually "on the calendar" — pending/rejected/
  // cancelled requests have no real start/end to count down.
  if (status !== "approved") return null;

  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  if (now > end) return null; // already over

  const isUpcoming = now < start;
  const remaining = isUpcoming ? start - now : end - now;
  const elapsedPct = isUpcoming
    ? 0
    : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.floor((remaining % DAY_MS) / HOUR_MS);
  const mins = Math.floor((remaining % HOUR_MS) / MIN_MS);
  const secs = Math.floor((remaining % MIN_MS) / 1000);

  const endingSoon = !isUpcoming && remaining <= DAY_MS;

  return (
    <div
      className="mt-2.5 rounded-xl px-3 py-2.5"
      style={{ background: "var(--color-divider)" }}
    >
      {(isUpcoming || endingSoon) && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{ color: "var(--color-warning)", background: "var(--color-warning-tint)" }}
        >
          <Hourglass className="h-3 w-3" />
          {isUpcoming ? "Starting soon" : "Ending soon"}
        </span>
      )}

      {!isUpcoming && (
        <>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-border)" }}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${elapsedPct}%`, background: "var(--color-warning)" }}
            />
          </div>
          <div
            className="flex items-center justify-between mt-1 text-[11px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span>{Math.round(elapsedPct)}% elapsed</span>
            <span>
              {days}d {hours}h left
            </span>
          </div>
        </>
      )}

      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {(
          [
            ["days", days],
            ["hours", hours],
            ["mins", mins],
            ["secs", secs],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-lg py-1.5"
            style={{ background: "var(--color-surface-card)" }}
          >
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {String(value).padStart(2, "0")}
            </span>
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
