"use client";

import React, { useMemo, useState } from "react";
import {
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
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
  apiMessage,
  money,
} from "@/app/(components)/crud";
import {
  useCreateInvoiceFromQuotationMutation,
  useDeleteInvoiceMutation,
  useGetCustomersQuery,
  useGetInvoicesQuery,
} from "@/state/tageTypes/services/inventoryApi";
import { useGetQuotationsQuery } from "@/state/tageTypes/services/quotationApi";
import { useMe } from "@/state/tageTypes/lib/useMe";
import type { InvoiceResponse, PaymentType } from "@/state/types/inventory";
import { useConfirm } from "@/app/(components)/crud/confirm";
import InvoiceDetailDialog from "@/app/(components)/Invoice/InvoiceDetailDialog";

export default function InvoicesPage() {
  const confirm = useConfirm();
  const { hasStaffRecord } = useMe();
  const { data: invoices, isLoading, error: loadError } = useGetInvoicesQuery();
  const { data: customers } = useGetCustomersQuery();
  // Only an accepted, not-yet-converted quotation can become an invoice.
  const { data: quotations } = useGetQuotationsQuery({ status: "accepted" });
  const [createInvoiceFromQuotation, { isLoading: creating }] =
    useCreateInvoiceFromQuotationMutation();
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<InvoiceResponse | null>(null);
  const [quotationId, setQuotationId] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const convertibleQuotations = useMemo(
    () => (quotations ?? []).filter((q) => !q.invoice_id),
    [quotations]
  );
  const selectedQuotation = useMemo(
    () => convertibleQuotations.find((q) => String(q.quotation_id) === quotationId) ?? null,
    [convertibleQuotations, quotationId]
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

  const openCreate = () => {
    setQuotationId("");
    setPaymentType("");
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!quotationId) {
      setError("Select a quotation to invoice.");
      return;
    }

    try {
      await createInvoiceFromQuotation({
        quotation_id: Number(quotationId),
        payment_type: paymentType || null,
      }).unwrap();
      setOpen(false);
    } catch (err) {
      // 400 when the quotation has no items or is already converted.
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
    const ok = await confirm({
      title: `Delete invoice #${inv.invoice_id}`,
      message: "The invoice and its line items will be removed.",
      confirmLabel: "Delete invoice",
    });
    if (!ok) return;
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
              role="button"
              tabIndex={0}
              onClick={() => setDetail(inv)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(inv);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0 text-left cursor-pointer transition-colors"
              style={{ borderColor: "var(--color-divider)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-divider)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(inv);
                }}
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

      {detail && (
        <InvoiceDetailDialog
          invoice={detail}
          customerName={customerName(detail.customer_id)}
          onClose={() => setDetail(null)}
        />
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
          <SelectField
            label="Quotation"
            value={quotationId}
            placeholder="— pick an accepted quotation —"
            onChange={setQuotationId}
            options={convertibleQuotations.map((q) => ({
              value: String(q.quotation_id),
              label: `${q.ref_number} — ${q.customer_name ?? "No customer"} (${money(
                q.total_amount
              )})`,
            }))}
          />

          {!convertibleQuotations.length && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              No accepted quotations are available to invoice yet. Mark a
              quotation as accepted first.
            </p>
          )}

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

          {selectedQuotation && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="px-3 py-2 flex flex-col gap-1"
                style={{ borderColor: "var(--color-divider)" }}
              >
                {selectedQuotation.items.map((it) => (
                  <div
                    key={it.item_id}
                    className="flex items-center justify-between text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <span className="truncate">
                      {it.item_name} × {it.quantity}
                    </span>
                    <span className="tabular-nums shrink-0 ml-2">
                      {money(it.total_price)}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="px-3 py-2.5 border-t flex items-center justify-between"
                style={{ borderColor: "var(--color-divider)", background: "var(--color-success-tint)" }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-success)" }}
                >
                  Total
                </span>
                <span className="text-lg font-bold" style={{ color: "var(--color-success)" }}>
                  {money(selectedQuotation.total_amount)}
                </span>
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            The invoice&rsquo;s customer, line items, discount and tax are
            copied from the quotation — edit them there before converting if
            they need to change.
          </p>
        </Dialog>
      )}
    </div>
  );
}
