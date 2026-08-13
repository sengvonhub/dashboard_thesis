"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  LogIn,
  LogOut,
  Search,
  Settings,
  Sheet,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import ScanDialog, { type ScanMode } from "@/app/(components)/Attendance/ScanDialog";
import AttendanceDetailDialog from "@/app/(components)/Attendance/AttendanceDetailDialog";
import AttendanceSettingsDialog from "@/app/(components)/Attendance/AttendanceSettingsDialog";
import {
  AttendanceRow,
  MonthNav,
  StatsRow,
  formatDate,
  formatDuration,
  formatTime,
  monthLabel,
} from "@/app/(components)/Attendance/AttendanceParts";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { useMe } from "@/state/tageTypes/lib/useMe";
import { Permissions } from "@/state/permissions";
import {
  useGetAllAttendanceQuery,
  useGetMyAttendanceQuery,
  useGetMyMonthlyStatsQuery,
  useGetTodaySummaryQuery,
} from "@/state/tageTypes/services/attendanceApi";
import type { AttendanceResponse } from "@/state/types/attendance";
import { white } from "tailwindcss/colors";

type Tab = "mine" | "manager";

export default function AttendancePage() {
  const { has, isSuperuser } = usePermissions();
  const { staff, hasStaffRecord, displayName, avatarUrl } = useMe();

  /**
   * Who sees the Manager View.
   *
   * Three independent signals, because the API expresses "manager" three
   * different ways: the manager routes use `require_manager`, permissions use
   * VIEW_TEAM_ATTENDANCE, and the staff record carries `staff_role.is_manager`.
   * A superuser's permission list is the literal ["*"], handled in usePermissions.
   */
  const canViewAll =
    isSuperuser ||
    has(Permissions.VIEW_TEAM_ATTENDANCE) ||
    staff?.staff_role?.is_manager === true;

  const now = new Date();
  const [tab, setTab] = useState<Tab>(hasStaffRecord ? "mine" : "manager");
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [detail, setDetail] = useState<AttendanceResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [myMonth, setMyMonth] = useState(now.getMonth() + 1);
  const [myYear, setMyYear] = useState(now.getFullYear());
  const [mgrMonth, setMgrMonth] = useState(now.getMonth() + 1);
  const [mgrYear, setMgrYear] = useState(now.getFullYear());
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Manager-view "Today" filter — null means "show the whole month".
  // Holds an ISO date string (YYYY-MM-DD) when active.
  const [dayFilter, setDayFilter] = useState<string | null>(null);

  // ── data ───────────────────────────────────────────────
  // Query args MUST be memoised. An object literal is a new reference on every
  // render, which churns the RTK Query subscription and leaves the hook stuck
  // reporting isLoading even after the request has fulfilled in the store.
  const myArgs = useMemo(
    () => ({ month: myMonth, year: myYear }),
    [myMonth, myYear]
  );
  const mgrArgs = useMemo(
    () => ({ month: mgrMonth, year: mgrYear }),
    [mgrMonth, mgrYear]
  );

  const { data: myRecords, isLoading: myLoading } = useGetMyAttendanceQuery(
    myArgs,
    { skip: !hasStaffRecord }
  );
  const { data: myStats } = useGetMyMonthlyStatsQuery(myArgs, {
    skip: !hasStaffRecord,
  });
  const { data: summary } = useGetTodaySummaryQuery(undefined, {
    skip: !canViewAll,
  });
  const { data: allRecords, isLoading: allLoading } = useGetAllAttendanceQuery(
    mgrArgs,
    { skip: !canViewAll || tab !== "manager" }
  );

  const todayIso = now.toISOString().slice(0, 10);
  const todayRecord = myRecords?.find((r) => r.date?.slice(0, 10) === todayIso);
  const checkedIn = Boolean(todayRecord?.check_in_time);
  const checkedOut = Boolean(todayRecord?.check_out_time);

  // Dismiss the export menu on any outside click.
  useEffect(() => {
    if (!exportOpen) return;
    const close = () => setExportOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [exportOpen]);

  const filteredAll = useMemo(() => {
    if (!allRecords) return [];
    let rows = allRecords;

    // "Today" is a client-side slice of the already-loaded month — no
    // extra request needed, since useGetAllAttendanceQuery pulls the
    // whole month at once.
    if (dayFilter) {
      rows = rows.filter((r) => r.date?.slice(0, 10) === dayFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        (r.staff?.name ?? `Staff #${r.staff_id}`).toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRecords, search, dayFilter]);

  /**
   * Jump the manager view to today.
   *
   * The month grid is queried per month/year, so if the manager is looking
   * at a different month than the current one, today's record wouldn't be
   * in the loaded dataset yet — snap mgrMonth/mgrYear back to now first.
   */
  const showToday = () => {
    setMgrMonth(now.getMonth() + 1);
    setMgrYear(now.getFullYear());
    setDayFilter(todayIso);
  };
  const clearDayFilter = () => setDayFilter(null);

  /**
   * PDF of whatever the manager is currently looking at.
   *
   * Rendered through the browser's own print pipeline rather than a PDF
   * library: "Save as PDF" is a destination in every modern print dialog, so
   * this produces a real, selectable-text PDF with no dependency and no
   * server round-trip. The trade-off is that the user picks the destination.
   */
  const exportPdf = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      setExportError("Your browser blocked the report window. Allow pop-ups for this site.");
      return;
    }
    setExportError(null);

    const esc = (s: unknown) =>
      String(s ?? "").replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
      );

    const totalPresent = filteredAll.length;
    const totalOut = filteredAll.filter((r) => r.check_out_time).length;
    const rows = filteredAll
      .map(
        (r) => `<tr>
          <td>${esc(r.staff?.name ?? `Staff #${r.staff_id}`)}</td>
          <td>${esc(formatDate(r.date))}</td>
          <td class="t in">${esc(formatTime(r.check_in_time) ?? "—")}</td>
          <td class="t out">${esc(formatTime(r.check_out_time) ?? "still in")}</td>
          <td class="t">${esc(formatDuration(r.check_in_time, r.check_out_time) ?? "—")}</td>
        </tr>`
      )
      .join("");

    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>Attendance ${esc(monthLabel(mgrMonth, mgrYear))}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #14161c; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #5a6480; margin: 0 0 18px; }
  .totals { display: flex; gap: 28px; padding: 12px 0 16px; border-top: 1px solid #e0e4ef; border-bottom: 1px solid #e0e4ef; margin-bottom: 18px; }
  .totals div span { display: block; }
  .k { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5a6480; }
  .v { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5a6480; border-bottom: 1px solid #e0e4ef; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #f0f2f5; }
  .t { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .in { color: #128a5a; } .out { color: #c0392b; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }   /* repeat header on each page */
  .foot { margin-top: 20px; font-size: 10px; color: #8892b0; }
</style></head><body>
  <h1>Attendance report</h1>
  <p class="sub">${esc(monthLabel(mgrMonth, mgrYear))}${
      dayFilter ? ` · ${esc(formatDate(dayFilter))} only` : ""
    }${search ? ` · filtered by "${esc(search)}"` : ""} · generated ${esc(
      new Date().toLocaleString()
    )}</p>
  <div class="totals">
    <div><span class="k">Records</span><span class="v">${totalPresent}</span></div>
    <div><span class="k">Checked out</span><span class="v">${totalOut}</span></div>
    <div><span class="k">Still in</span><span class="v">${totalPresent - totalOut}</span></div>
  </div>
  <table>
    <thead><tr><th>Staff</th><th>Date</th><th>Check in</th><th>Check out</th><th>Duration</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">No records.</td></tr>`}</tbody>
  </table>
  <p class="foot">Generated from BizCore · ${esc(filteredAll.length)} record(s)</p>
</body></html>`);
    win.document.close();
    win.focus();
    // Give the document a tick to lay out before the print dialog opens.
    setTimeout(() => win.print(), 250);
  };

  /** CSV of whatever the manager is currently looking at. */
  const exportCsv = () => {
    const rows = [
      ["Staff", "Date", "Check in", "Check out", "Duration"],
      ...filteredAll.map((r) => [
        r.staff?.name ?? `Staff #${r.staff_id}`,
        r.date,
        formatTime(r.check_in_time) ?? "",
        formatTime(r.check_out_time) ?? "",
        formatDuration(r.check_in_time, r.check_out_time) ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${monthLabel(mgrMonth, mgrYear).replace(" ", "-")}${
      dayFilter ? `-${dayFilter}` : ""
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    ...(hasStaffRecord
      ? [{ id: "mine" as Tab, label: "My Attendance", icon: User }]
      : []),
    ...(canViewAll
      ? [{ id: "manager" as Tab, label: "Manager View", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Attendance
        </h1>

        <div className="flex gap-2 items-center">
          {/* Geofence and policy govern every scan, so this is manager-only. */}
          {canViewAll && (
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Attendance settings"
              className="h-10 w-10 rounded-xl flex items-center justify-center border"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Settings className="h-4 w-4" />
            </button>
          )}

          {hasStaffRecord && (
            <>
            <button
              onClick={() => setScanMode("in")}
              disabled={checkedIn}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-success)",
                color: "var(--color-on-success)",
              }}
            >
              <LogIn className="h-4 w-4" />
              {checkedIn ? "Checked in" : "Check in"}
            </button>
            <button
              onClick={() => setScanMode("out")}
              disabled={!checkedIn || checkedOut}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              <LogOut className="h-4 w-4" />
              {checkedOut ? "Checked out" : "Check out"}
            </button>
            </>
          )}
        </div>
      </div>

      {/* TABS — Manager View only renders for managers/admins/superusers */}
      {tabs.length > 0 && (
        <div
          className="flex border-b"
          style={{ borderColor: "var(--color-divider)", }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
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
      )}

      {!hasStaffRecord && !canViewAll && (
        <p className="text-sm py-6" style={{ color: "var(--color-text-muted)" }}>
          Your account has no staff record and no manager permission, so there is
          no attendance to show.
        </p>
      )}

      {/* ── MY ATTENDANCE ── */}
      {tab === "mine" && hasStaffRecord && (
        <div>
          <MonthNav
            month={myMonth}
            year={myYear}
            onChange={(m, y) => {
              setMyMonth(m);
              setMyYear(y);
            }}
          />

          <StatsRow
            present={myStats?.total_present ?? 0}
            checkedOut={myStats?.checked_out ?? 0}
            stillIn={myStats?.still_in ?? 0}
          />

          <div className="mt-1">
            {myLoading ? (
              <p
                className="py-10 text-sm text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                Loading...
              </p>
            ) : !myRecords?.length ? (
              <p
                className="py-10 text-sm text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                No attendance recorded in {monthLabel(myMonth, myYear)}.
              </p>
            ) : (
              myRecords.map((r) => (
                <AttendanceRow
                  key={r.attendance_id}
                  record={r}
                  name={r.staff?.name ?? displayName}
                  avatarUrl={r.staff?.avatar_url ?? avatarUrl}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MANAGER VIEW ── */}
      {tab === "manager" && canViewAll && (
        <div>
          {/* Today across the company, straight from /summary/today */}
          <StatsRow
            present={summary?.total_present ?? 0}
            checkedOut={summary?.checked_out ?? 0}
            stillIn={summary?.still_in ?? 0}
          />

          <MonthNav
            month={mgrMonth}
            year={mgrYear}
            onChange={(m, y) => {
              setMgrMonth(m);
              setMgrYear(y);
              // Changing month manually leaves the "today" filter meaningless
              // for any month other than the current one — clear it so the
              // list doesn't silently render empty.
              setDayFilter(null);
            }}
            trailing={
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={dayFilter ? clearDayFilter : showToday}
                  className="h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap"
                  style={{
                    color: dayFilter
                      ? "var(--color-on-accent)"
                      : "var(--color-blurple)",
                    background: dayFilter ? "var(--color-blurple)" : "transparent",
                  }}
                >
                  {dayFilter ? "Today ✕" : "Today"}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      // Keep this click from reaching the document-level
                      // dismiss handler that the menu installs.
                      e.stopPropagation();
                      setExportOpen((v) => !v);
                    }}
                    aria-label="Download report"
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                    disabled={!filteredAll.length}
                    className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-40"
                    style={{
                      color: exportOpen
                        ? "var(--color-blurple)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  {exportOpen && (
                    <div
                      role="menu"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-44 rounded-xl border overflow-hidden z-30"
                      style={{
                        background: "var(--color-surface-elevated)",
                        borderColor: "var(--color-border)",
                        boxShadow: "0 12px 32px -12px rgba(0,0,0,0.45)",
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportOpen(false);
                          exportPdf();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportOpen(false);
                          exportCsv();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left border-t"
                        style={{
                          color: "var(--color-text-secondary)",
                          borderColor: "var(--color-divider)",
                        }}
                      >
                        <Sheet className="h-4 w-4 shrink-0" />
                        Download CSV
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    setSearch("");
                  }}
                  aria-label="Search staff"
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{
                    color: searchOpen
                      ? "var(--color-blurple)"
                      : "var(--color-text-secondary)",
                  }}
                >
                  {searchOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>
            }
          />

          {exportError && (
            <p className="text-xs mt-2" style={{ color: "var(--color-error)" }}>
              {exportError}
            </p>
          )}

          {dayFilter && (
            <div
              className="flex items-center justify-between mt-3 px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: "color-mix(in srgb, var(--color-blurple) 15%, transparent)",
                color: "var(--color-blurple)",
              }}
            >
              <span>Showing {formatDate(dayFilter)} only</span>
              <button
                type="button"
                onClick={clearDayFilter}
                className="underline font-semibold"
              >
                Show all
              </button>
            </div>
          )}

          {searchOpen && (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by staff name..."
              className="w-full mt-3 rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          )}

          <div className="mt-1">
            {allLoading ? (
              <p
                className="py-10 text-sm text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                Loading...
              </p>
            ) : !filteredAll.length ? (
              <p
                className="py-10 text-sm text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                {search
                  ? `No staff matching "${search}".`
                  : dayFilter
                    ? "No check-ins recorded today yet."
                    : `No attendance recorded in ${monthLabel(mgrMonth, mgrYear)}.`}
              </p>
            ) : (
              filteredAll.map((r) => (
                <AttendanceRow
                  key={r.attendance_id}
                  record={r}
                  name={r.staff?.name ?? `Staff #${r.staff_id}`}
                  avatarUrl={r.staff?.avatar_url}
                  onClick={() => setDetail(r)}
                />
              ))
            )}
          </div>

        </div>
      )}

      {scanMode && (
        <ScanDialog mode={scanMode} onClose={() => setScanMode(null)} />
      )}
      {detail && (
        <AttendanceDetailDialog
          record={detail}
          onClose={() => setDetail(null)}
        />
      )}
      {settingsOpen && (
        <AttendanceSettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}