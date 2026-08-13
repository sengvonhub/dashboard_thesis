"use client";

/**
 * Document exporters — no dependencies.
 *
 * PDF: rendered through the browser's own print pipeline. "Save as PDF" is a
 * destination in every modern print dialog, so this yields a real PDF with
 * selectable text and no library or server round-trip. The trade-off is that
 * the user picks the destination in the dialog.
 *
 * Excel: SpreadsheetML 2003 (`.xls`), which Excel, LibreOffice and Numbers all
 * open natively. Chosen over CSV because it carries real cell types — numbers
 * stay numeric and right-aligned instead of being re-guessed on import — and
 * over `.xlsx`, which would need a zip writer.
 */

export interface ExportColumn<T> {
  header: string;
  /** Cell value. Return a number to have Excel treat it as numeric. */
  value: (row: T) => string | number | null | undefined;
  /** Right-align in the PDF and mark as Number in Excel. */
  numeric?: boolean;
  width?: number;
}

const escapeXml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] as string)
  );

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
  );

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Safe for a filename on every OS. */
export const slug = (s: string) =>
  s.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

// ── Excel ────────────────────────────────────────────────

export function exportExcel<T>({
  filename,
  sheetName = "Sheet1",
  title,
  meta = [],
  columns,
  rows,
  totals = [],
}: {
  filename: string;
  sheetName?: string;
  title?: string;
  /** Label/value pairs rendered above the table. */
  meta?: [string, string][];
  columns: ExportColumn<T>[];
  rows: T[];
  /** Label/value pairs rendered under the table. */
  totals?: [string, string | number][];
}) {
  const cell = (v: string | number | null | undefined, numeric?: boolean) => {
    if (v === null || v === undefined || v === "") return "<Cell/>";
    const isNum = numeric && Number.isFinite(Number(v));
    return isNum
      ? `<Cell><Data ss:Type="Number">${Number(v)}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
  };

  const titleRow = title
    ? `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`
    : "";

  const metaRows = meta
    .map(
      ([k, v]) =>
        `<Row><Cell ss:StyleID="metaKey"><Data ss:Type="String">${escapeXml(k)}</Data></Cell>` +
        `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell></Row>`
    )
    .join("");

  const headerRow =
    `<Row>` +
    columns
      .map(
        (c) =>
          `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`
      )
      .join("") +
    `</Row>`;

  const bodyRows = rows
    .map(
      (r) =>
        `<Row>` +
        columns.map((c) => cell(c.value(r), c.numeric)).join("") +
        `</Row>`
    )
    .join("");

  const totalRows = totals
    .map(
      ([k, v]) =>
        `<Row><Cell ss:StyleID="metaKey"><Data ss:Type="String">${escapeXml(k)}</Data></Cell>` +
        cell(v, typeof v === "number") +
        `</Row>`
    )
    .join("");

  const cols = columns
    .map((c) => `<Column ss:Width="${c.width ?? 110}"/>`)
    .join("");

  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/></Style>
  <Style ss:ID="metaKey"><Font ss:Bold="1"/></Style>
  <Style ss:ID="header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF0F5" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName).slice(0, 31)}">
  <Table>${cols}${titleRow}${metaRows}${metaRows || titleRow ? "<Row/>" : ""}${headerRow}${bodyRows}${
    totalRows ? "<Row/>" + totalRows : ""
  }</Table>
 </Worksheet>
</Workbook>`;

  download(
    new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }),
    filename.endsWith(".xls") ? filename : `${filename}.xls`
  );
}

// ── PDF ──────────────────────────────────────────────────

export function exportPdf<T>({
  title,
  subtitle,
  meta = [],
  columns,
  rows,
  totals = [],
  note,
}: {
  title: string;
  subtitle?: string;
  meta?: [string, string][];
  columns: ExportColumn<T>[];
  rows: T[];
  totals?: [string, string | number][];
  note?: string | null;
}): { ok: boolean; error?: string } {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    return {
      ok: false,
      error: "Your browser blocked the report window. Allow pop-ups for this site.",
    };
  }

  const metaHtml = meta.length
    ? `<div class="meta">${meta
        .map(
          ([k, v]) =>
            `<div><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`
        )
        .join("")}</div>`
    : "";

  const head = columns
    .map((c) => `<th${c.numeric ? ' class="num"' : ""}>${escapeHtml(c.header)}</th>`)
    .join("");

  const body = rows
    .map(
      (r) =>
        "<tr>" +
        columns
          .map(
            (c) =>
              `<td${c.numeric ? ' class="num"' : ""}>${escapeHtml(c.value(r) ?? "")}</td>`
          )
          .join("") +
        "</tr>"
    )
    .join("");

  const totalsHtml = totals.length
    ? `<table class="totals">${totals
        .map(
          ([k, v], i) =>
            `<tr class="${i === totals.length - 1 ? "grand" : ""}"><td>${escapeHtml(k)}</td><td class="num">${escapeHtml(v)}</td></tr>`
        )
        .join("")}</table>`
    : "";

  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #14161c; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: #5a6480; margin: 0 0 16px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px 24px;
          padding: 12px 0; border-top: 1px solid #e0e4ef; border-bottom: 1px solid #e0e4ef; margin-bottom: 18px; }
  .meta .k { display: block; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5a6480; }
  .meta .v { display: block; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
       color: #5a6480; border-bottom: 1px solid #e0e4ef; padding: 8px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #f0f2f5; vertical-align: top; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }   /* repeat header across pages */
  .totals { width: 280px; margin-left: auto; margin-top: 14px; }
  .totals td { border-bottom: none; padding: 4px 6px; }
  .totals .grand td { border-top: 2px solid #14161c; font-weight: 700; font-size: 14px; padding-top: 8px; }
  .note { margin-top: 22px; font-size: 11px; color: #5a6480; white-space: pre-wrap; }
  .foot { margin-top: 24px; font-size: 10px; color: #8892b0; }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ""}
  ${metaHtml}
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  ${totalsHtml}
  ${note ? `<div class="note">${escapeHtml(note)}</div>` : ""}
  <div class="foot">Generated ${escapeHtml(new Date().toLocaleString())}</div>
</body></html>`);

  win.document.close();
  win.focus();
  // Let the layout settle before opening the print dialog.
  setTimeout(() => win.print(), 300);
  return { ok: true };
}
