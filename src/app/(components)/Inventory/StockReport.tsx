"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Repeat,
  TrendingUp,
} from "lucide-react";
import { Card, EmptyState, apiMessage, money } from "@/app/(components)/crud";
import { exportExcel, slug } from "@/app/(components)/crud/exporters";
import {
  exportStockReportPdf,
  stockReportExcelRows,
  type StockReportExcelRow,
} from "@/app/(components)/Inventory/stockReportPdf";
import { useGetStockReportQuery } from "@/state/tageTypes/services/inventoryApi";
import type {
  CategoryResponse,
  StockReportBucket,
} from "@/state/types/inventory";
import { Modal } from "@/app/(components)/ui/modal";
import { Button, Label, Select as FormSelect } from "@/app/(components)/ui/form-elements";

type Period = "day" | "week" | "month" | "year" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// e.g. "2026-08" — same pattern as the payroll page's month filter.
function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// "2026-08" -> ["2026-08-01", "2026-08-31"]
function getMonthRange(monthStr: string): [string, string] {
  const [year, month] = monthStr.split("-").map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return [start, end];
}

// "2026-08" -> "August 2026"
function monthFilterLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Label for the bucket a report row falls in, e.g. "2026-08" → "August 2026". */
function periodLabel(period: Period, buckets: StockReportBucket[]): string {
  if (period === "all") return "All time";
  const raw = buckets.find((b) => b.period_label)?.period_label;
  if (!raw) return "—";
  // The API emits "YYYY-MM-DD" / "YYYY-Www" / "YYYY-MM" / "YYYY" per period.
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(raw);
  if (monthMatch) {
    const d = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dayMatch) {
    return new Date(raw).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return raw;
}

/** Bar chart over the report buckets — no chart library, plain divs. */
function Trend({ buckets }: { buckets: StockReportBucket[] }) {
  const series = buckets.slice(0, 12);
  const peak = Math.max(1, ...series.map((b) => Math.abs(num(b.net_value))));

  return (
    <div className="flex items-end gap-2 h-32 px-1">
      {series.map((b, i) => {
        const value = num(b.net_value);
        const height = Math.max(3, (Math.abs(value) / peak) * 100);
        return (
          <div
            key={`${b.variant_id ?? b.product_id ?? "b"}-${i}`}
            className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            title={`${b.variant_sku ?? b.product_name ?? b.period_label ?? ""}: ${money(value)}`}
          >
            <div className="w-full flex-1 flex items-end justify-center">
              <div
                className="w-2.5 rounded-full"
                style={{
                  height: `${height}%`,
                  background:
                    value < 0 ? "var(--color-error)" : "var(--color-success)",
                }}
              />
            </div>
            <span
              className="text-[10px] truncate w-full text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              {b.period_label ?? ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatTile({
  icon: Icon,
  tint,
  value,
  label,
}: {
  icon: React.ElementType;
  tint: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <Card className="p-4">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `var(${tint}-tint)` }}
      >
        <Icon className="h-4 w-4" style={{ color: `var(${tint})` }} />
      </div>
      <p
        className="text-2xl font-bold leading-none"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
    </Card>
  );
}

export default function StockReport({
  categories,
}: {
  categories?: CategoryResponse[];
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [exportError, setExportError] = useState<string | null>(null);

  // Which "YYYY-MM" the Month period reports on — defaults to the current
  // month but can be changed via the picker below.
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthStr());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());

  const openMonthPicker = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    setPickerYear(y);
    setPickerMonth(m);
    setMonthPickerOpen(true);
  };
  const applyMonthPicker = () => {
    setSelectedMonth(`${pickerYear}-${String(pickerMonth).padStart(2, "0")}`);
    setMonthPickerOpen(false);
  };
  const pickerYears = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => current - 6 + i);
  }, []);

  // Memoised so the query arg is referentially stable between renders.
  const args = useMemo(() => {
    if (period !== "month") return { period, categoryId, includeBalance: true };
    const [startDate, endDate] = getMonthRange(selectedMonth);
    return { period, categoryId, includeBalance: true, startDate, endDate };
  }, [period, categoryId, selectedMonth]);
  const { data: report, isLoading, error } = useGetStockReportQuery(args);

  const buckets = report?.buckets ?? [];

  const closing = useMemo(() => {
    // `include_balance=true` fills opening/closing per bucket; the response has
    // no grand total for units, so they are summed here.
    let open = 0;
    let close = 0;
    let counted = 0;
    for (const b of buckets) {
      if (b.closing_balance == null && b.opening_balance == null) continue;
      open += num(b.opening_balance);
      close += num(b.closing_balance);
      counted += 1;
    }
    return { open, close, counted, delta: close - open };
  }, [buckets]);

  const totalMoves = useMemo(
    () => buckets.reduce((n, b) => n + num(b.movement_count), 0),
    [buckets]
  );

  // "month" is user-selectable, so it uses the picker value directly
  // instead of reading it back off a bucket (which is empty when the
  // selected month has no movement).
  const label = period === "month" ? monthFilterLabel(selectedMonth) : periodLabel(period, buckets);
  const categoryName = categoryId
    ? categories?.find((c) => c.category_id === categoryId)?.category_name
    : undefined;

  /**
   * Column-group totals — Beginning / In / Out / Balance, each as qty and
   * value. Shown on screen and repeated in both exports so the three agree.
   */
  const groupTotals = useMemo(() => {
    const rows = stockReportExcelRows(buckets);
    const sum = (pick: (r: StockReportExcelRow) => number) =>
      rows.reduce((n, r) => n + pick(r), 0);
    return {
      begin: { qty: sum((r) => r.beginQty), total: sum((r) => r.beginTotal) },
      in: { qty: sum((r) => r.inQty), total: sum((r) => r.inTotal) },
      out: { qty: sum((r) => r.outQty), total: sum((r) => r.outTotal) },
      balance: { qty: sum((r) => r.balQty), total: sum((r) => r.balTotal) },
      netValue: sum((r) => r.netValue),
    };
  }, [buckets]);

  // ── export ───────────────────────────────────────────────
  // Mirrors the PDF's grouped layout, flattened since a sheet has one header row.
  const columns = [
    { header: "Period", value: (r: StockReportExcelRow) => r.period },
    { header: "Product", value: (r: StockReportExcelRow) => r.product },
    { header: "Description", value: (r: StockReportExcelRow) => r.description },
    { header: "SKU", value: (r: StockReportExcelRow) => r.sku },
    { header: "Category", value: (r: StockReportExcelRow) => r.category },
    { header: "Beginning Qty", value: (r: StockReportExcelRow) => r.beginQty, numeric: true },
    { header: "Beginning Price", value: (r: StockReportExcelRow) => r.price, numeric: true },
    { header: "Beginning Total", value: (r: StockReportExcelRow) => r.beginTotal, numeric: true },
    { header: "In Qty", value: (r: StockReportExcelRow) => r.inQty, numeric: true },
    { header: "In Price", value: (r: StockReportExcelRow) => r.price, numeric: true },
    { header: "In Total", value: (r: StockReportExcelRow) => r.inTotal, numeric: true },
    { header: "Out Qty", value: (r: StockReportExcelRow) => r.outQty, numeric: true },
    { header: "Out Price", value: (r: StockReportExcelRow) => r.price, numeric: true },
    { header: "Out Total", value: (r: StockReportExcelRow) => r.outTotal, numeric: true },
    { header: "Balance Qty", value: (r: StockReportExcelRow) => r.balQty, numeric: true },
    { header: "Balance Price", value: (r: StockReportExcelRow) => r.price, numeric: true },
    { header: "Balance Total", value: (r: StockReportExcelRow) => r.balTotal, numeric: true },
    { header: "Net Value", value: (r: StockReportExcelRow) => r.netValue, numeric: true },
  ];

  const meta: [string, string][] = [
    ["Period", `${PERIODS.find((p) => p.value === period)?.label} · ${label}`],
    ["Category", categoryName ?? "All categories"],
    ["Generated", new Date().toLocaleString()],
  ];

  // Listed one by one, as each group's qty and value.
  const totals: [string, string | number][] = [
    ["Beginning qty", groupTotals.begin.qty],
    ["Beginning total", money(groupTotals.begin.total)],
    ["In qty", groupTotals.in.qty],
    ["In total", money(groupTotals.in.total)],
    ["Out qty", groupTotals.out.qty],
    ["Out total", money(groupTotals.out.total)],
    ["Balance qty", groupTotals.balance.qty],
    ["Balance total", money(groupTotals.balance.total)],
    ["Net value", money(groupTotals.netValue)],
    ["Closing stock value", money(report?.total_closing_stock_value)],
  ];

  const filename = slug(`stock-movement-report-${period}-${categoryName ?? "all"}`);

  const onPdf = () => {
    setExportError(null);
    if (!report) return;
    const res = exportStockReportPdf({ report, categoryName });
    if (!res.ok) setExportError(res.error ?? "Could not open the report window.");
  };

  const onExcel = () => {
    setExportError(null);
    exportExcel({
      filename: `${filename}.xls`,
      sheetName: "Stock Movement",
      title: `Stock Movement Report - ${label}`,
      meta,
      columns,
      rows: stockReportExcelRows(buckets),
      totals,
    });
  };

  if (error) {
    return <EmptyState message={apiMessage(error, "Could not load the stock report.")} />;
  }

  const netValue = num(report?.total_net_value);

  return (
    <div className="flex flex-col gap-4">
      {/* period + category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <button
                type="button"
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className="rounded-full px-4 py-1.5 text-sm font-medium border transition-colors"
                style={{
                  background: active ? "var(--color-info-tint)" : "transparent",
                  borderColor: active
                    ? "var(--color-blurple)"
                    : "var(--color-border)",
                  color: active
                    ? "var(--color-blurple)"
                    : "var(--color-text-secondary)",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onPdf}
            disabled={!buckets.length}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={onExcel}
            disabled={!buckets.length}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      {/* period label — clickable to pick a specific month when period === "month" */}
      <Card className="px-4 py-3 flex items-center gap-2.5">
        {period === "month" ? (
          <button
            type="button"
            onClick={openMonthPicker}
            className="flex items-center gap-2.5"
          >
            <CalendarDays className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {label}
            </span>
            <span
              className="text-xs font-medium underline"
              style={{ color: "var(--color-blurple)" }}
            >
              Change
            </span>
          </button>
        ) : (
          <>
            <CalendarDays className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {label}
            </span>
          </>
        )}
      </Card>

      {/* category chips */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryId(undefined)}
            className="rounded-full px-4 py-1.5 text-sm font-medium border"
            style={{
              background: categoryId ? "transparent" : "var(--color-info-tint)",
              borderColor: categoryId
                ? "var(--color-border)"
                : "var(--color-blurple)",
              color: categoryId
                ? "var(--color-text-secondary)"
                : "var(--color-blurple)",
            }}
          >
            All Categories
          </button>
          {categories.map((c) => {
            const active = categoryId === c.category_id;
            return (
              <button
                type="button"
                key={c.category_id}
                onClick={() => setCategoryId(c.category_id)}
                className="rounded-full px-4 py-1.5 text-sm font-medium border"
                style={{
                  background: active ? "var(--color-info-tint)" : "transparent",
                  borderColor: active
                    ? "var(--color-blurple)"
                    : "var(--color-border)",
                  color: active
                    ? "var(--color-blurple)"
                    : "var(--color-text-secondary)",
                }}
              >
                {c.category_name}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <EmptyState message="Loading stock report..." />
      ) : (
        <>
          {/* net value hero */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--gradient-brand)" }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-on-accent)", opacity: 0.8 }}
            >
              Net value
            </p>
            <p
              className="text-4xl font-bold mt-1.5"
              style={{ color: "var(--color-on-accent)" }}
            >
              {money(netValue)}
            </p>
            <div
              className="flex items-center gap-4 mt-3 text-sm font-medium"
              style={{ color: "var(--color-on-accent)", opacity: 0.9 }}
            >
              <span className="inline-flex items-center gap-1">
                <ArrowDownLeft className="h-4 w-4" />
                {num(report?.total_qty_in)} in
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                {num(report?.total_qty_out)} out
              </span>
            </div>
          </div>

          {/* stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={TrendingUp}
              tint="--color-success"
              value={num(report?.total_qty_in)}
              label="Qty In"
            />
            <StatTile
              icon={ArrowUpRight}
              tint="--color-error"
              value={num(report?.total_qty_out)}
              label="Qty Out"
            />
            <StatTile
              icon={Repeat}
              tint="--color-info"
              value={totalMoves}
              label="Moves"
            />
          </div>

          {/* closing stock */}
          <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Total Closing Stock
                </p>
                <p
                  className="text-3xl font-bold mt-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {closing.close}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  across {closing.counted} variant{closing.counted === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Opening
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {closing.open}
                </p>
                <p
                  className="text-sm font-semibold inline-flex items-center gap-1 mt-1"
                  style={{
                    color:
                      closing.delta < 0
                        ? "var(--color-error)"
                        : "var(--color-success)",
                  }}
                >
                  {closing.delta < 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                  {closing.delta > 0 ? `+${closing.delta}` : closing.delta}
                </p>
              </div>
            </div>

            <div
              className="mt-4 pt-3 border-t flex items-center justify-between"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Closing Stock Value
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {money(report?.total_closing_stock_value)}
              </span>
            </div>
          </Card>

          {/* group totals — the same four groups the PDF prints */}
          <Card className="overflow-hidden">
            <div
              className="px-4 py-2.5 border-b"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                Totals by group
              </p>
            </div>
            {(
              [
                ["Beginning", groupTotals.begin],
                ["In", groupTotals.in],
                ["Out", groupTotals.out],
                ["Balance or End", groupTotals.balance],
              ] as [string, { qty: number; total: number }][]
            ).map(([name, g]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 px-4 py-2.5 border-b last:border-b-0"
                style={{ borderColor: "var(--color-divider)" }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {name}
                </span>
                <span className="flex items-center gap-4 shrink-0">
                  <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {g.qty} qty
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {money(g.total)}
                  </span>
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between gap-3 px-4 py-2.5"
              style={{ background: "var(--color-surface-elevated)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Net value
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color:
                    groupTotals.netValue < 0
                      ? "var(--color-error)"
                      : "var(--color-success)",
                }}
              >
                {money(groupTotals.netValue)}
              </span>
            </div>
          </Card>

          {/* trend */}
          {buckets.length > 0 && (
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-2 inline-flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trend
              </p>
              <Card className="p-4">
                <Trend buckets={buckets} />
              </Card>
            </div>
          )}

          {/* per-variant breakdown */}
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            By variant · {PERIODS.find((p) => p.value === period)?.label} (
            {buckets.length})
          </p>

          {!buckets.length ? (
            <EmptyState message="No stock movement in this period." />
          ) : (
            <div className="flex flex-col gap-3">
              {buckets.map((b, i) => {
                const net = num(b.net_change);
                return (
                  <Card
                    key={`${b.variant_id ?? b.product_id ?? "b"}-${i}`}
                    className="p-4"
                    style={{
                      borderLeft: `3px solid ${
                        net < 0 ? "var(--color-error)" : "var(--color-success)"
                      }`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {b.product_name ?? "—"}
                          {b.variant_sku ? ` (${b.variant_sku})` : ""}
                        </p>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {[b.period_label, b.category_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2 py-1 rounded-md shrink-0"
                        style={{
                          color: "var(--color-blurple)",
                          background: "var(--color-info-tint)",
                        }}
                      >
                        {num(b.movement_count)} move
                        {num(b.movement_count) === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          In
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-success)" }}
                        >
                          {num(b.qty_in)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Out
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-error)" }}
                        >
                          {num(b.qty_out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Net
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {net}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Value in
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-success)" }}
                        >
                          {money(b.value_in)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Value out
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-error)" }}
                        >
                          {money(b.value_out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          Net value
                        </p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {money(b.net_value)}
                        </p>
                      </div>
                    </div>

                    {(b.opening_balance != null || b.closing_balance != null) && (
                      <div
                        className="mt-3 pt-3 border-t flex items-center gap-2"
                        style={{ borderColor: "var(--color-divider)" }}
                      >
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "var(--color-divider)" }}
                        >
                          <Repeat
                            className="h-3.5 w-3.5"
                            style={{ color: "var(--color-text-secondary)" }}
                          />
                        </div>
                        <span
                          className="text-sm inline-flex items-center gap-2"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Opening {num(b.opening_balance)}
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            style={{ color: "var(--color-text-muted)" }}
                          />
                          Closing {num(b.closing_balance)}
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {exportError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {exportError}
        </p>
      )}

      <Modal
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title="Select month"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMonthPickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyMonthPicker}>Apply</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Month</Label>
            <FormSelect
              value={pickerMonth}
              onChange={(e) => setPickerMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <Label>Year</Label>
            <FormSelect
              value={pickerYear}
              onChange={(e) => setPickerYear(Number(e.target.value))}
            >
              {pickerYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
      </Modal>
    </div>
  );
}
