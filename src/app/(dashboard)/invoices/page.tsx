"use client";

import React, { useMemo, useState } from "react";
import {
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Receipt,
  Trash2,
  User,
} from "lucide-react";
import {
  exportExcel,
  exportPdf,
  slug,
  type ExportColumn,
} from "@/app/(components)/crud/exporters";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  SearchBar,
  SelectField,
  TextField,
  apiMessage,
  money,
} from "@/app/(components)/crud";
import {
  useCreateInvoiceMutation,
  useDeleteInvoiceMutation,
  useGetCustomersQuery,
  useGetInvoicesQuery,
  useGetProductsQuery,
} from "@/state/tageTypes/services/inventoryApi";
import { useMe } from "@/state/tageTypes/lib/useMe";
import type { InvoiceResponse, PaymentType } from "@/state/types/inventory";

interface DraftItem {
  key: number;
  variant_id: string;
  product_id: string;
  quantity: string;
  unit_price: string;
}

const newItem = (): DraftItem => ({
  key: Date.now() + Math.random(),
  variant_id: "",
  product_id: "",
  quantity: "1",
  unit_price: "",
});

export default function InvoicesPage() {
  const { hasStaffRecord } = useMe();
  const { data: invoices, isLoading, error: loadError } = useGetInvoicesQuery();
  const { data: customers } = useGetCustomersQuery();
  const { data: products } = useGetProductsQuery();
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  /** Every variant across all products, for the line-item picker. */
  const variantOptions = useMemo(
    () =>
      (products ?? []).flatMap((p) =>
        p.variants.map((v) => ({
          value: String(v.variant_id),
          label: `${p.name} — ${v.sku || `#${v.variant_id}`} (${money(v.price)})`,
          productId: p.product_id,
          price: Number(v.price ?? 0),
        }))
      ),
    [products]
  );

  const customerName = (id?: number | null) =>
    customers?.find((c) => c.customer_id === id)?.name ?? null;

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [
        `#${inv.invoice_id}`,
        customerName(inv.customer_id),
        inv.payment_type,
      ]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [invoices, search, customers]);

  const revenue = useMemo(
    () => (invoices ?? []).reduce((n, i) => n + Number(i.total_amount ?? 0), 0),
    [invoices]
  );

  const draftTotal = useMemo(() => {
    const sub = items.reduce(
      (n, it) => n + Number(it.quantity || 0) * Number(it.unit_price || 0),
      0
    );
    return sub - Number(discount || 0) + Number(tax || 0);
  }, [items, discount, tax]);

  const setItem = (key: number, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const openCreate = () => {
    setCustomerId("");
    setPaymentType("");
    setDiscount("0");
    setTax("0");
    setItems([newItem()]);
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = items.filter((it) => it.variant_id && Number(it.quantity) > 0);
    if (!clean.length) {
      setError("Add at least one line item with a variant and quantity.");
      return;
    }

    try {
      await createInvoice({
        customer_id: customerId ? Number(customerId) : null,
        payment_type: paymentType || null,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        total_amount: draftTotal,
        items: clean.map((it) => ({
          product_id: it.product_id ? Number(it.product_id) : null,
          variant_id: Number(it.variant_id),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price || 0),
        })),
      }).unwrap();
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Could not create this invoice."));
    }
  };

  /** Columns shared by both invoice exports. */
  const listColumns: ExportColumn<InvoiceResponse>[] = [
    { header: "Invoice", value: (i) => `#${i.invoice_id}`, width: 80 },
    { header: "Customer", value: (i) => customerName(i.customer_id) ?? "Walk-in", width: 170 },
    { header: "Date", value: (i) => new Date(i.created_at).toLocaleDateString(), width: 95 },
    { header: "Items", value: (i) => i.items.length, numeric: true, width: 55 },
    { header: "Discount", value: (i) => Number(i.discount ?? 0), numeric: true, width: 80 },
    { header: "Tax", value: (i) => Number(i.tax ?? 0), numeric: true, width: 70 },
    { header: "Total", value: (i) => Number(i.total_amount ?? 0), numeric: true, width: 100 },
    { header: "Payment", value: (i) => i.payment_type ?? "", width: 80 },
  ];

  const listMeta: [string, string][] = [
    ["Invoices", String(filtered.length)],
    ["Total billed", money(filtered.reduce((n, i) => n + Number(i.total_amount ?? 0), 0))],
  ];

  const exportListPdf = () => {
    const res = exportPdf({
      title: "Invoices",
      subtitle: search ? `Filtered by “${search}”` : "All invoices",
      meta: listMeta,
      columns: listColumns,
      rows: filtered,
      totals: [
        ["Total billed", money(filtered.reduce((n, i) => n + Number(i.total_amount ?? 0), 0))],
      ],
    });
    if (!res.ok) setPageError(res.error ?? null);
  };

  const exportListExcel = () =>
    exportExcel({
      filename: slug("invoices"),
      sheetName: "Invoices",
      title: "Invoices",
      meta: listMeta,
      columns: listColumns,
      rows: filtered,
      totals: [
        ["Total billed", filtered.reduce((n, i) => n + Number(i.total_amount ?? 0), 0)],
      ],
    });

  const onDelete = async (inv: InvoiceResponse) => {
    if (!window.confirm(`Delete invoice #${inv.invoice_id}?`)) return;
    setPageError(null);
    try {
      await deleteInvoice(inv.invoice_id).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this invoice."));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Invoices"
        subtitle={`${invoices?.length ?? 0} invoices · ${money(revenue)} billed`}
        actionLabel="New invoice"
        onAction={openCreate}
      />

      {/* Creating an invoice reads current_user["staff_id"], so an account
          with no staff record cannot bill. */}
      {!hasStaffRecord && (
        <p className="text-xs" style={{ color: "var(--color-warning)" }}>
          Your account has no staff record — the API resolves the billing staff
          from your session, so creating an invoice will fail until one exists.
        </p>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by number, customer, payment..."
        trailing={
          <>
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
        <EmptyState message={apiMessage(loadError, "Could not load invoices.")} />
      ) : isLoading ? (
        <EmptyState message="Loading invoices..." />
      ) : !filtered.length ? (
        <EmptyState
          message={search ? "No invoices match that search." : "No invoices yet."}
        />
      ) : (
        <Card className="overflow-hidden">
          {filtered.map((inv) => (
            <div
              key={inv.invoice_id}
              className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--color-warning-tint)" }}
              >
                <Receipt className="h-4 w-4" style={{ color: "var(--color-warning)" }} />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Invoice #{inv.invoice_id}
                </p>
                <p
                  className="text-xs truncate inline-flex items-center gap-2"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <User className="h-3 w-3 shrink-0" />
                  {customerName(inv.customer_id) ?? "Walk-in"}
                  {" · "}
                  {new Date(inv.created_at).toLocaleDateString()}
                  {inv.items.length ? ` · ${inv.items.length} items` : ""}
                  {inv.attachments.length ? (
                    <>
                      {" · "}
                      <Paperclip className="h-3 w-3" />
                      {inv.attachments.length}
                    </>
                  ) : null}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {money(inv.total_amount)}
                </p>
                {inv.payment_type && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1"
                    style={{ color: "var(--color-info)" }}
                  >
                    <CreditCard className="h-2.5 w-2.5" />
                    {inv.payment_type}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDelete(inv)}
                disabled={deleting}
                aria-label={`Delete invoice ${inv.invoice_id}`}
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                style={{ color: "var(--color-error)" }}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </Card>
      )}

      {open && (
        <Dialog
          title="New invoice"
          wide
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel="Create invoice"
          saving={creating}
          error={error}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Customer"
              value={customerId}
              placeholder="— walk-in —"
              onChange={setCustomerId}
              options={(customers ?? []).map((c) => ({
                value: String(c.customer_id),
                label: c.name,
              }))}
            />
            <SelectField
              label="Payment type"
              value={paymentType}
              placeholder="— unset —"
              onChange={(v) => setPaymentType(v as PaymentType | "")}
              options={[
                { value: "cash", label: "Cash" },
                { value: "card", label: "Card" },
                { value: "transfer", label: "Transfer" },
              ]}
            />
          </div>

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
                onClick={() => setItems((l) => [...l, newItem()])}
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
                  className="grid grid-cols-12 gap-2 items-end rounded-xl border p-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="col-span-12 sm:col-span-6">
                    <SelectField
                      label="Variant"
                      value={it.variant_id}
                      placeholder="— pick —"
                      onChange={(v) => {
                        const opt = variantOptions.find((o) => o.value === v);
                        setItem(it.key, {
                          variant_id: v,
                          product_id: opt ? String(opt.productId) : "",
                          // Seed from the variant's price; still editable.
                          unit_price: opt ? String(opt.price) : it.unit_price,
                        });
                      }}
                      options={variantOptions}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <TextField
                      label="Qty"
                      value={it.quantity}
                      inputMode="numeric"
                      onChange={(v) => setItem(it.key, { quantity: v })}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <TextField
                      label="Unit price"
                      value={it.unit_price}
                      inputMode="decimal"
                      onChange={(v) => setItem(it.key, { unit_price: v })}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1 flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((l) =>
                          l.length === 1 ? l : l.filter((x) => x.key !== it.key)
                        )
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
            <TextField
              label="Discount"
              value={discount}
              inputMode="decimal"
              onChange={setDiscount}
            />
            <TextField label="Tax" value={tax} inputMode="decimal" onChange={setTax} />
          </div>

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

          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Creating this invoice deducts each line item&rsquo;s quantity from the
            variant&rsquo;s stock.
          </p>
        </Dialog>
      )}
    </div>
  );
}
