"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, FileSpreadsheet, FileText, ScrollText } from "lucide-react";
import {
  Card,
  CrudHeader,
  EmptyState,
  SearchBar,
  apiMessage,
  initialsOf,
} from "@/app/(components)/crud";
import { exportExcel, exportPdf, slug } from "@/app/(components)/crud/exporters";
import AuditDetailDialog, {
  actionTone,
  diffOf,
} from "@/app/(components)/Audit/AuditDetailDialog";
import { useAuth } from "@/state/tageTypes/lib/hook";
import {
  useGetAuditLogsByActionQuery,
  useGetAuditLogsByTableQuery,
  useGetAuditLogsByUserQuery,
  useGetAuditLogsQuery,
} from "@/state/tageTypes/services/auditLogApi";
import type { AuditLogResponse } from "@/state/types/audit";

/** Which server route backs the list — each filter is its own endpoint. */
type Scope =
  | { kind: "all" }
  | { kind: "action"; action: string }
  | { kind: "table"; table: string }
  | { kind: "user"; userId: number };

const ACTIONS = ["INSERT", "UPDATE", "DELETE"];
const LIMITS = [50, 100, 250, 500];

const relative = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function AuditLogsPage() {
  const { isSuperuser } = useAuth();

  const [scope, setScope] = useState<Scope>({ kind: "all" });
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [tableInput, setTableInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const [detail, setDetail] = useState<AuditLogResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Only the query matching the active scope runs; the rest are skipped so a
  // filter change costs one request, not four.
  const allQ = useGetAuditLogsQuery(
    useMemo(() => ({ limit }), [limit]),
    { skip: !isSuperuser || scope.kind !== "all" }
  );
  const actionQ = useGetAuditLogsByActionQuery(
    useMemo(
      () => ({ action: scope.kind === "action" ? scope.action : "", limit }),
      [scope, limit]
    ),
    { skip: !isSuperuser || scope.kind !== "action" }
  );
  const tableQ = useGetAuditLogsByTableQuery(
    useMemo(
      () => ({ tableName: scope.kind === "table" ? scope.table : "", limit }),
      [scope, limit]
    ),
    { skip: !isSuperuser || scope.kind !== "table" }
  );
  const userQ = useGetAuditLogsByUserQuery(
    useMemo(
      () => ({ userId: scope.kind === "user" ? scope.userId : 0, limit }),
      [scope, limit]
    ),
    { skip: !isSuperuser || scope.kind !== "user" }
  );

  const active =
    scope.kind === "action"
      ? actionQ
      : scope.kind === "table"
        ? tableQ
        : scope.kind === "user"
          ? userQ
          : allQ;

  const logs = active.data ?? [];

  /** Tables seen in the current result, offered as one-click filters. */
  const tables = useMemo(
    () => [...new Set(logs.map((l) => l.table_name))].sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [
        l.table_name,
        l.action,
        l.ip_address,
        l.user?.username,
        l.user?.full_name,
        String(l.record_id ?? ""),
        String(l.log_id),
      ]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [logs, search]);

  const columns = [
    { header: "Entry", value: (l: AuditLogResponse) => l.log_id, numeric: true },
    { header: "When", value: (l: AuditLogResponse) => new Date(l.created_at).toLocaleString() },
    { header: "Action", value: (l: AuditLogResponse) => l.action },
    { header: "Table", value: (l: AuditLogResponse) => l.table_name },
    { header: "Record", value: (l: AuditLogResponse) => l.record_id ?? "", numeric: true },
    { header: "User", value: (l: AuditLogResponse) => l.user?.full_name || l.user?.username || "" },
    { header: "IP", value: (l: AuditLogResponse) => l.ip_address ?? "" },
    {
      header: "Changed fields",
      value: (l: AuditLogResponse) =>
        diffOf(l)
          .changes.map((c) => c.field)
          .join(", "),
    },
  ];

  const scopeLabel =
    scope.kind === "all"
      ? "All activity"
      : scope.kind === "action"
        ? `Action: ${scope.action}`
        : scope.kind === "table"
          ? `Table: ${scope.table}`
          : `User #${scope.userId}`;

  const meta: [string, string][] = [
    ["Scope", scopeLabel],
    ["Rows", `${filtered.length} of ${logs.length} fetched (limit ${limit})`],
    ["Generated", new Date().toLocaleString()],
  ];

  const onPdf = () => {
    setExportError(null);
    const res = exportPdf({
      title: "Audit Log",
      subtitle: scopeLabel,
      meta,
      columns,
      rows: filtered,
    });
    if (!res.ok) setExportError(res.error ?? "Could not open the report window.");
  };

  const onExcel = () => {
    setExportError(null);
    exportExcel({
      filename: `${slug(`audit-log-${scopeLabel}`)}.xls`,
      sheetName: "Audit Log",
      title: "Audit Log",
      meta,
      columns,
      rows: filtered,
    });
  };

  if (!isSuperuser) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <CrudHeader title="Audit log" />
        <EmptyState message="Only a superuser can read the audit log." />
      </div>
    );
  }

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="rounded-full px-3.5 py-1.5 text-sm font-medium border"
      style={{
        background: on ? "var(--color-info-tint)" : "transparent",
        borderColor: on ? "var(--color-blurple)" : "var(--color-border)",
        color: on ? "var(--color-blurple)" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Audit log"
        subtitle={`${filtered.length} entr${filtered.length === 1 ? "y" : "ies"} · ${scopeLabel}`}
      />

      {/* action + limit filters */}
      <div className="flex flex-wrap items-center gap-2">
        {chip("All", scope.kind === "all", () => setScope({ kind: "all" }))}
        {ACTIONS.map((a) =>
          chip(a, scope.kind === "action" && scope.action === a, () =>
            setScope({ kind: "action", action: a })
          )
        )}

        <span className="flex-1" />

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          aria-label="Row limit"
          className="rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        >
          {LIMITS.map((n) => (
            <option key={n} value={n}>
              Last {n}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onPdf}
          disabled={!filtered.length}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        >
          <FileText className="h-3.5 w-3.5" />
          PDF
        </button>
        <button
          type="button"
          onClick={onExcel}
          disabled={!filtered.length}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Excel
        </button>
      </div>

      {/* table + user lookups — both are their own server route */}
      <div className="flex flex-wrap gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tableInput.trim()) setScope({ kind: "table", table: tableInput.trim() });
          }}
          className="flex gap-2"
        >
          <input
            value={tableInput}
            onChange={(e) => setTableInput(e.target.value)}
            placeholder="Filter by table, e.g. products"
            className="rounded-xl border px-3 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--color-surface-card)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="submit"
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            Go
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(userInput);
            if (Number.isInteger(id) && id > 0) setScope({ kind: "user", userId: id });
          }}
          className="flex gap-2"
        >
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            inputMode="numeric"
            placeholder="Filter by user id"
            className="rounded-xl border px-3 py-2 text-sm w-40 focus:outline-none"
            style={{
              background: "var(--color-surface-card)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            type="submit"
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            Go
          </button>
        </form>
      </div>

      {/* tables present in this result */}
      {tables.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {tables.map((t) =>
            chip(t, scope.kind === "table" && scope.table === t, () =>
              setScope({ kind: "table", table: t })
            )
          )}
        </div>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search table, user, IP, record id..."
      />

      {exportError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {exportError}
        </p>
      )}

      <Card className="overflow-hidden">
        {active.error ? (
          <EmptyState message={apiMessage(active.error, "Could not load the audit log.")} />
        ) : active.isLoading ? (
          <EmptyState message="Loading audit log..." />
        ) : !filtered.length ? (
          <EmptyState
            message={search ? "No entries match that search." : "No audit entries."}
          />
        ) : (
          filtered.map((l) => {
            const tone = actionTone(l.action);
            const { changes } = diffOf(l);
            return (
              <button
                type="button"
                key={l.log_id}
                onClick={() => setDetail(l)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 text-left"
                style={{ borderColor: "var(--color-divider)" }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: tone.bg }}
                >
                  <ScrollText className="h-4 w-4" style={{ color: tone.fg }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ color: tone.fg, background: tone.bg }}
                    >
                      {l.action}
                    </span>
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {l.table_name}
                    </span>
                    {l.record_id != null && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        #{l.record_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                    {l.user?.full_name || l.user?.username || `user #${l.user_id ?? "—"}`}
                    {changes.length ? ` · ${changes.length} field${changes.length === 1 ? "" : "s"}` : ""}
                    {l.ip_address ? ` · ${l.ip_address}` : ""}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {relative(l.created_at)}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div
                  className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                  style={{
                    background: l.user?.avatar_url
                      ? "var(--color-surface-card)"
                      : "var(--gradient-brand)",
                  }}
                >
                  {l.user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: "var(--color-on-accent)" }}
                    >
                      {initialsOf(l.user?.full_name || l.user?.username || "?")}
                    </span>
                  )}
                </div>

                <ChevronRight
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                />
              </button>
            );
          })
        )}
      </Card>

      {logs.length >= limit && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Showing the newest {limit} entries — the API has no pagination, so raise
          the limit to see older activity.
        </p>
      )}

      {detail && (
        <AuditDetailDialog log={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
