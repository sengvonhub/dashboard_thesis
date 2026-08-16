"use client";

/**
 * Stock Movement Report — its own PDF builder rather than the shared
 * `exportPdf`, because this layout needs a two-row header: four column groups
 * (Beginning / In / Out / Balance or End) that each span Qty, Price and Total.
 * `ExportColumn` is a flat list and cannot express a colspan.
 *
 * Printed through the browser's print pipeline, same as the shared exporter —
 * "Save as PDF" is a destination in every modern print dialog.
 */

import type { StockReportBucket, StockReportResponse } from "@/state/types/inventory";

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const usd = (v: unknown) =>
  `$${num(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-08" → "Aug 1, 2026"; "2026-08-12" → "Aug 12, 2026". */
function bucketDate(label?: string | null): string {
  if (!label) return "";
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
  m = /^(\d{4})-(\d{2})$/.exec(label);
  if (m) return `${MONTHS[Number(m[2]) - 1]} 1, ${m[1]}`;
  m = /^(\d{4})$/.exec(label);
  if (m) return `Jan 1, ${m[1]}`;
  return label;
}

/** "2026-08" → "August 2026", for the report title. */
function titlePeriod(label?: string | null, period?: string): string {
  if (period === "all" || !label) return "All time";
  const m = /^(\d{4})-(\d{2})$/.exec(label);
  if (m) {
    const full = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return full.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return bucketDate(label);
}

/** The nine numeric cells a row contributes, so rows and totals stay in step. */
function rowFigures(b: StockReportBucket) {
  const price = num(b.price);
  const beginQty = num(b.opening_balance);
  const inQty = num(b.qty_in);
  const outQty = num(b.qty_out);
  const balQty = num(b.closing_balance);
  return {
    price,
    beginQty,
    beginTotal: beginQty * price,
    inQty,
    inTotal: num(b.value_in),
    outQty,
    outTotal: num(b.value_out),
    balQty,
    // The API sends closing_stock_value per bucket; fall back to qty × price.
    balTotal:
      b.closing_stock_value != null ? num(b.closing_stock_value) : balQty * price,
    netValue: num(b.net_value),
  };
}

export function exportStockReportPdf({
  report,
  categoryName,
}: {
  report: StockReportResponse;
  categoryName?: string;
}): { ok: boolean; error?: string } {
  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) {
    return {
      ok: false,
      error: "Your browser blocked the report window. Allow pop-ups for this site.",
    };
  }

  const buckets = report.buckets ?? [];
  const period = titlePeriod(buckets.find((b) => b.period_label)?.period_label, report.period);

  // Column-group totals, listed one by one under the table.
  const totals = buckets.reduce(
    (acc, b) => {
      const f = rowFigures(b);
      acc.beginQty += f.beginQty;
      acc.beginTotal += f.beginTotal;
      acc.inQty += f.inQty;
      acc.inTotal += f.inTotal;
      acc.outQty += f.outQty;
      acc.outTotal += f.outTotal;
      acc.balQty += f.balQty;
      acc.balTotal += f.balTotal;
      acc.netValue += f.netValue;
      return acc;
    },
    {
      beginQty: 0, beginTotal: 0,
      inQty: 0, inTotal: 0,
      outQty: 0, outTotal: 0,
      balQty: 0, balTotal: 0,
      netValue: 0,
    }
  );

  const bodyRows = buckets
    .map((b) => {
      const f = rowFigures(b);
      return `<tr>
        <td class="period">${escapeHtml(bucketDate(b.period_label))}</td>
        <td class="strong">${escapeHtml(b.product_name ?? "")}</td>
        <td>${escapeHtml(b.product_description ?? "")}</td>
        <td>${escapeHtml(b.variant_sku ?? "")}</td>
        <td>${escapeHtml(b.category_name ?? "")}</td>
        <td class="n grp">${f.beginQty}</td>
        <td class="n">${usd(f.price)}</td>
        <td class="n">${usd(f.beginTotal)}</td>
        <td class="n grp">${f.inQty}</td>
        <td class="n">${usd(f.price)}</td>
        <td class="n">${usd(f.inTotal)}</td>
        <td class="n grp">${f.outQty}</td>
        <td class="n">${usd(f.price)}</td>
        <td class="n">${usd(f.outTotal)}</td>
        <td class="n grp">${f.balQty}</td>
        <td class="n">${usd(f.price)}</td>
        <td class="n">${usd(f.balTotal)}</td>
        <td class="n grp">${usd(f.netValue)}</td>
      </tr>`;
    })
    .join("");

  const totalsRow = `<tr class="totals">
    <td colspan="5">Totals — ${buckets.length} variant${buckets.length === 1 ? "" : "s"}</td>
    <td class="n grp">${totals.beginQty}</td>
    <td class="n"></td>
    <td class="n">${usd(totals.beginTotal)}</td>
    <td class="n grp">${totals.inQty}</td>
    <td class="n"></td>
    <td class="n">${usd(totals.inTotal)}</td>
    <td class="n grp">${totals.outQty}</td>
    <td class="n"></td>
    <td class="n">${usd(totals.outTotal)}</td>
    <td class="n grp">${totals.balQty}</td>
    <td class="n"></td>
    <td class="n">${usd(totals.balTotal)}</td>
    <td class="n grp">${usd(totals.netValue)}</td>
  </tr>`;

  // Each group's totals again as a plain list, which is easier to read than
  // scanning the wide totals row.
  const breakdown = [
    ["Beginning", totals.beginQty, totals.beginTotal],
    ["In", totals.inQty, totals.inTotal],
    ["Out", totals.outQty, totals.outTotal],
    ["Balance or End", totals.balQty, totals.balTotal],
  ] as [string, number, number][];

  const breakdownHtml = breakdown
    .map(
      ([label, qty, total]) => `<tr>
        <td class="bk-label">${label}</td>
        <td class="n">${qty}</td>
        <td class="n">${usd(total)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Stock Movement Report - ${escapeHtml(period)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Khmer OS",
                 "Noto Sans Khmer", Roboto, Arial, sans-serif;
    color: #111; margin: 0; padding: 24px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .rule { border-bottom: 2px solid #111; margin: 10px 0 18px; }
  .summary { display: flex; gap: 48px; margin-bottom: 20px; }
  .summary .k { font-size: 10px; color: #666; margin-bottom: 2px; }
  .summary .v { font-size: 16px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th, td { border: 1px solid #999; padding: 4px 5px; vertical-align: middle; }
  thead th {
    background: #e8e8e8; font-size: 9px; font-weight: 700; text-align: center;
  }
  thead tr:first-child th { background: #d9d9d9; }
  td.n { text-align: right; white-space: nowrap; }
  td.grp, th.grp { border-left: 1.5px solid #666; }
  td.period { white-space: nowrap; color: #333; }
  td.strong { font-weight: 700; }
  tr.totals td { background: #f0f0f0; font-weight: 700; border-top: 1.5px solid #333; }
  tbody tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  h2 { font-size: 12px; margin: 22px 0 8px; }
  table.breakdown { width: 320px; font-size: 10px; }
  table.breakdown th { background: #e8e8e8; text-align: center; }
  .bk-label { font-weight: 700; }
  .foot { margin-top: 18px; font-size: 9px; color: #666; }
  @media print { .noprint { display: none; } }
  .noprint { margin-bottom: 16px; }
  .noprint button {
    font: inherit; padding: 8px 16px; margin-right: 8px; cursor: pointer;
    border: 1px solid #999; border-radius: 6px; background: #fff;
  }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <h1>Stock Movement Report - ${escapeHtml(period)}</h1>
  <div class="rule"></div>

  <div class="summary">
    <div><div class="k">Qty In</div><div class="v">${num(report.total_qty_in)}</div></div>
    <div><div class="k">Qty Out</div><div class="v">${num(report.total_qty_out)}</div></div>
    <div><div class="k">Net Value</div><div class="v">${usd(report.total_net_value)}</div></div>
    <div><div class="k">Closing Stock Value</div><div class="v">${usd(report.total_closing_stock_value)}</div></div>
    ${categoryName ? `<div><div class="k">Category</div><div class="v">${escapeHtml(categoryName)}</div></div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">Period</th>
        <th rowspan="2">Product</th>
        <th rowspan="2">Description</th>
        <th rowspan="2">SKU</th>
        <th rowspan="2">Category</th>
        <th colspan="3" class="grp">Beginning</th>
        <th colspan="3" class="grp">In</th>
        <th colspan="3" class="grp">Out</th>
        <th colspan="3" class="grp">Balance or End</th>
        <th rowspan="2" class="grp">Net Value</th>
      </tr>
      <tr>
        <th class="grp">Qty</th><th>Price</th><th>Total</th>
        <th class="grp">Qty</th><th>Price</th><th>Total</th>
        <th class="grp">Qty</th><th>Price</th><th>Total</th>
        <th class="grp">Qty</th><th>Price</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="18" style="text-align:center;padding:16px">No stock movement in this period.</td></tr>`}
      ${buckets.length ? totalsRow : ""}
    </tbody>
  </table>

  <h2>Totals by column group</h2>
  <table class="breakdown">
    <thead><tr><th>Group</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>
      ${breakdownHtml}
      <tr class="totals"><td class="bk-label">Net value</td><td class="n"></td><td class="n">${usd(totals.netValue)}</td></tr>
    </tbody>
  </table>

  <p class="foot">
    Generated ${escapeHtml(new Date().toLocaleString())} ·
    ${buckets.length} variant${buckets.length === 1 ? "" : "s"} ·
    Price is the variant's unit price and is shown on every group for reference.
  </p>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  return { ok: true };
}

/** Same grouped figures, flattened for the spreadsheet export. */
export function stockReportExcelRows(buckets: StockReportBucket[]) {
  return buckets.map((b) => {
    const f = rowFigures(b);
    return {
      period: bucketDate(b.period_label),
      product: b.product_name ?? "",
      description: b.product_description ?? "",
      sku: b.variant_sku ?? "",
      category: b.category_name ?? "",
      ...f,
    };
  });
}

export type StockReportExcelRow = ReturnType<typeof stockReportExcelRows>[number];
