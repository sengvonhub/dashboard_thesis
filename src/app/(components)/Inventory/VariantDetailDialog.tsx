"use client";

import React, { useEffect, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { EmptyState, money } from "@/app/(components)/crud";
import { useGetStockMovementsQuery } from "@/state/tageTypes/services/inventoryApi";
import type {
  ProductResponse,
  ProductVariantResponse,
} from "@/state/types/inventory";

/** Movement types the API treats as leaving stock. */
const OUTWARD = ["stock_out", "sale", "return_out", "damage"];

/**
 * One variant's full stock ledger. Stock in and stock out are recorded as
 * movements against a variant, so this is where they are listed — fetched with
 * `variant_id`, which the list route filters on server-side.
 */
export default function VariantDetailDialog({
  product,
  variant,
  onClose,
  onMovement,
  onDeleteMovement,
  deleting,
}: {
  product: ProductResponse;
  variant: ProductVariantResponse;
  onClose: () => void;
  onMovement: (direction: "in" | "out") => void;
  onDeleteMovement: (movementId: number) => void;
  deleting?: boolean;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const args = useMemo(
    () => ({ variantId: variant.variant_id }),
    [variant.variant_id]
  );
  const { data: movements, isLoading } = useGetStockMovementsQuery(args);

  const rows = useMemo(
    () =>
      [...(movements ?? [])].sort(
        (a, b) => String(b.date).localeCompare(String(a.date)) ||
          b.movement_id - a.movement_id
      ),
    [movements]
  );

  const totals = useMemo(() => {
    let inQty = 0;
    let outQty = 0;
    let inValue = 0;
    let outValue = 0;
    for (const m of movements ?? []) {
      const price = m.unit_price != null ? Number(m.unit_price) : Number(variant.price ?? 0);
      inQty += m.qty_in ?? 0;
      outQty += m.qty_out ?? 0;
      inValue += (m.qty_in ?? 0) * price;
      outValue += (m.qty_out ?? 0) * price;
    }
    return { inQty, outQty, inValue, outValue, net: inQty - outQty };
  }, [movements, variant.price]);

  const cover = variant.images.find((i) => i.is_primary) ?? variant.images[0];
  const specs = Object.entries(variant.specs ?? {});

  // z-137 sits above the product detail (z-135) and below the shared Dialog
  // (z-140), so the movement dialog opened from here lands on top.
  return (
    <div
      className="fixed inset-0 z-[137] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${product.name} — ${variant.sku || variant.variant_id}`}
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          className="flex items-start gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: "var(--color-surface-card)" }}
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Tag className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {variant.sku || `Variant #${variant.variant_id}`}
            </h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>
              {product.name} · {money(variant.price)} each ·{" "}
              {variant.stock_quantity} on hand
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
        {/* Block layout, not flex: as a flex column the bordered movement list
            (which is overflow-hidden) would shrink to fit and clip its rows
            instead of overflowing, leaving nothing to scroll. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specs.map(([k, val]) => (
                <span
                  key={k}
                  className="text-[11px] px-2 py-0.5 rounded-md"
                  style={{
                    background: "var(--color-surface-card)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {k}: {String(val)}
                </span>
              ))}
            </div>
          )}

          {/* in / out totals for this variant */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-xl font-bold leading-none"
                style={{ color: "var(--color-success)" }}
              >
                {totals.inQty}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Total in · {money(totals.inValue)}
              </p>
            </div>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-xl font-bold leading-none"
                style={{ color: "var(--color-error)" }}
              >
                {totals.outQty}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Total out · {money(totals.outValue)}
              </p>
            </div>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-xl font-bold leading-none"
                style={{ color: "var(--color-text-primary)" }}
              >
                {variant.stock_quantity}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                On hand · net {totals.net > 0 ? `+${totals.net}` : totals.net}
              </p>
            </div>
          </div>

          {/* add movements */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onMovement("in")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold"
              style={{
                background: "var(--color-success-tint)",
                color: "var(--color-success)",
              }}
            >
              <Plus className="h-4 w-4" />
              Add stock in
            </button>
            <button
              type="button"
              onClick={() => onMovement("out")}
              disabled={variant.stock_quantity <= 0}
              title={
                variant.stock_quantity <= 0 ? "Nothing in stock to move out" : undefined
              }
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{
                background: "var(--color-error-tint)",
                color: "var(--color-error)",
              }}
            >
              <Plus className="h-4 w-4" />
              Add stock out
            </button>
          </div>

          {/* the ledger */}
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Stock movements ({rows.length})
          </p>

          {isLoading ? (
            <EmptyState message="Loading movements..." />
          ) : !rows.length ? (
            <EmptyState message="No stock has moved for this variant yet." />
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--color-border)" }}
            >
              {rows.map((m) => {
                // qty_in/qty_out is the source of truth; the type only labels it.
                const inward =
                  (m.qty_in ?? 0) > 0 ||
                  ((m.qty_out ?? 0) === 0 && !OUTWARD.includes(m.movement_type));
                const qty = inward ? m.qty_in ?? 0 : m.qty_out ?? 0;
                return (
                  <div
                    key={m.movement_id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0"
                    style={{ borderColor: "var(--color-divider)" }}
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: inward
                          ? "var(--color-success-tint)"
                          : "var(--color-error-tint)",
                      }}
                    >
                      {inward ? (
                        <ArrowDownLeft
                          className="h-4 w-4"
                          style={{ color: "var(--color-success)" }}
                        />
                      ) : (
                        <ArrowUpRight
                          className="h-4 w-4"
                          style={{ color: "var(--color-error)" }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium capitalize"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {m.movement_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {String(m.date).slice(0, 10)}
                        {m.unit_price != null ? ` · ${money(m.unit_price)}` : ""}
                        {m.reference_id != null ? ` · ref #${m.reference_id}` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: inward
                            ? "var(--color-success)"
                            : "var(--color-error)",
                        }}
                      >
                        {inward ? `+${qty}` : `−${qty}`}
                      </p>
                      {m.balance_quantity != null && (
                        <p
                          className="text-[11px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          bal {m.balance_quantity}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteMovement(m.movement_id)}
                      disabled={deleting}
                      aria-label="Delete movement"
                      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                      style={{ color: "var(--color-error)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
