"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, FileSpreadsheet, FileText, X } from "lucide-react";
import { money } from "@/app/(components)/crud";
import {
  exportExcel,
  exportPdf,
  slug,
  type ExportColumn,
} from "@/app/(components)/crud/exporters";
import { useGetInvoiceQuery, useGetProductsQuery } from "@/state/tageTypes/services/inventoryApi";
import type { InvoiceItemResponse, InvoiceResponse } from "@/state/types/inventory";

const lineTotal = (it: InvoiceItemResponse) =>
  it.total_price != null ? Number(it.total_price) : Number(it.unit_price) * it.quantity;

/**
 * Line-item columns for the PDF and Excel exports.
 *
 * Invoices are a billing document, not a production spec sheet — unlike the
 * quotation export, the print-shop detail (size, pages, colour, paper,
 * finishing) is left off; only what the customer is charged for goes out.
 */
const ITEM_COLUMNS: ExportColumn<InvoiceItemResponse>[] = [
  { header: "Item", value: (i) => i.item_name, width: 260 },
  { header: "Qty", value: (i) => i.quantity, numeric: true, width: 70 },
  { header: "Unit price", value: (i) => Number(i.unit_price), numeric: true, width: 100 },
  { header: "Total", value: (i) => lineTotal(i), numeric: true, width: 110 },
];

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

export default function InvoiceDetailDialog({
  invoice: initial,
  customerName,
  onClose,
}: {
  invoice: InvoiceResponse;
  customerName: string | null;
  onClose: () => void;
}) {
  // Refetch by id so the items list is the authoritative set.
  const { data } = useGetInvoiceQuery(initial.invoice_id);
  const inv = data ?? initial;

  // Items created without an explicit `item_name` (the plain product/variant
  // picker in the "New invoice" form doesn't send one) fall back to the
  // product catalogue for a readable label.
  const { data: products } = useGetProductsQuery();

  const productLabel = (productId?: number | null, variantId?: number | null) => {
    const p = products?.find((pp) => pp.product_id === productId);
    if (!p) return null;
    const v = p.variants.find((vv) => vv.variant_id === variantId);
    return v ? `${p.name} — ${v.sku || `#${v.variant_id}`}` : p.name;
  };

  const displayItems = useMemo(
    () =>
      inv.items.map((it) => ({
        ...it,
        item_name:
          it.item_name || productLabel(it.product_id, it.variant_id) || `Item #${it.item_id}`,
      })),
    [inv.items, products]
  );

  // Which line items to include in Print/Save — everything, by default.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(displayItems.map((it) => it.item_id))
  );
  const [exportError, setExportError] = useState<string | null>(null);

  // Re-sync selection whenever the authoritative item list changes (e.g. the
  // refetch above resolves with a different set than the row's snapshot).
  useEffect(() => {
    setSelected(new Set(displayItems.map((it) => it.item_id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.invoice_id, inv.items.length]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const toggle = (itemId: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

  const allSelected = selected.size > 0 && selected.size === displayItems.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(displayItems.map((it) => it.item_id)));

  const selectedItems = displayItems.filter((it) => selected.has(it.item_id));
  const selectedSubtotal = selectedItems.reduce((n, it) => n + lineTotal(it), 0);

  const title = `Invoice #${inv.invoice_id}`;
  const meta: [string, string][] = [
    ["Customer", customerName ?? "Walk-in"],
    ["Date", new Date(inv.created_at).toLocaleDateString()],
    ["Payment", inv.payment_type ?? "—"],
    ["Items", `${selected.size} of ${displayItems.length} selected`],
  ];

  const doPdf = () => {
    const res = exportPdf({
      title,
      subtitle: `${customerName ?? "Walk-in"} · ${new Date(inv.created_at).toLocaleDateString()}`,
      meta,
      columns: ITEM_COLUMNS,
      rows: selectedItems,
      totals: [["Subtotal", money(selectedSubtotal)]],
      note:
        selected.size !== displayItems.length
          ? `Only ${selected.size} of ${displayItems.length} line items were included. Discount, tax and the invoice total below apply to the full invoice, not just this selection.\nInvoice discount ${money(
              inv.discount
            )} · tax ${money(inv.tax)} · full total ${money(inv.total_amount)}.`
          : null,
    });
    if (!res.ok) setExportError(res.error ?? null);
  };

  const doExcel = () =>
    exportExcel({
      filename: slug(`invoice-${inv.invoice_id}`),
      sheetName: `Invoice ${inv.invoice_id}`.slice(0, 31),
      title,
      meta,
      columns: ITEM_COLUMNS,
      rows: selectedItems,
      totals: [["Subtotal", selectedSubtotal]],
    });

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
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
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
              {inv.payment_type && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ color: "var(--color-info)", background: "var(--color-info-tint)" }}
                >
                  <CreditCard className="h-2.5 w-2.5" />
                  {inv.payment_type}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {customerName ?? "Walk-in"} · {displayItems.length} item
              {displayItems.length === 1 ? "" : "s"} · {money(inv.total_amount)}
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

          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Pick which line items to include in Print / Save — everything is
            selected by default.
          </p>

          {/* items */}
          <div
            className="rounded-xl border overflow-x-auto"
            style={{ borderColor: "var(--color-border)" }}
          >
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-card)" }}>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all items"
                      className="h-4 w-4"
                    />
                  </th>
                  {["Item", "Spec", "Qty", "Unit", "Total"].map((h) => (
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
                {displayItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      This invoice has no line items.
                    </td>
                  </tr>
                ) : (
                  displayItems.map((it) => {
                    const checked = selected.has(it.item_id);
                    return (
                      <tr
                        key={it.item_id}
                        onClick={() => toggle(it.item_id)}
                        className="border-t cursor-pointer"
                        style={{
                          borderColor: "var(--color-divider)",
                          background: checked
                            ? "transparent"
                            : "color-mix(in srgb, var(--color-text-muted) 6%, transparent)",
                          opacity: checked ? 1 : 0.55,
                        }}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(it.item_id)}
                            aria-label={`Include ${it.item_name}`}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-2.5" style={{ color: "var(--color-text-primary)" }}>
                          {it.item_name}
                        </td>
                        <td
                          className="px-3 py-2.5 text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {[it.size, it.pages != null ? `${it.pages}pp` : null, it.print_side, it.color_spec, it.paper_cover, it.paper_inside, it.finishing]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right tabular-nums"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {it.quantity}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right tabular-nums"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {money(it.unit_price)}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right tabular-nums font-semibold"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {money(lineTotal(it))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 flex flex-col gap-1">
              <div
                className="flex items-center justify-between text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span>Subtotal</span>
                <span className="tabular-nums">{money(selectedSubtotal)}</span>
              </div>
              <div
                className="flex items-center justify-between text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span>Invoice discount</span>
                <span className="tabular-nums">{money(inv.discount)}</span>
              </div>
              <div
                className="flex items-center justify-between text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span>Invoice tax</span>
                <span className="tabular-nums">{money(inv.tax)}</span>
              </div>
              <div
                className="flex items-center justify-between text-sm font-bold pt-1.5 mt-0.5"
                style={{
                  color: "var(--color-text-primary)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <span>Full invoice total</span>
                <span className="tabular-nums">{money(inv.total_amount)}</span>
              </div>
            </div>
          </div>

          {exportError && (
            <p className="text-xs" style={{ color: "var(--color-error)" }}>
              {exportError}
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
            disabled={!selected.size}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            <FileText className="h-4 w-4" />
            Print / Save PDF
          </button>
          <button
            type="button"
            onClick={doExcel}
            disabled={!selected.size}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Save Excel
          </button>
        </div>
      </div>
    </div>
  );
}
