"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { useToast } from "@/app/(components)/ui/toast";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import {
  useDeleteSalaryMutation,
  useGetAllSalariesQuery,
  useGetMySalariesQuery,
  useGetSalarySummaryQuery,
} from "@/state/tageTypes/services/salariesApi";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { Permissions } from "@/state/permissions";
import { Button, Select } from "@/app/(components)/ui/form-elements";
import { formatMoney } from "@/state/tageTypes/lib/format-money";
import { SalaryStatusBadge } from "@/app/(components)/ui/status-badge";
import { DropdownMenu, DropdownMenuItem } from "@/app/(components)/ui/dropdown-menu";
import { StaffIdentity } from "@/app/(components)/ui/staff-avatar";
import { SalaryFormDialog } from "./salary-form-dialog";
import { MarkPaidDialog } from "./mark-paid-dialog";
import { AdjustmentsDialog } from "./adjustments-dialog";
import { AlertDialog } from "@/app/(components)/ui/alert-dialog";
import type { SalaryResponse, PaymentStatus } from "@/state/types/salaries";
import type { StaffResponse } from "@/state/types/user";

// "" = no month filter, otherwise "YYYY-MM" from <input type="month">
function getMonthRange(monthStr: string): [string, string] {
  const [year, month] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this one
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return [start, end];
}

// e.g. "2026-08" — computed fresh each time this runs, so a page left open
// across a month boundary and then reloaded will pick up the new month.
// (It won't silently flip *while* the tab stays open without a reload —
// see note below if you want that too.)
function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Hits GET /salaries/report?year=&month= (new backend endpoint), streams
// the PDF response as a blob, and triggers a normal browser download.
// Not an RTK Query endpoint since this is a one-off file download, not
// cached/re-rendered data.





async function downloadMonthlyReport(monthStr: string, toast: ReturnType<typeof useToast>) {
  const [year, month] = monthStr.split("-");
  try {
    const res = await fetch(`/api/salaries/report?year=${year}&month=${Number(month)}`, {
      credentials: "include", // adjust to match how your api client sends auth
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail ?? "Failed to generate report");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${year}-${month.padStart(2, "0")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    toast.error(err?.message ?? "Failed to download report");
  }
}

export default function PayrollPage() {
  const toast = useToast();
  const { has, isSuperuser } = usePermissions();

  /**
   * Payroll is two different screens depending on the viewer.
   *
   * MANAGE_SALARY  — full payroll: everyone's salaries, create/edit/delete,
   *                  mark paid, adjustments, the monthly report.
   * VIEW_TEAM_SALARY — read the team's salaries, but no writes.
   * otherwise      — own payslips only, read-only, via GET /salaries/my.
   *
   * These mirror the server guards; the API is still the real gate.
   */
  const canManage = isSuperuser || has(Permissions.MANAGE_SALARY);
  const canViewTeam = canManage || has(Permissions.VIEW_TEAM_SALARY);
  const ownOnly = !canViewTeam;

  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // ✅ defaults to the current month instead of "all" — click Clear to see everything
  const [monthFilter, setMonthFilter] = useState<string>(() => getCurrentMonthStr());

  // Every team-wide read is skipped for own-only viewers so they never fire a
  // request that would just 403.
  const { data: staffList } = useGetAllStaffQuery(undefined, { skip: ownOnly });
  const { data: summary } = useGetSalarySummaryQuery(undefined, { skip: !canViewTeam });

  const teamArgs = useMemo(
    () => ({
      staffId: staffFilter !== "all" ? Number(staffFilter) : undefined,
      payStatus: statusFilter !== "all" ? statusFilter : undefined,
    }),
    [staffFilter, statusFilter]
  );

  const { data: teamSalaries, isFetching: teamFetching } = useGetAllSalariesQuery(
    teamArgs,
    { skip: ownOnly }
  );
  const { data: mySalaries, isFetching: myFetching } = useGetMySalariesQuery(
    undefined,
    { skip: !ownOnly }
  );

  const salaries = ownOnly ? mySalaries : teamSalaries;
  const isFetching = ownOnly ? myFetching : teamFetching;

  const [deleteSalary] = useDeleteSalaryMutation();
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (!monthFilter) {
      toast.error("Pick a month first");
      return;
    }
    setDownloadingReport(true);
    await downloadMonthlyReport(monthFilter, toast);
    setDownloadingReport(false);
  };

  // ✅ month filter is client-side — the API has no month param, so this
  // keeps a pay period if it overlaps the selected month at all (handles
  // periods that don't align exactly to calendar-month boundaries).
  const visibleSalaries = useMemo(() => {
    if (!monthFilter || !salaries) return salaries;
    const [monthStart, monthEnd] = getMonthRange(monthFilter);
    return salaries.filter(
      (s) => s.pay_period_start <= monthEnd && s.pay_period_end >= monthStart,
    );
  }, [salaries, monthFilter]);

  // ✅ was Map<number, string> (name only) — now keeps the whole staff
  // record so the table cell can render avatar_url + role alongside name
  const staffById = useMemo(() => {
    const map = new Map<number, StaffResponse>();
    staffList?.forEach((s) => map.set(s.staff_id, s));
    return map;
  }, [staffList]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryResponse | undefined>();
  const [markPaidTarget, setMarkPaidTarget] = useState<SalaryResponse | null>(null);
  const [adjustmentsTarget, setAdjustmentsTarget] = useState<SalaryResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryResponse | null>(null);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (s: SalaryResponse) => {
    setEditing(s);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSalary({
        salaryId: deleteTarget.salary_id,
        staffId: deleteTarget.staff_id,
      }).unwrap();
      toast.success("Salary record deleted");
    } catch (err: any) {
      toast.error(err?.data?.detail ?? "Could not delete record");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Payroll
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {ownOnly
              ? "Your payslips."
              : canManage
              ? "Manage salaries, bonuses, deductions, and payments."
              : "Team salaries — read only."}
          </p>
        </div>
        {/* Creating a salary record needs MANAGE_SALARY. */}
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New salary record
          </Button>
        )}
      </div>

      {/* The summary endpoint is team-wide, so it is hidden for own-only. */}
      {canViewTeam && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total records" value={summary?.total_salaries ?? "—"} />
          <SummaryCard label="Paid" value={summary?.total_paid ?? "—"} />
          <SummaryCard label="Pending" value={summary?.total_pending ?? "—"} />
          <SummaryCard
            label="Total net amount"
            value={summary ? formatMoney(summary.total_net_amount) : "—"}
          />
        </div>
      )}

      <div className="flex gap-3">
        {/* Filtering by staff only makes sense when more than one is visible. */}
        {!ownOnly && (
          <div className="w-48">
            <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="all">All staff</option>
              {staffList?.map((s: StaffResponse) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-44">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="w-44 flex items-center gap-2">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-9 w-full rounded-md px-3 text-sm"
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          {monthFilter && (
            <button
              type="button"
              onClick={() => setMonthFilter("")}
              className="text-xs shrink-0"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Clear
            </button>
          )}
        </div>
        {/* Company-wide payroll report — team data, so managers only. */}
        {canViewTeam && (
          <Button
            variant="outline"
            onClick={handleDownloadReport}
            disabled={!monthFilter || downloadingReport}
          >
            {downloadingReport ? "Preparing…" : "Download report (PDF)"}
          </Button>
        )}
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <table className="w-full text-sm">
          <thead
            style={{
              background: "var(--color-surface)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <tr>
              {[
                "Staff",
                "Period",
                "Base",
                "Bonus",
                "Deductions",
                "Net",
                "Status",
                // The trailing actions column only exists for managers.
                ...(canManage ? [""] : []),
              ].map((h, i) => (
                <th
                  key={h || `actions-${i}`}
                  className="text-left font-medium px-4 py-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isFetching && (
              <tr>
                <td
                  colSpan={canManage ? 8 : 7}
                  className="text-center py-8"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Loading…
                </td>
              </tr>
            )}
            {!isFetching && visibleSalaries?.length === 0 && (
              <tr>
                <td
                  colSpan={canManage ? 8 : 7}
                  className="text-center py-8"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {monthFilter
                    ? "No salary records found for this month."
                    : "No salary records found."}
                </td>
              </tr>
            )}
            {visibleSalaries?.map((s: SalaryResponse) => {
              const staff = staffById.get(s.staff_id);
              return (
                <tr
                  key={s.salary_id}
                  style={{ borderBottom: "1px solid var(--color-divider)" }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {/* ✅ avatar + name instead of plain text */}
                    {staff ? (
                      <StaffIdentity
                        name={staff.name}
                        avatarUrl={staff.avatar_url}
                        subtitle={staff.staff_role?.role_name}
                      />
                    ) : (
                      `#${s.staff_id}`
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                    {s.pay_period_start} – {s.pay_period_end}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                    {formatMoney(s.base_salary)}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: "var(--color-success)" }}
                  >
                    +{formatMoney(s.bonus)}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-error)" }}>
                    -{formatMoney(s.deductions)}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {formatMoney(s.net_salary)}
                  </td>
                  <td className="px-4 py-3">
                    <SalaryStatusBadge status={s.payment_status as PaymentStatus} />
                  </td>
                  {/* Every row action mutates payroll, so the whole menu is
                      MANAGE_SALARY-only. Read-only viewers get no column. */}
                  {canManage && (
                    <td className="px-4 py-3">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem onClick={() => setAdjustmentsTarget(s)}>
                          Adjustments
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                        {s.payment_status !== "paid" && (
                          <DropdownMenuItem onClick={() => setMarkPaidTarget(s)}>
                            Mark as paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          destructive
                          disabled={s.payment_status === "paid"}
                          onClick={() => setDeleteTarget(s)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SalaryFormDialog open={formOpen} onOpenChange={setFormOpen} salary={editing} />
      <MarkPaidDialog
        open={!!markPaidTarget}
        onOpenChange={(o) => !o && setMarkPaidTarget(null)}
        salary={markPaidTarget}
      />
      <AdjustmentsDialog
        open={!!adjustmentsTarget}
        onOpenChange={(o) => !o && setAdjustmentsTarget(null)}
        salary={adjustmentsTarget}
      />
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete salary record?"
        description={`This permanently removes the record for ${
          deleteTarget ? staffById.get(deleteTarget.staff_id)?.name ?? "this staff member" : ""
        }'s ${deleteTarget?.pay_period_start} – ${deleteTarget?.pay_period_end} period. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-semibold mt-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}