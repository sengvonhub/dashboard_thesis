"use client";

import React, { useEffect } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Layers,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { money } from "@/app/(components)/crud";
import { useGetStockMovementsQuery } from "@/state/tageTypes/services/inventoryApi";
import type {
  CategoryResponse,
  ProductResponse,
  ProductVariantResponse,
} from "@/state/types/inventory";

/**
 * Product detail — every variant of one product, each with its own stock-in /
 * stock-out shortcut so a movement can be recorded without re-picking the
 * product and variant in the generic movement dialog.
 */
export default function ProductDetailDialog({
  product,
  categories,
  onClose,
  onAddVariant,
  onEditVariant,
  onDeleteVariant,
  onMovement,
  onOpenVariant,
}: {
  product: ProductResponse;
  categories?: CategoryResponse[];
  onClose: () => void;
  onAddVariant: () => void;
  onEditVariant: (v: ProductVariantResponse) => void;
  onDeleteVariant: (v: ProductVariantResponse) => void;
  onMovement: (v: ProductVariantResponse, direction: "in" | "out") => void;
  /** Opens the variant's own stock ledger. */
  onOpenVariant: (v: ProductVariantResponse) => void;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  /**
   * Movements are fetched unfiltered and tallied per variant here — the list
   * route filters by a single `variant_id`, which would mean one request per
   * variant on a product that has several.
   */
  const { data: movements } = useGetStockMovementsQuery();

  const totalsByVariant = React.useMemo(() => {
    const m = new Map<number, { in: number; out: number; moves: number }>();
    for (const mv of movements ?? []) {
      const prev = m.get(mv.variant_id) ?? { in: 0, out: 0, moves: 0 };
      m.set(mv.variant_id, {
        in: prev.in + (mv.qty_in ?? 0),
        out: prev.out + (mv.qty_out ?? 0),
        moves: prev.moves + 1,
      });
    }
    return m;
  }, [movements]);

  const productTotals = product.variants.reduce(
    (acc, v) => {
      const t = totalsByVariant.get(v.variant_id);
      return {
        in: acc.in + (t?.in ?? 0),
        out: acc.out + (t?.out ?? 0),
      };
    },
    { in: 0, out: 0 }
  );

  const category = categories?.find((c) => c.category_id === product.category_id);
  const totalStock = product.variants.reduce(
    (n, v) => n + (v.stock_quantity ?? 0),
    0
  );
  const totalValue = product.variants.reduce(
    (n, v) => n + Number(v.price ?? 0) * (v.stock_quantity ?? 0),
    0
  );
  const cover =
    product.images.find((i) => i.is_primary) ?? product.images[0];

  // z-135 sits below the shared Dialog's z-140, so the variant and movement
  // dialogs opened from here stack on top and this stays visible behind them.
  return (
    <div
      className="fixed inset-0 z-[135] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
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
          className="flex items-start gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: "var(--color-surface-card)" }}
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Boxes className="h-5 w-5" style={{ color: "var(--color-text-muted)" }} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {product.name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {[
                category?.category_name,
                `${product.variants.length} variant${product.variants.length === 1 ? "" : "s"}`,
                `${totalStock} in stock`,
                `${money(totalValue)} value`,
              ]
                .filter(Boolean)
                .join(" · ")}
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
        {/* Block layout, not flex — see VariantDetailDialog: flex children
            shrink and clip rather than letting this container scroll. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {product.descriptions && (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {product.descriptions}
            </p>
          )}

          {/* totals across every movement ever recorded for this product */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-lg font-bold leading-none"
                style={{ color: "var(--color-success)" }}
              >
                {productTotals.in}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Total stock in
              </p>
            </div>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-lg font-bold leading-none"
                style={{ color: "var(--color-error)" }}
              >
                {productTotals.out}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Total stock out
              </p>
            </div>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p
                className="text-lg font-bold leading-none"
                style={{ color: "var(--color-text-primary)" }}
              >
                {totalStock}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                On hand now
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-1.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              <Layers className="h-3.5 w-3.5" />
              Variants
            </span>
            <button
              type="button"
              onClick={onAddVariant}
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--color-blurple)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add variant
            </button>
          </div>

          {!product.variants.length ? (
            <div
              className="rounded-xl border px-4 py-8 text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Tag
                className="h-6 w-6 mx-auto mb-2"
                style={{ color: "var(--color-text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                This product has no variants yet.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Stock is tracked per variant, so nothing can be moved in or out
                until one exists.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {product.variants.map((v) => {
                const vCover = v.images.find((i) => i.is_primary) ?? v.images[0];
                const specs = Object.entries(v.specs ?? {});
                const t = totalsByVariant.get(v.variant_id) ?? {
                  in: 0,
                  out: 0,
                  moves: 0,
                };
                return (
                  <div
                    key={v.variant_id}
                    className="rounded-xl border p-3"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-surface-card)" }}
                      >
                        {vCover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={vCover.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Tag
                            className="h-4 w-4"
                            style={{ color: "var(--color-text-muted)" }}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenVariant(v)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-blurple)" }}
                        >
                          {v.sku || `Variant #${v.variant_id}`}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {money(v.price)} each · tap for stock in/out
                        </p>
                      </button>

                      <div className="text-right shrink-0">
                        <p
                          className="text-lg font-bold leading-none"
                          style={{
                            color:
                              v.stock_quantity > 0
                                ? "var(--color-success)"
                                : "var(--color-error)",
                          }}
                        >
                          {v.stock_quantity}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          in stock
                        </p>
                      </div>
                    </div>

                    {specs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
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

                    {/* this variant's running totals across all movements */}
                    <div className="flex items-center gap-4 mt-2.5">
                      <span
                        className="text-xs inline-flex items-center gap-1"
                        style={{ color: "var(--color-success)" }}
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        {t.in} in
                      </span>
                      <span
                        className="text-xs inline-flex items-center gap-1"
                        style={{ color: "var(--color-error)" }}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {t.out} out
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {t.moves} movement{t.moves === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* per-variant actions */}
                    <div
                      className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t"
                      style={{ borderColor: "var(--color-divider)" }}
                    >
                      <button
                        type="button"
                        onClick={() => onMovement(v, "in")}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{
                          background: "var(--color-success-tint)",
                          color: "var(--color-success)",
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add stock in
                      </button>
                      <button
                        type="button"
                        onClick={() => onMovement(v, "out")}
                        disabled={v.stock_quantity <= 0}
                        title={
                          v.stock_quantity <= 0
                            ? "Nothing in stock to move out"
                            : undefined
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                        style={{
                          background: "var(--color-error-tint)",
                          color: "var(--color-error)",
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add stock out
                      </button>

                      <span className="flex-1" />

                      <button
                        type="button"
                        onClick={() => onEditVariant(v)}
                        aria-label={`Edit variant ${v.sku || v.variant_id}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVariant(v)}
                        aria-label={`Delete variant ${v.sku || v.variant_id}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ color: "var(--color-error)" }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
