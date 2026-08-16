"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Database,
  Globe,
  Hash,
  User as UserIcon,
  X,
} from "lucide-react";
import { initialsOf } from "@/app/(components)/crud";
import type { AuditFieldChange, AuditLogResponse } from "@/state/types/audit";

/** Renders a JSON scalar the way it should read in a table cell. */
export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s === "" ? "—" : s;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Field-level diff between the two row snapshots.
 *
 * On INSERT `old_value` is null and on DELETE `new_value` is null, so those
 * list every field rather than a comparison. On UPDATE only fields that
 * actually changed are returned — the triggers snapshot the whole row, so
 * without this the diff would be mostly noise.
 */
export function diffOf(log: AuditLogResponse): {
  changes: AuditFieldChange[];
  unchanged: number;
} {
  const before = log.old_value ?? {};
  const after = log.new_value ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  const changes: AuditFieldChange[] = [];
  let unchanged = 0;

  for (const field of keys) {
    const a = (before as Record<string, unknown>)[field];
    const b = (after as Record<string, unknown>)[field];
    if (log.old_value && log.new_value && same(a, b)) {
      unchanged += 1;
      continue;
    }
    changes.push({ field, before: a, after: b });
  }
  return { changes, unchanged };
}

export function actionTone(action: string) {
  const a = action.toUpperCase();
  if (a === "INSERT") return { fg: "var(--color-success)", bg: "var(--color-success-tint)" };
  if (a === "DELETE") return { fg: "var(--color-error)", bg: "var(--color-error-tint)" };
  if (a === "UPDATE") return { fg: "var(--color-warning)", bg: "var(--color-warning-tint)" };
  return { fg: "var(--color-text-muted)", bg: "var(--color-divider)" };
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
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

export default function AuditDetailDialog({
  log,
  onClose,
}: {
  log: AuditLogResponse;
  onClose: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const { changes, unchanged } = useMemo(() => diffOf(log), [log]);
  const tone = actionTone(log.action);
  const isInsert = log.action.toUpperCase() === "INSERT";
  const isDelete = log.action.toUpperCase() === "DELETE";
  const actor = log.user;

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
        aria-label={`Audit entry #${log.log_id}`}
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
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
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
                style={{ color: tone.fg, background: tone.bg }}
              >
                {log.action}
              </span>
              <h2
                className="text-base font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {log.table_name}
              </h2>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Entry #{log.log_id}
              {log.record_id != null ? ` · record #${log.record_id}` : ""}
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

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* who / when / where */}
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: actor?.avatar_url
                  ? "var(--color-surface-card)"
                  : "var(--gradient-brand)",
              }}
            >
              {actor?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span
                  className="text-xs font-bold"
                  style={{ color: "var(--color-on-accent)" }}
                >
                  {initialsOf(actor?.full_name || actor?.username || "?")}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {actor?.full_name || actor?.username || "Unknown user"}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {actor?.username ? `@${actor.username}` : `user #${log.user_id ?? "—"}`}
              </p>
            </div>
          </div>

          <div
            className="rounded-xl border px-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Row icon={Database} label="Table" value={log.table_name} />
            <Row icon={Hash} label="Record" value={log.record_id ?? "—"} />
            <Row
              icon={Clock}
              label="When"
              value={new Date(log.created_at).toLocaleString()}
            />
            <Row icon={Globe} label="IP address" value={log.ip_address || "—"} />
            <Row icon={UserIcon} label="Company" value={log.company_id ?? "—"} />
          </div>

          {/* the diff */}
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              {isInsert
                ? "Created values"
                : isDelete
                  ? "Deleted values"
                  : `Changed fields (${changes.length})`}
            </span>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="text-xs font-semibold"
              style={{ color: "var(--color-blurple)" }}
            >
              {showRaw ? "Show diff" : "Show raw JSON"}
            </button>
          </div>

          {showRaw ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["old_value", "new_value"] as const).map((key) => (
                <div key={key}>
                  <p
                    className="text-[11px] font-semibold mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {key}
                  </p>
                  <pre
                    className="text-[11px] rounded-xl border p-3 overflow-x-auto"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface-card)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {log[key] ? JSON.stringify(log[key], null, 2) : "null"}
                  </pre>
                </div>
              ))}
            </div>
          ) : !changes.length ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              This entry carries no field snapshot.
            </p>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--color-surface-card)",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Field</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {changes.map((c) => (
                <div
                  key={c.field}
                  className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 border-t text-xs"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  <span
                    className="font-medium break-words"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {c.field}
                  </span>
                  <span
                    className="break-words"
                    style={{
                      color: isInsert
                        ? "var(--color-text-muted)"
                        : "var(--color-error)",
                    }}
                  >
                    {formatValue(c.before)}
                  </span>
                  <span
                    className="break-words"
                    style={{
                      color: isDelete
                        ? "var(--color-text-muted)"
                        : "var(--color-success)",
                    }}
                  >
                    {formatValue(c.after)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!showRaw && unchanged > 0 && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {unchanged} other field{unchanged === 1 ? " was" : "s were"}{" "}
              snapshotted but did not change.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
