"use client";

import React, { useEffect } from "react";
import { CreditCard, Receipt, X } from "lucide-react";
import { initialsOf, money } from "@/app/(components)/crud";
import type { CustomerResponse, InvoiceResponse } from "@/state/types/inventory";

export default function CustomerInvoicesDialog({
  customer,
  invoices,
  onClose,
  onSelectInvoice,
}: {
  customer: CustomerResponse;
  invoices: InvoiceResponse[];
  onClose: () => void;
  onSelectInvoice: (invoice: InvoiceResponse) => void;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const total = invoices.reduce((n, i) => n + Number(i.total_amount ?? 0), 0);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${customer.name} invoices`}
        className="w-full max-w-md max-h-[85vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-11 w-11 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: customer.avatar_url
                ? "var(--color-surface-card)"
                : "var(--gradient-brand)",
            }}
          >
            {customer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={customer.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: "var(--color-on-accent)" }}>
                {initialsOf(customer.name)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {customer.name}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"} · {money(total)}
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          {invoices.length === 0 ? (
            <p
              className="px-5 py-10 text-sm text-center"
              style={{ color: "var(--color-text-muted)" }}
            >
              This customer has no invoices yet.
            </p>
          ) : (
            invoices.map((inv) => (
              <button
                type="button"
                key={inv.invoice_id}
                onClick={() => onSelectInvoice(inv)}
                className="w-full flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0 text-left transition-colors"
                style={{ borderColor: "var(--color-divider)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-divider)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
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
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                    {inv.items.length ? ` · ${inv.items.length} items` : ""}
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
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
