"use client";

import React, { useState } from "react";
import { ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import { Dialog, TextField, apiMessage } from "@/app/(components)/crud";
import {
  useAddVariantImageMutation,
  useCreateVariantMutation,
  useDeleteVariantImageMutation,
  useSetPrimaryVariantImageMutation,
  useUpdateVariantMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type {
  ProductResponse,
  ProductVariantResponse,
} from "@/state/types/inventory";

/** One row of the free-form `specs` JSON, e.g. { size: "A4" }. */
type SpecRow = { key: string; value: string };

const specsToRows = (specs: Record<string, unknown> | undefined): SpecRow[] =>
  Object.entries(specs ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));

const rowsToSpecs = (rows: SpecRow[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const { key, value } of rows) {
    const k = key.trim();
    if (!k) continue;
    out[k] = value.trim();
  }
  return out;
};

export default function VariantDialog({
  product,
  variant,
  onClose,
}: {
  product: ProductResponse;
  /** Absent when adding a new variant. */
  variant?: ProductVariantResponse | null;
  onClose: () => void;
}) {
  const editing = Boolean(variant);

  const [createVariant, { isLoading: creating }] = useCreateVariantMutation();
  const [updateVariant, { isLoading: updating }] = useUpdateVariantMutation();
  const [addImage, { isLoading: uploading }] = useAddVariantImageMutation();
  const [setPrimary] = useSetPrimaryVariantImageMutation();
  const [removeImage] = useDeleteVariantImageMutation();

  const [sku, setSku] = useState(variant?.sku ?? "");
  const [price, setPrice] = useState(
    variant?.price != null ? String(variant.price) : ""
  );
  const [stock, setStock] = useState(
    variant?.stock_quantity != null ? String(variant.stock_quantity) : "0"
  );
  const [rows, setRows] = useState<SpecRow[]>(() => {
    const existing = specsToRows(variant?.specs);
    return existing.length ? existing : [{ key: "", value: "" }];
  });
  const [error, setError] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<SpecRow>) =>
    setRows((prev) => prev.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Price must be a number of 0 or more.");
      return;
    }
    const stockNum = Number(stock);
    if (!variant && (!Number.isInteger(stockNum) || stockNum < 0)) {
      setError("Opening stock must be a whole number of 0 or more.");
      return;
    }

    const body = {
      sku: sku.trim() || null,
      specs: rowsToSpecs(rows),
      price: priceNum,
    };

    try {
      if (variant) {
        // stock_quantity is deliberately omitted — only movements move stock.
        await updateVariant({
          productId: product.product_id,
          variantId: variant.variant_id,
          body,
        }).unwrap();
      } else {
        await createVariant({
          productId: product.product_id,
          body: { ...body, stock_quantity: stockNum },
        }).unwrap();
      }
      onClose();
    } catch (err) {
      setError(apiMessage(err, "Could not save this variant."));
    }
  };

  const upload = async (file: File | null) => {
    if (!file || !variant) return;
    setError(null);
    try {
      await addImage({
        productId: product.product_id,
        variantId: variant.variant_id,
        image: file,
        // The first image uploaded becomes the one shown on the variant.
        is_primary: variant.images.length === 0,
      }).unwrap();
    } catch (err) {
      setError(apiMessage(err, "Could not upload that image."));
    }
  };

  return (
    <Dialog
      title={
        editing
          ? `Edit variant — ${variant?.sku || `#${variant?.variant_id}`}`
          : `Add variant to ${product.name}`
      }
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={editing ? "Save variant" : "Create variant"}
      saving={creating || updating}
      error={error}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextField
          label="SKU"
          value={sku}
          placeholder="IK120-01"
          onChange={setSku}
        />
        <TextField
          label="Price"
          value={price}
          inputMode="decimal"
          placeholder="0.00"
          onChange={setPrice}
        />
        {editing ? (
          // Stock is only ever changed by recording a movement, so that the
          // stock report and the on-hand number can never disagree.
          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Stock on hand
            </label>
            <div
              className="rounded-xl border px-3 py-2.5 text-sm"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              {variant?.stock_quantity ?? 0}
            </div>
          </div>
        ) : (
          <TextField
            label="Opening stock"
            value={stock}
            inputMode="numeric"
            onChange={setStock}
          />
        )}
      </div>

      {editing && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Stock changes through movements only — use Add stock in or Add stock
          out so the change is counted in the stock report.
        </p>
      )}

      {/* specs — free-form JSON on the model, edited as key/value pairs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Specs
          </span>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { key: "", value: "" }])}
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--color-blurple)" }}
          >
            <Plus className="h-3 w-3" />
            Add row
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={row.key}
                onChange={(e) => setRow(i, { key: e.target.value })}
                placeholder="size"
                className="flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
              <input
                value={row.value}
                onChange={(e) => setRow(i, { value: e.target.value })}
                placeholder="A4"
                className="flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((_, n) => n !== i))}
                aria-label="Remove spec"
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
          Rows with an empty name are dropped. Saving replaces the whole spec set.
        </p>
      </div>

      {/* images — only once the variant exists, the routes need its id */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Images
          </span>
          {editing && (
            <label
              className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
              style={{ color: "var(--color-blurple)" }}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => upload(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        {!editing ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Images can be added once the variant exists — the upload route needs
            its id.
          </p>
        ) : !variant?.images.length ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            No images on this variant yet.
          </p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {variant.images.map((img) => (
              <div key={img.images_id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                  style={{
                    outline: img.is_primary
                      ? "2px solid var(--color-blurple)"
                      : "none",
                  }}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  {!img.is_primary && (
                    <button
                      type="button"
                      aria-label="Set primary"
                      onClick={() =>
                        setPrimary({
                          productId: product.product_id,
                          variantId: variant.variant_id,
                          imageId: img.images_id,
                        })
                      }
                      className="h-6 w-6 flex items-center justify-center"
                      style={{ color: "#FFF" }}
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Delete image"
                    onClick={() =>
                      removeImage({
                        productId: product.product_id,
                        variantId: variant.variant_id,
                        imageId: img.images_id,
                      })
                    }
                    className="h-6 w-6 flex items-center justify-center"
                    style={{ color: "#FCA5A5" }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
