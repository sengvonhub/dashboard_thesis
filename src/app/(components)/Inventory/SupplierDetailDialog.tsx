"use client";

import React, { useEffect, useState } from "react";
import { Archive, Loader2, Mail, MapPin, Pencil, Phone, Plus, Trash2, User, X } from "lucide-react";
import { Card, EmptyState, apiMessage, initialsOf, money } from "@/app/(components)/crud";
import { useConfirm } from "@/app/(components)/crud/confirm";
import {
  useDeleteSupplierPriceMutation,
  useGetSupplierPricesQuery,
} from "@/state/tageTypes/services/inventoryApi";
import type { SupplierProductPriceResponse, SupplierResponse } from "@/state/types/inventory";
import SupplierPriceFormDialog from "./SupplierPriceFormDialog";

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
      style={{ borderColor: "var(--color-divider)" }}
    >
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-divider)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-text-secondary)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        {value ? (
          <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
            {value}
          </p>
        ) : (
          <p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>
            Not provided
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Per-supplier detail: contact info plus the "Supplier Prices" list — what
 * this supplier charges per product variant (GET/POST /supplier-prices/).
 *
 * Header/row styling mirrors ProductDetailDialog (flat title bar, bordered
 * row cards, click-the-row-to-open-edit) rather than a standalone look, so
 * this dialog matches every other detail dialog in the app.
 */
export default function SupplierDetailDialog({
  supplier,
  onClose,
  onEdit,
}: {
  supplier: SupplierResponse;
  onClose: () => void;
  onEdit: () => void;
}) {
  const confirm = useConfirm();
  const {
    data: prices,
    isLoading: pricesLoading,
    error: pricesError,
  } = useGetSupplierPricesQuery({ supplierId: supplier.supplier_id });
  const [deleteSupplierPrice, { isLoading: deleting }] = useDeleteSupplierPriceMutation();

  const [priceForm, setPriceForm] = useState<"new" | SupplierProductPriceResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const onDeletePrice = async (p: SupplierProductPriceResponse) => {
    const ok = await confirm({
      title: `Remove ${p.variant.product.name}`,
      message: "This price will be removed from the supplier.",
      confirmLabel: "Remove price",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await deleteSupplierPrice(p.price_id).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not remove this price."));
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6"
        style={{ background: "var(--color-scrim)" }}
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${supplier.name} details`}
          className="w-full max-w-lg max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* flat header — same shape as ProductDetailDialog */}
          <div
            className="flex items-start gap-3 px-5 py-4 border-b shrink-0"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <div
              className="h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: supplier.avatar_url ? "var(--color-surface-card)" : "var(--gradient-brand)",
              }}
            >
              {supplier.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={supplier.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold" style={{ color: "var(--color-on-accent)" }}>
                  {initialsOf(supplier.name)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {supplier.name}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {[supplier.contact_person, `${prices?.length ?? 0} price${prices?.length === 1 ? "" : "s"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${supplier.name}`}
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Pencil className="h-4 w-4" />
            </button>
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
            <Card className="px-4">
              <ContactRow icon={User} label="Contact person" value={supplier.contact_person} />
              <ContactRow
                icon={Phone}
                label="Phone"
                value={[supplier.phone, supplier.phone2].filter(Boolean).join(" · ") || null}
              />
              <ContactRow icon={Mail} label="Email" value={supplier.email} />
              <ContactRow icon={MapPin} label="Address" value={supplier.address} />
            </Card>

            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Archive className="h-3.5 w-3.5" />
                Supplier prices
              </span>
              <button
                type="button"
                onClick={() => setPriceForm("new")}
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: "var(--color-blurple)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {pageError && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {pageError}
              </p>
            )}

            {pricesError ? (
              <EmptyState message={apiMessage(pricesError, "Could not load supplier prices.")} />
            ) : pricesLoading ? (
              <EmptyState message="Loading prices..." />
            ) : !prices?.length ? (
              <div
                className="rounded-xl border px-4 py-8 text-center"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Archive className="h-6 w-6 mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No product prices yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {prices.map((p) => (
                  <div
                    key={p.price_id}
                    className="rounded-xl border p-3"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-info-tint)" }}
                      >
                        <Archive className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setPriceForm(p)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-blurple)" }}
                        >
                          {p.variant.product.name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
                          {[p.variant.sku, "tap to edit"].filter(Boolean).join(" · ")}
                        </p>
                      </button>

                      <div className="text-right shrink-0">
                        <p
                          className="text-lg font-bold leading-none"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {money(p.unit_price)}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          unit price
                        </p>
                      </div>
                    </div>

                    {p.note && (
                      <p
                        className="text-xs mt-2.5 pt-2.5 border-t"
                        style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-divider)" }}
                      >
                        {p.note}
                      </p>
                    )}

                    <div className="flex justify-end gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => setPriceForm(p)}
                        aria-label="Edit price"
                        className="h-7 w-7 rounded-lg flex items-center justify-center"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePrice(p)}
                        disabled={deleting}
                        aria-label="Remove price"
                        className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-50"
                        style={{ color: "var(--color-error)" }}
                      >
                        {deleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {priceForm && (
        <SupplierPriceFormDialog
          supplierId={supplier.supplier_id}
          editing={priceForm === "new" ? undefined : priceForm}
          existingVariantIds={prices?.map((p) => p.variant_id) ?? []}
          onClose={() => setPriceForm(null)}
        />
      )}
    </>
  );
}
