"use client";

import React, { useMemo, useState } from "react";
import {
  Ban,
  Check,
  CircleSlash,
  Clock,
  Loader2,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  SelectField,
  TextAreaField,
  TextField,
  apiMessage,
  initialsOf,
} from "@/app/(components)/crud";
import { usePermissions } from "@/state/tageTypes/lib/hook";
import { useMe } from "@/state/tageTypes/lib/useMe";
import { Permissions } from "@/state/permissions";
import {
  useApproveLeaveRequestMutation,
  useCancelLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetLeaveRequestsQuery,
  useGetLeaveSummaryQuery,
  useGetMyLeaveRequestsQuery,
  useRejectLeaveRequestMutation,
} from "@/state/tageTypes/services/leaveApi";
import {
  leaveDays,
  type LeaveRequestResponse,
  type LeaveStatus,
  type LeaveType,
} from "@/state/types/leave";
import { useConfirm } from "@/app/(components)/crud/confirm";
import LeaveCountdown from "@/app/(components)/Leave/LeaveCountdown";
import LeaveDetailDialog from "@/app/(components)/Leave/LeaveDetailDialog";

type Tab = "mine" | "manager";

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "unpaid", label: "Unpaid" },
  { value: "other", label: "Other" },
];

const STATUS_STYLE: Record<LeaveStatus, { fg: string; bg: string }> = {
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

function StatusPill({ status }: { status: LeaveStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
      style={{ color: s.fg, background: s.bg }}
    >
      {status}
    </span>
  );
}

function LeaveRow({
  leave,
  showStaff,
  actions,
  onClick,
}: {
  leave: LeaveRequestResponse;
  showStaff?: boolean;
  actions?: React.ReactNode;
  onClick?: () => void;
}) {
  const days = leaveDays(leave.start_date, leave.end_date);
  const Wrapper = (onClick ? "button" : "div") as React.ElementType;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 border-b last:border-b-0 text-left transition-colors"
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
      {showStaff && (
        <div
          className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: leave.staff?.avatar_url
              ? "var(--color-surface-elevated)"
              : "var(--gradient-brand)",
          }}
        >
          {leave.staff?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leave.staff.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold" style={{ color: "var(--color-on-accent)" }}>
              {initialsOf(leave.staff?.name ?? `S${leave.staff_id}`)}
            </span>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {showStaff ? leave.staff?.name ?? `Staff #${leave.staff_id}` : null}
            {showStaff ? " · " : ""}
            <span className="capitalize">{leave.leave_type}</span>
          </span>
          <StatusPill status={leave.status} />
        </div>

        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {fmtDate(leave.start_date)} → {fmtDate(leave.end_date)} · {days} day
          {days === 1 ? "" : "s"}
          {leave.approved_by_name ? ` · by ${leave.approved_by_name}` : ""}
        </p>

        {leave.reason && (
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {leave.reason}
          </p>
        )}

        <LeaveCountdown
          startDate={leave.start_date}
          endDate={leave.end_date}
          status={leave.status}
        />
      </div>

      {actions && (
        <div
          className="flex gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </Wrapper>
  );
}

export default function LeavePage() {
  const confirm = useConfirm();
  const { has, isSuperuser } = usePermissions();
  const { staff, hasStaffRecord } = useMe();

  const canManage =
    isSuperuser ||
    has(Permissions.APPROVE_LEAVE) ||
    has(Permissions.VIEW_TEAM_LEAVE) ||
    staff?.staff_role?.is_manager === true;

  const [tab, setTab] = useState<Tab>(hasStaffRecord ? "mine" : "manager");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LeaveRequestResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [pageError, setPageError] = useState<string | null>(null);

  const [form, setForm] = useState({
    leave_type: "annual" as LeaveType,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Memoised: an inline object churns the RTK Query subscription.
  const listArgs = useMemo(
    () => (statusFilter ? { status: statusFilter as LeaveStatus } : {}),
    [statusFilter]
  );

  const { data: myLeaves, isLoading: myLoading } = useGetMyLeaveRequestsQuery(
    undefined,
    { skip: !hasStaffRecord }
  );
  const { data: allLeaves, isLoading: allLoading } = useGetLeaveRequestsQuery(
    listArgs,
    { skip: !canManage || tab !== "manager" }
  );
  const { data: summary } = useGetLeaveSummaryQuery(undefined, { skip: !canManage });

  const [createLeave, { isLoading: creating }] = useCreateLeaveRequestMutation();
  const [cancelLeave, { isLoading: cancelling }] = useCancelLeaveRequestMutation();
  const [approveLeave, { isLoading: approving }] = useApproveLeaveRequestMutation();
  const [rejectLeave, { isLoading: rejecting }] = useRejectLeaveRequestMutation();
  const [deleteLeave, { isLoading: deleting }] = useDeleteLeaveRequestMutation();

  const draftDays = leaveDays(form.start_date, form.end_date);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (new Date(form.start_date) > new Date(form.end_date)) {
      setError("The start date must be on or before the end date.");
      return;
    }
    try {
      await createLeave({
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null,
      }).unwrap();
      setOpen(false);
      setForm((f) => ({ ...f, reason: "" }));
    } catch (err) {
      // 409 when the dates overlap an existing pending/approved request.
      setError(apiMessage(err, "Could not submit this leave request."));
    }
  };

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setPageError(null);
    try {
      await fn();
    } catch (err) {
      setPageError(apiMessage(err, fallback));
    }
  };

  const iconBtn = (
    label: string,
    Icon: React.ElementType,
    color: string,
    onClick: () => void,
    busy?: boolean,
    disabled?: boolean
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-label={label}
      title={label}
      className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
    </button>
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    ...(hasStaffRecord ? [{ id: "mine" as Tab, label: "My leave", icon: User }] : []),
    ...(canManage
      ? [{ id: "manager" as Tab, label: "Approvals", icon: ShieldCheck }]
      : []),
  ];

  const stats = [
    { label: "Total", value: summary?.total ?? "—", tint: "var(--color-text-primary)" },
    { label: "Pending", value: summary?.pending ?? "—", tint: "var(--color-warning)" },
    { label: "Approved", value: summary?.approved ?? "—", tint: "var(--color-success)" },
    { label: "Rejected", value: summary?.rejected ?? "—", tint: "var(--color-error)" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Leave"
        subtitle="Time off requests"
        actionLabel={hasStaffRecord ? "Request leave" : undefined}
        onAction={hasStaffRecord ? () => setOpen(true) : undefined}
      />

      {tabs.length > 0 && (
        <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-divider)" }}>
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
                  color: active ? "var(--color-blurple)" : "var(--color-text-secondary)",
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

      {!hasStaffRecord && !canManage && (
        <EmptyState message="Your account has no staff record and no approval permission, so there is no leave to show." />
      )}

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {/* ── MY LEAVE ── */}
      {tab === "mine" && hasStaffRecord && (
        <Card className="overflow-hidden">
          {myLoading ? (
            <EmptyState message="Loading your leave..." />
          ) : !myLeaves?.length ? (
            <EmptyState message="You have not requested any leave yet." />
          ) : (
            myLeaves.map((l) => (
              <LeaveRow
                key={l.leave_id}
                leave={l}
                onClick={() => setDetail(l)}
                actions={
                  // Cancelling is allowed only while pending or approved.
                  ["pending", "approved"].includes(l.status)
                    ? iconBtn(
                        "Cancel request",
                        CircleSlash,
                        "var(--color-error)",
                        () =>
                          run(
                            () => cancelLeave(l.leave_id).unwrap(),
                            "Could not cancel this request."
                          ),
                        cancelling
                      )
                    : null
                }
              />
            ))
          )}
        </Card>
      )}

      {/* ── APPROVALS ── */}
      {tab === "manager" && canManage && (
        <>
          <Card className="grid grid-cols-2 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="flex flex-col items-center py-4"
                style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-divider)" }}
              >
                <span className="text-lg font-bold" style={{ color: s.tint }}>
                  {s.value}
                </span>
                <span className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </Card>

          <div className="flex gap-2 flex-wrap">
            {["", "pending", "approved", "rejected", "cancelled"].map((s) => (
              <button
                type="button"
                key={s || "all"}
                onClick={() => setStatusFilter(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border capitalize"
                style={{
                  borderColor:
                    statusFilter === s ? "var(--color-blurple)" : "var(--color-border)",
                  color:
                    statusFilter === s
                      ? "var(--color-blurple)"
                      : "var(--color-text-secondary)",
                }}
              >
                {s || "all"}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            {allLoading ? (
              <EmptyState message="Loading requests..." />
            ) : !allLeaves?.length ? (
              <EmptyState
                message={
                  statusFilter
                    ? `No ${statusFilter} leave requests.`
                    : "No leave requests yet."
                }
              />
            ) : (
              allLeaves.map((l) => (
                <LeaveRow
                  key={l.leave_id}
                  leave={l}
                  showStaff
                  onClick={() => setDetail(l)}
                  actions={
                    <>
                      {l.status === "pending" && (
                        <>
                          {iconBtn(
                            "Approve",
                            Check,
                            "var(--color-success)",
                            () =>
                              run(
                                () => approveLeave(l.leave_id).unwrap(),
                                "Could not approve this request."
                              ),
                            approving
                          )}
                          {iconBtn(
                            "Reject",
                            Ban,
                            "var(--color-warning)",
                            () =>
                              run(
                                () => rejectLeave({ leaveId: l.leave_id }).unwrap(),
                                "Could not reject this request."
                              ),
                            rejecting
                          )}
                        </>
                      )}
                      {iconBtn(
                        "Delete",
                        Trash2,
                        "var(--color-error)",
                        async () => {
                          const ok = await confirm({
                            title: `Delete leave request #${l.leave_id}`,
                            message: "This request will be removed.",
                            confirmLabel: "Delete request",
                          });
                          if (!ok) return;
                          run(
                            () => deleteLeave(l.leave_id).unwrap(),
                            "Could not delete this request."
                          );
                        },
                        deleting
                      )}
                    </>
                  }
                />
              ))
            )}
          </Card>
        </>
      )}

      {detail && (
        <LeaveDetailDialog leave={detail} onClose={() => setDetail(null)} />
      )}

      {open && (
        <Dialog
          title="Request leave"
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel="Submit request"
          saving={creating}
          error={error}
        >
          <SelectField
            label="Leave type"
            value={form.leave_type}
            placeholder=""
            onChange={(v) => setForm((f) => ({ ...f, leave_type: v as LeaveType }))}
            options={LEAVE_TYPES}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Start date"
              type="date"
              value={form.start_date}
              onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
            />
            <TextField
              label="End date"
              type="date"
              value={form.end_date}
              onChange={(v) => setForm((f) => ({ ...f, end_date: v }))}
            />
          </div>

          <div
            className="rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{ background: "var(--color-info-tint)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wide inline-flex items-center gap-1.5"
              style={{ color: "var(--color-info)" }}
            >
              <Clock className="h-3 w-3" />
              Duration
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--color-info)" }}>
              {draftDays} day{draftDays === 1 ? "" : "s"}
            </span>
          </div>

          <TextAreaField
            label="Reason"
            value={form.reason}
            onChange={(v) => setForm((f) => ({ ...f, reason: v }))}
          />

          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Overlapping a pending or approved request is rejected by the server.
          </p>
        </Dialog>
      )}
    </div>
  );
}
