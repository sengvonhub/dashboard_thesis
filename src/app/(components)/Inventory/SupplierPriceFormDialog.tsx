"use client";

import React, { useEffect, useState } from "react";
import { Dialog, SelectField, TextAreaField, TextField, apiMessage } from "@/app/(components)/crud";
import {
  useCreateSupplierPriceMutation,
  useGetProductsQuery,
  useUpdateSupplierPriceMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type { SupplierProductPriceResponse } from "@/state/types/inventory";

function specsLabel(specs: Record<string, unknown> | undefined): string {
  const entries = Object.entries(specs ?? {});
  if (!entries.length) return "";
  return ` (${entries.map(([k, v]) => `${k}: ${v}`).join(", ")})`;
}

/**
 * Add/edit one supplier-price row. `POST /supplier-prices/` 409s if a price
 * for this supplier+variant pair already exists, so already-priced variants
 * are hidden from the picker on create.
 *
 * Edit only changes unit_price/note — supplier_id/variant_id are fixed once
 * created (SupplierProductPriceUpdate has no fields for them).
 */
export default function SupplierPriceFormDialog({
  supplierId,
  editing,
  existingVariantIds,
  onClose,
}: {
  supplierId: number;
  editing?: SupplierProductPriceResponse;
  existingVariantIds: number[];
  onClose: () => void;
}) {
  const isEdit = !!editing;
  const { data: products } = useGetProductsQuery();
  const [createPrice, { isLoading: creating }] = useCreateSupplierPriceMutation();
  const [updatePrice, { isLoading: updating }] = useUpdateSupplierPriceMutation();

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [unitPrice, setUnitPrice] = useState(editing ? String(editing.unit_price) : "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  // Pre-select which product owns the variant being edited, purely for
  // context — the pickers themselves are hidden in edit mode.
  useEffect(() => {
    if (!editing || !products) return;
    const owner = products.find((p) =>
      p.variants.some((v) => v.variant_id === editing.variant_id)
    );
    if (owner) setProductId(String(owner.product_id));
  }, [editing, products]);

  const productOptions = (products ?? []).map((p) => ({
    value: String(p.product_id),
    label: p.name,
  }));

  const selectedProduct = products?.find((p) => String(p.product_id) === productId);
  const variantOptions = (selectedProduct?.variants ?? [])
    .filter((v) => !existingVariantIds.includes(v.variant_id))
    .map((v) => ({
      value: String(v.variant_id),
      label: v.sku ? `${v.sku}${specsLabel(v.specs)}` : `Variant #${v.variant_id}`,
    }));

  const isValid = isEdit
    ? unitPrice.trim() !== "" && !Number.isNaN(Number(unitPrice))
    : variantId !== "" && unitPrice.trim() !== "" && !Number.isNaN(Number(unitPrice));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValid) {
      setError(isEdit ? "Enter a price." : "Pick a product variant and enter a price.");
      return;
    }
    try {
      if (isEdit) {
        await updatePrice({
          priceId: editing!.price_id,
          data: { unit_price: Number(unitPrice), note: note.trim() || null },
        }).unwrap();
      } else {
        await createPrice({
          supplier_id: supplierId,
          variant_id: Number(variantId),
          unit_price: Number(unitPrice),
          note: note.trim() || null,
        }).unwrap();
      }
      onClose();
    } catch (err) {
      setError(apiMessage(err, "Could not save this price."));
    }
  };

  return (
    <Dialog
      title={isEdit ? "Edit supplier price" : "Add supplier price"}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save changes" : "Add price"}
      saving={creating || updating}
      error={error}
    >
      {isEdit ? (
        <div className="flex flex-col gap-1.5">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}
          >
            Product
          </span>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            {editing!.variant.product.name}
            {editing!.variant.sku ? ` (${editing!.variant.sku})` : ""}
          </p>
        </div>
      ) : (
        <>
          <SelectField
            label="Product"
            value={productId}
            onChange={(v) => {
              setProductId(v);
              setVariantId("");
            }}
            options={productOptions}
            placeholder="Select a product"
          />
          <SelectField
            label="Variant"
            value={variantId}
            onChange={setVariantId}
            options={variantOptions}
            placeholder={
              !productId
                ? "Pick a product first"
                : variantOptions.length
                  ? "Select a variant"
                  : "All variants already priced"
            }
          />
        </>
      )}

      <TextField
        label="Unit price"
        type="number"
        inputMode="decimal"
        value={unitPrice}
        onChange={setUnitPrice}
        placeholder="0.00"
      />

      <TextAreaField
        label="Note (optional)"
        value={note}
        onChange={setNote}
      />
    </Dialog>
  );
}
