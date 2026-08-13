"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  SearchBar,
  SelectField,
  TextAreaField,
  TextField,
  apiMessage,
  money,
} from "@/app/(components)/crud";
import {
  exportExcel,
  exportPdf,
  slug,
  type ExportColumn,
} from "@/app/(components)/crud/exporters";
import QuotationDetailDialog from "@/app/(components)/Quotation/QuotationDetailDialog";
import {
  useCreateQuotationMutation,
  useDeleteQuotationMutation,
  useGetQuotationSummaryQuery,
  useGetQuotationsQuery,
} from "@/state/tageTypes/services/quotationApi";
import { useGetCustomersQuery } from "@/state/tageTypes/services/inventoryApi";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import type {
  QuotationItemCreate,
  QuotationResponse,
} from "@/state/types/quotation";

interface DraftItem extends QuotationItemCreate {
  key: number;
}

const newItem = (sortOrder: number): DraftItem => ({
  key: Date.now() + Math.random(),
  sort_order: sortOrder,
  item_name: "",
  size: "",
  pages: null,
  print_side: "",
  color_spec: "",
  finishing: "",
  quantity: 1,
  unit_price: 0,
});

/** List-level export columns. */
const LIST_COLUMNS: ExportColumn<QuotationResponse>[] = [
  { header: "Ref", value: (q) => q.ref_number, width: 100 },
  { header: "Customer", value: (q) => q.customer_name ?? "—", width: 160 },
  { header: "Date", value: (q) => String(q.quotation_date).slice(0, 10), width: 90 },
  { header: "Expires", value: (q) => (q.expiry_date ? String(q.expiry_date).slice(0, 10) : "—"), width: 90 },
  { header: "Status", value: (q) => q.status, width: 80 },
  { header: "Items", value: (q) => q.items.length, numeric: true, width: 55 },
  { header: "Subtotal", value: (q) => Number(q.subtotal), numeric: true, width: 90 },
  { header: "Discount", value: (q) => Number(q.discount), numeric: true, width: 80 },
  { header: "Tax", value: (q) => Number(q.tax), numeric: true, width: 70 },
  { header: "Total", value: (q) => Number(q.total_amount), numeric: true, width: 100 },
  { header: "Invoice", value: (q) => (q.invoice_id ? `#${q.invoice_id}` : ""), width: 80 },
];

export default function QuotationsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const args = useMemo(
    () => (statusFilter ? { status: statusFilter } : {}),
    [statusFilter]
  );

  const { data: quotations, isLoading, error: loadError } = useGetQuotationsQuery(args);
  const { data: summary } = useGetQuotationSummaryQuery();
  const { data: customers } = useGetCustomersQuery();
  const { data: staff } = useGetAllStaffQuery();
  const [createQuotation, { isLoading: creating }] = useCreateQuotationMutation();
  const [deleteQuotation, { isLoading: deleting }] = useDeleteQuotationMutation();

  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<QuotationResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ref_number: "",
    customer_id: "",
    staff_id: "",
    quotation_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    production_days: "",
    artwork_status: "",
    payment_terms: "",
    delivery_method: "",
    discount: "0",
    tax: "0",
    note: "",
  });
  const [items, setItems] = useState<DraftItem[]>([newItem(1)]);

  const setF = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setItem = (key: number, patch: Partial<DraftItem>) =>
    setItems((l) => l.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const filtered = useMemo(() => {
    if (!quotations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((x) =>
      [x.ref_number, x.customer_name, x.customer_phone, x.status]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [quotations, search]);

  const draftTotal = useMemo(() => {
    const sub = items.reduce(
      (n, it) => n + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0
    );
    return sub - Number(form.discount || 0) + Number(form.tax || 0);
  }, [items, form.discount, form.tax]);

  const openCreate = () => {
    setForm((f) => ({ ...f, ref_number: "" }));
    setItems([newItem(1)]);
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.ref_number.trim()) {
      setError("A reference number is required.");
      return;
    }
    const clean = items.filter((it) => it.item_name.trim() && Number(it.quantity) > 0);
    try {
      await createQuotation({
        ref_number: form.ref_number.trim(),
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        staff_id: form.staff_id ? Number(form.staff_id) : null,
        quotation_date: form.quotation_date,
        expiry_date: form.expiry_date || null,
        production_days: form.production_days ? Number(form.production_days) : null,
        artwork_status: (form.artwork_status || null) as never,
        payment_terms: form.payment_terms || null,
        delivery_method: (form.delivery_method || null) as never,
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
        note: form.note || null,
        items: clean.map(({ key, ...rest }) => ({
          ...rest,
          quantity: Number(rest.quantity),
          unit_price: Number(rest.unit_price),
          pages: rest.pages ? Number(rest.pages) : null,
        })),
      }).unwrap();
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Could not create this quotation."));
    }
  };

  const onDelete = async (q: QuotationResponse) => {
    if (!window.confirm(`Delete quotation ${q.ref_number}?`)) return;
    setPageError(null);
    try {
      await deleteQuotation(q.quotation_id).unwrap();
    } catch (err) {
      // The API blocks deleting accepted or already-converted quotations.
      setPageError(apiMessage(err, "Could not delete this quotation."));
    }
  };

  const listMeta: [string, string][] = [
    ["Quotations", String(summary?.total_quotations ?? filtered.length)],
    ["Draft", String(summary?.total_draft ?? "—")],
    ["Sent", String(summary?.total_sent ?? "—")],
    ["Accepted", String(summary?.total_accepted ?? "—")],
  ];

  const exportListPdf = () => {
    const res = exportPdf({
      title: "Quotations",
      subtitle: statusFilter ? `Filtered by status: ${statusFilter}` : "All quotations",
      meta: listMeta,
      columns: LIST_COLUMNS,
      rows: filtered,
      totals: [
        ["Total value", money(filtered.reduce((n, q) => n + Number(q.total_amount ?? 0), 0))],
      ],
    });
    if (!res.ok) setPageError(res.error ?? null);
  };

  const exportListExcel = () =>
    exportExcel({
      filename: slug(`quotations-${statusFilter || "all"}`),
      sheetName: "Quotations",
      title: "Quotations",
      meta: listMeta,
      columns: LIST_COLUMNS,
      rows: filtered,
      totals: [
        ["Total value", filtered.reduce((n, q) => n + Number(q.total_amount ?? 0), 0)],
      ],
    });

  const stats = [
    { label: "Total", value: summary?.total_quotations ?? "—", tint: "var(--color-text-primary)" },
    { label: "Draft", value: summary?.total_draft ?? "—", tint: "var(--color-text-muted)" },
    { label: "Sent", value: summary?.total_sent ?? "—", tint: "var(--color-info)" },
    { label: "Accepted", value: summary?.total_accepted ?? "—", tint: "var(--color-success)" },
    { label: "Value", value: money(summary?.total_amount ?? 0), tint: "var(--color-blurple)" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Quotations"
        subtitle="Quotes &amp; estimates — accepted quotations convert into invoices"
        actionLabel="New quotation"
        onAction={openCreate}
      />

      {/* summary */}
      <Card className="grid grid-cols-2 sm:grid-cols-5">
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

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search ref, customer, phone..."
        trailing={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
            </select>
            <button
              type="button"
              onClick={exportListPdf}
              disabled={!filtered.length}
              aria-label="Export PDF"
              className="h-[42px] w-[42px] rounded-xl border flex items-center justify-center disabled:opacity-40"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={exportListExcel}
              disabled={!filtered.length}
              aria-label="Export Excel"
              className="h-[42px] w-[42px] rounded-xl border flex items-center justify-center disabled:opacity-40"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          </>
        }
      />

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {loadError ? (
        <EmptyState message={apiMessage(loadError, "Could not load quotations.")} />
      ) : isLoading ? (
        <EmptyState message="Loading quotations..." />
      ) : !filtered.length ? (
        <EmptyState
          message={search || statusFilter ? "No quotations match that filter." : "No quotations yet."}
        />
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((q) => (
            <div
              key={q.quotation_id}
              className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <button
                type="button"
                onClick={() => setDetail(q)}
                className="flex-1 min-w-0 flex items-center gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {q.ref_number}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={
                        q.status === "accepted"
                          ? { color: "var(--color-success)", background: "var(--color-success-tint)" }
                          : q.status === "sent"
                          ? { color: "var(--color-info)", background: "var(--color-info-tint)" }
                          : { color: "var(--color-text-muted)", background: "var(--color-divider)" }
                      }
                    >
                      {q.status}
                    </span>
                    {q.invoice_id != null && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{
                          color: "var(--color-warning)",
                          background: "var(--color-warning-tint)",
                        }}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        INV #{q.invoice_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {q.customer_name ?? "No customer"} ·{" "}
                    {String(q.quotation_date).slice(0, 10)} · {q.items.length} item
                    {q.items.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {money(q.total_amount)}
                  </p>
                </div>

                <ChevronRight
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                />
              </button>

              <button
                type="button"
                onClick={() => onDelete(q)}
                disabled={deleting || q.status === "accepted" || q.invoice_id != null}
                title={
                  q.status === "accepted" || q.invoice_id != null
                    ? "Accepted or converted quotations cannot be deleted"
                    : undefined
                }
                aria-label={`Delete ${q.ref_number}`}
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--color-error)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </Card>
      )}

      {detail && (
        <QuotationDetailDialog quotation={detail} onClose={() => setDetail(null)} />
      )}

      {open && (
        <Dialog
          title="New quotation"
          wide
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel="Create quotation"
          saving={creating}
          error={error}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextField label="Reference number" value={form.ref_number} onChange={setF("ref_number")} />
            <SelectField
              label="Customer"
              value={form.customer_id}
              placeholder="— none —"
              onChange={setF("customer_id")}
              options={(customers ?? []).map((c) => ({
                value: String(c.customer_id),
                label: c.name,
              }))}
            />
            <SelectField
              label="Assign to staff"
              value={form.staff_id}
              placeholder="— none —"
              onChange={setF("staff_id")}
              options={(staff ?? []).map((s) => ({
                value: String(s.staff_id),
                label: s.name,
              }))}
            />
            <TextField label="Quotation date" type="date" value={form.quotation_date} onChange={setF("quotation_date")} />
            <TextField label="Expiry date" type="date" value={form.expiry_date} onChange={setF("expiry_date")} />
            <TextField
              label="Production days"
              value={form.production_days}
              inputMode="numeric"
              onChange={setF("production_days")}
            />
            <SelectField
              label="Artwork status"
              value={form.artwork_status}
              onChange={setF("artwork_status")}
              options={[
                { value: "not_provided", label: "Not provided" },
                { value: "approved", label: "Approved" },
                { value: "needs_revision", label: "Needs revision" },
              ]}
            />
            <SelectField
              label="Delivery method"
              value={form.delivery_method}
              onChange={setF("delivery_method")}
              options={[
                { value: "pickup", label: "Pickup" },
                { value: "delivery", label: "Delivery" },
              ]}
            />
            <TextField label="Payment terms" value={form.payment_terms} onChange={setF("payment_terms")} />
          </div>

          {/* line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Line items
              </span>
              <button
                type="button"
                onClick={() => setItems((l) => [...l, newItem(l.length + 1)])}
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--color-blurple)" }}
              >
                <Plus className="h-3 w-3" />
                Add item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <div
                  key={it.key}
                  className="grid grid-cols-12 gap-2 rounded-xl border p-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="col-span-12 sm:col-span-5">
                    <TextField
                      label="Item name"
                      value={it.item_name}
                      onChange={(v) => setItem(it.key, { item_name: v })}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <TextField
                      label="Size"
                      value={it.size ?? ""}
                      onChange={(v) => setItem(it.key, { size: v })}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <TextField
                      label="Qty"
                      value={String(it.quantity)}
                      inputMode="numeric"
                      onChange={(v) => setItem(it.key, { quantity: Number(v) || 0 })}
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-2">
                    <TextField
                      label="Unit price"
                      value={String(it.unit_price)}
                      inputMode="decimal"
                      onChange={(v) => setItem(it.key, { unit_price: Number(v) || 0 })}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1 flex items-end justify-end pb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((l) => (l.length === 1 ? l : l.filter((x) => x.key !== it.key)))
                      }
                      aria-label="Remove item"
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ color: "var(--color-error)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Discount" value={form.discount} inputMode="decimal" onChange={setF("discount")} />
            <TextField label="Tax" value={form.tax} inputMode="decimal" onChange={setF("tax")} />
          </div>

          <TextAreaField label="Note" value={form.note} onChange={setF("note")} />

          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--color-success-tint)" }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-success)" }}
            >
              Total
            </span>
            <span className="text-lg font-bold" style={{ color: "var(--color-success)" }}>
              {money(draftTotal)}
            </span>
          </div>
        </Dialog>
      )}
    </div>
  );
}
