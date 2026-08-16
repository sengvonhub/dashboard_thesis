"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Receipt,
  Send,
  ThumbsUp,
  X,
} from "lucide-react";
import { money } from "@/app/(components)/crud";
import {
  exportExcel,
  exportPdf,
  slug,
  type ExportColumn,
} from "@/app/(components)/crud/exporters";
import {
  useGetQuotationQuery,
  useUpdateQuotationStatusMutation,
} from "@/state/tageTypes/services/quotationApi";
import { useCreateInvoiceFromQuotationMutation } from "@/state/tageTypes/services/inventoryApi";
import type {
  QuotationItemResponse,
  QuotationResponse,
  QuotationStatus,
} from "@/state/types/quotation";

const apiMessage = (err: unknown, fallback: string) => {
  const status = (err as { status?: number })?.status;
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (status === 409) return "That status is already set.";
  if (status === 403) return "Your role does not allow this.";
  return fallback;
};

/** Line-item columns, shared by the PDF and Excel exports. */
const ITEM_COLUMNS: ExportColumn<QuotationItemResponse>[] = [
  { header: "#", value: (i) => i.sort_order, numeric: true, width: 40 },
  { header: "Item", value: (i) => i.item_name, width: 190 },
  { header: "Size", value: (i) => i.size, width: 70 },
  { header: "Pages", value: (i) => i.pages, numeric: true, width: 55 },
  { header: "Print side", value: (i) => i.print_side, width: 80 },
  { header: "Colour", value: (i) => i.color_spec, width: 80 },
  { header: "Cover", value: (i) => i.paper_cover, width: 90 },
  { header: "Inside", value: (i) => i.paper_inside, width: 90 },
  { header: "Finishing", value: (i) => i.finishing, width: 90 },
  { header: "Qty", value: (i) => i.quantity, numeric: true, width: 55 },
  { header: "Unit price", value: (i) => Number(i.unit_price), numeric: true, width: 80 },
  { header: "Total", value: (i) => Number(i.total_price), numeric: true, width: 90 },
];

function StatusPill({ status }: { status: QuotationStatus }) {
  const map = {
    draft: { fg: "var(--color-text-muted)", bg: "var(--color-divider)" },
    sent: { fg: "var(--color-info)", bg: "var(--color-info-tint)" },
    accepted: { fg: "var(--color-success)", bg: "var(--color-success-tint)" },
  } as const;
  const s = map[status] ?? map.draft;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ color: s.fg, background: s.bg }}
    >
      {status}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </p>
      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

export default function QuotationDetailDialog({
  quotation: initial,
  onClose,
}: {
  quotation: QuotationResponse;
  onClose: () => void;
}) {
  // Refetch by id so items and price tiers are the authoritative set.
  const { data } = useGetQuotationQuery(initial.quotation_id);
  const q = data ?? initial;

  const [updateStatus, { isLoading: statusSaving }] =
    useUpdateQuotationStatusMutation();
  const [convert, { isLoading: converting }] =
    useCreateInvoiceFromQuotationMutation();

  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const converted = q.invoice_id != null;
  const title = `Quotation ${q.ref_number}`;
  const meta: [string, string][] = [
    ["Customer", q.customer_name ?? "—"],
    ["Phone", q.customer_phone ?? "—"],
    ["Date", String(q.quotation_date).slice(0, 10)],
    ["Expires", q.expiry_date ? String(q.expiry_date).slice(0, 10) : "—"],
    ["Status", q.status],
    ["Production days", q.production_days != null ? String(q.production_days) : "—"],
    ["Artwork", q.artwork_status ?? "—"],
    ["Payment terms", q.payment_terms ?? "—"],
    ["Delivery", q.delivery_method ?? "—"],
  ];
  const totals: [string, string | number][] = [
    ["Subtotal", money(q.subtotal)],
    ["Discount", money(q.discount)],
    ["Tax", money(q.tax)],
    ["Total", money(q.total_amount)],
  ];

  const doPdf = () => {
    const res = exportPdf({
      title,
      subtitle: `${q.customer_name ?? "No customer"} · ${String(q.quotation_date).slice(0, 10)}`,
      meta,
      columns: ITEM_COLUMNS,
      rows: q.items,
      totals,
      note: q.note,
    });
    if (!res.ok) setMsg({ error: res.error });
  };

  const doExcel = () =>
    exportExcel({
      filename: slug(`quotation-${q.ref_number}`),
      sheetName: q.ref_number.slice(0, 31),
      title,
      meta,
      columns: ITEM_COLUMNS,
      rows: q.items,
      totals,
    });

  const setStatus = async (status: QuotationStatus) => {
    setMsg({});
    try {
      await updateStatus({ id: q.quotation_id, body: { status } }).unwrap();
      setMsg({ ok: `Marked as ${status}.` });
    } catch (err) {
      setMsg({ error: apiMessage(err, "Could not change the status.") });
    }
  };

  const doConvert = async () => {
    setMsg({});
    try {
      const invoice = await convert({ quotation_id: q.quotation_id }).unwrap();
      setMsg({ ok: `Converted to invoice #${invoice.invoice_id}.` });
    } catch (err) {
      // 400 when not accepted, already converted, or it has no items.
      setMsg({ error: apiMessage(err, "Could not convert this quotation.") });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-4xl max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h2>
              <StatusPill status={q.status} />
              {converted && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{
                    color: "var(--color-warning)",
                    background: "var(--color-warning-tint)",
                  }}
                >
                  <Lock className="h-2.5 w-2.5" />
                  Invoice #{q.invoice_id}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {q.customer_name ?? "No customer"} · {q.items.length} item
              {q.items.length === 1 ? "" : "s"} · {money(q.total_amount)}
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

        {/* body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {meta.map(([k, v]) => (
              <Meta key={k} label={k} value={v} />
            ))}
          </div>

          {/* items */}
          <div
            className="rounded-xl border overflow-x-auto"
            style={{ borderColor: "var(--color-border)" }}
          >
            <table className="w-full text-sm" style={{ minWidth: 680 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-card)" }}>
                  {["#", "Item", "Spec", "Qty", "Unit", "Total"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-semibold uppercase tracking-wide px-3 py-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      No line items — a quotation with no items cannot be converted.
                    </td>
                  </tr>
                ) : (
                  q.items.map((it) => (
                    <React.Fragment key={it.item_id}>
                      <tr
                        className="border-t"
                        style={{ borderColor: "var(--color-divider)" }}
                      >
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-muted)" }}>
                          {it.sort_order}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-primary)" }}>
                          {it.item_name}
                          {it.note && (
                            <span
                              className="block text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {it.note}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {[
                            it.size,
                            it.pages != null ? `${it.pages}pp` : null,
                            it.print_side,
                            it.color_spec,
                            it.paper_cover,
                            it.paper_inside,
                            it.finishing,
                            it.language,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                          {it.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                          {money(it.unit_price)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {money(it.total_price)}
                        </td>
                      </tr>

                      {/* alternative quantity/price options */}
                      {it.price_tiers.length > 0 && (
                        <tr>
                          <td />
                          <td colSpan={5} className="px-3 pb-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              {it.price_tiers.map((t) => (
                                <span
                                  key={t.tier_id}
                                  className="text-[11px] px-2 py-0.5 rounded-full"
                                  style={{
                                    background: "var(--color-divider)",
                                    color: "var(--color-text-secondary)",
                                  }}
                                >
                                  {t.quantity} @ {money(t.unit_price)} = {money(t.total_price)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 flex flex-col gap-1">
              {totals.map(([k, v], i) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-sm"
                  style={{
                    color:
                      i === totals.length - 1
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    fontWeight: i === totals.length - 1 ? 700 : 400,
                    borderTop:
                      i === totals.length - 1
                        ? "1px solid var(--color-border)"
                        : undefined,
                    paddingTop: i === totals.length - 1 ? 6 : 0,
                  }}
                >
                  <span>{k}</span>
                  <span className="tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {q.note && (
            <div
              className="rounded-xl p-3 text-xs whitespace-pre-wrap"
              style={{
                background: "var(--color-surface-card)",
                color: "var(--color-text-secondary)",
              }}
            >
              {q.note}
            </div>
          )}

          {(msg.error || msg.ok) && (
            <p
              className="text-xs"
              style={{
                color: msg.error ? "var(--color-error)" : "var(--color-success)",
              }}
            >
              {msg.error ?? msg.ok}
            </p>
          )}
        </div>

        {/* actions */}
        <div
          className="shrink-0 px-5 py-4 border-t flex items-center gap-2 flex-wrap"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <button
            type="button"
            onClick={doPdf}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold border"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={doExcel}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold border"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>

          <div className="flex-1" />

          {/* Workflow: draft → sent → accepted → invoice. */}
          {!converted && q.status === "draft" && (
            <button
              type="button"
              onClick={() => setStatus("sent")}
              disabled={statusSaving}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold border disabled:opacity-50"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              {statusSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Mark as sent
            </button>
          )}

          {!converted && q.status === "sent" && (
            <button
              type="button"
              onClick={() => setStatus("accepted")}
              disabled={statusSaving}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--color-success)",
                color: "var(--color-on-success)",
              }}
            >
              {statusSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              Mark as accepted
            </button>
          )}

          {/* Only an accepted, unconverted quotation with items can convert. */}
          {!converted && q.status === "accepted" && (
            <button
              type="button"
              onClick={doConvert}
              disabled={converting || q.items.length === 0}
              title={
                q.items.length === 0
                  ? "Add at least one line item first"
                  : undefined
              }
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-blurple)",
                color: "var(--color-on-accent)",
              }}
            >
              {converting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              Convert to invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
