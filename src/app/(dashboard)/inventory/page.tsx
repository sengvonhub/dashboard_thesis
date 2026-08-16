"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  BarChart3,
  Layers,
  Loader2,
  Package,
  Pencil,
  Plus,
  Star,
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
import { useConfirm } from "@/app/(components)/crud/confirm";
import ProductDetailDialog from "@/app/(components)/Inventory/ProductDetailDialog";
import StockReport from "@/app/(components)/Inventory/StockReport";
import VariantDetailDialog from "@/app/(components)/Inventory/VariantDetailDialog";
import VariantDialog from "@/app/(components)/Inventory/VariantDialog";
import {
  useAddProductImageMutation,
  useDeleteVariantMutation,
  useCreateProductMutation,
  useCreateStockMovementMutation,
  useDeleteProductImageMutation,
  useDeleteProductMutation,
  useDeleteStockMovementMutation,
  useGetCategoriesQuery,
  useGetProductsQuery,
  useGetStockMovementsQuery,
  useSetPrimaryProductImageMutation,
  useUpdateProductMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type {
  MovementType,
  ProductResponse,
  ProductVariantResponse,
} from "@/state/types/inventory";

type Tab = "products" | "movements" | "report";

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: "stock_in", label: "Stock in" },
  { value: "stock_out", label: "Stock out" },
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "adjustment", label: "Adjustment" },
  { value: "return_in", label: "Return in" },
  { value: "return_out", label: "Return out" },
  { value: "transfer", label: "Transfer" },
  { value: "damage", label: "Damage" },
  { value: "opening", label: "Opening" },
];

export default function InventoryPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  const { data: products, isLoading, error: loadError } = useGetProductsQuery();
  const { data: categories } = useGetCategoriesQuery();
  const { data: movements, isLoading: movementsLoading } = useGetStockMovementsQuery(
    undefined,
    { skip: tab !== "movements" }
  );

  const [createProduct, { isLoading: creating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [addImage] = useAddProductImageMutation();
  const [setPrimary] = useSetPrimaryProductImageMutation();
  const [removeImage] = useDeleteProductImageMutation();
  const [createMovement, { isLoading: movementSaving }] =
    useCreateStockMovementMutation();
  const [deleteMovement, { isLoading: movementDeleting }] =
    useDeleteStockMovementMutation();
  const [deleteVariant, { isLoading: variantDeleting }] =
    useDeleteVariantMutation();

  /**
   * Which product/variant the variant dialog is open for, held as ids so the
   * dialog re-reads live data after an image upload invalidates the products
   * query — a stored object would stay a stale snapshot.
   */
  const [variantTarget, setVariantTarget] = useState<{
    productId: number;
    variantId: number | null;
  } | null>(null);

  /** Product whose detail sheet is open — also held by id, for the same reason. */
  const [detailProductId, setDetailProductId] = useState<number | null>(null);

  /** Variant whose stock ledger is open. */
  const [ledgerVariant, setLedgerVariant] = useState<{
    productId: number;
    variantId: number;
  } | null>(null);

  // ── product dialog ─────────────────────────────────────
  const [productOpen, setProductOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [form, setForm] = useState({ name: "", descriptions: "", category_id: "" });
  const [formError, setFormError] = useState<string | null>(null);

  // ── movement dialog ────────────────────────────────────
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    product_id: "",
    variant_id: "",
    movement_type: "stock_in" as MovementType,
    qty: "",
    unit_price: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [movementError, setMovementError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        [p.name, p.descriptions, ...p.variants.map((v) => v.sku)]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q));
      const matchesCategory =
        !categoryFilter || String(p.category_id ?? "") === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const totals = useMemo(() => {
    const all = products ?? [];
    const units = all.reduce(
      (n, p) => n + p.variants.reduce((m, v) => m + (v.stock_quantity ?? 0), 0),
      0
    );
    const value = all.reduce(
      (n, p) =>
        n +
        p.variants.reduce(
          (m, v) => m + Number(v.price ?? 0) * (v.stock_quantity ?? 0),
          0
        ),
      0
    );
    return { units, value, variants: all.reduce((n, p) => n + p.variants.length, 0) };
  }, [products]);

  /** Flat variant list, for the movement dialog's variant picker. */
  const variantsOf = (productId: string): ProductVariantResponse[] =>
    products?.find((p) => String(p.product_id) === productId)?.variants ?? [];

  /**
   * variant_id → its product and SKU. Movements only carry `variant_id`, so
   * this is what turns "Variant #12" into "120 IK (IK120-01)".
   */
  const variantIndex = useMemo(() => {
    const m = new Map<
      number,
      { product: string; sku: string; productId: number }
    >();
    for (const p of products ?? []) {
      for (const v of p.variants) {
        m.set(v.variant_id, {
          product: p.name,
          sku: v.sku || `#${v.variant_id}`,
          productId: p.product_id,
        });
      }
    }
    return m;
  }, [products]);

  const variantProduct = variantTarget
    ? products?.find((p) => p.product_id === variantTarget.productId)
    : undefined;
  const variantEditing =
    variantProduct && variantTarget?.variantId != null
      ? variantProduct.variants.find(
          (v) => v.variant_id === variantTarget.variantId
        )
      : null;

  const detailProduct = detailProductId
    ? products?.find((p) => p.product_id === detailProductId)
    : undefined;

  const ledgerProduct = ledgerVariant
    ? products?.find((p) => p.product_id === ledgerVariant.productId)
    : undefined;
  const ledgerTarget = ledgerProduct?.variants.find(
    (v) => v.variant_id === ledgerVariant?.variantId
  );

  /**
   * Opens the movement dialog already pointed at one variant, so recording
   * stock in/out from a variant skips re-picking the product and variant.
   */
  const openMovementFor = (
    productId: number,
    v: ProductVariantResponse,
    direction: "in" | "out"
  ) => {
    setMovementError(null);
    setMovementForm({
      product_id: String(productId),
      variant_id: String(v.variant_id),
      movement_type: direction === "in" ? "stock_in" : "stock_out",
      qty: "",
      unit_price: v.price != null ? String(v.price) : "",
      date: new Date().toISOString().slice(0, 10),
    });
    setMovementOpen(true);
  };

  const onDeleteVariant = async (
    product: ProductResponse,
    v: ProductVariantResponse
  ) => {
    const ok = await confirm({
      title: "Delete variant",
      message: `${v.sku || `#${v.variant_id}`} will be removed from “${product.name}”, along with its stock history.`,
      confirmLabel: "Delete variant",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await deleteVariant({
        productId: product.product_id,
        variantId: v.variant_id,
      }).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this variant."));
    }
  };

  const onDeleteMovement = async (movementId: number) => {
    const ok = await confirm({
      title: "Delete movement",
      message:
        "The stock this movement added or removed is reversed on the variant.",
      confirmLabel: "Delete movement",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await deleteMovement(movementId).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this movement."));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", descriptions: "", category_id: "" });
    setFormError(null);
    setProductOpen(true);
  };

  const openEdit = (p: ProductResponse) => {
    setEditing(p);
    setForm({
      name: p.name,
      descriptions: p.descriptions ?? "",
      category_id: p.category_id != null ? String(p.category_id) : "",
    });
    setFormError(null);
    setProductOpen(true);
  };

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.name.trim().length < 2) {
      setFormError("Product name must be at least 2 characters.");
      return;
    }
    const body = {
      name: form.name.trim(),
      descriptions: form.descriptions.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
    };
    try {
      if (editing) {
        await updateProduct({ id: editing.product_id, body }).unwrap();
      } else {
        await createProduct(body).unwrap();
      }
      setProductOpen(false);
    } catch (err) {
      setFormError(apiMessage(err, "Could not save this product."));
    }
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setMovementError(null);
    const qty = Number(movementForm.qty);
    if (!movementForm.product_id || !movementForm.variant_id) {
      setMovementError("Pick a product and a variant.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setMovementError("Quantity must be a positive number.");
      return;
    }
    // The API takes separate qty_in / qty_out rather than a signed quantity.
    const outward = ["stock_out", "sale", "return_out", "damage"].includes(
      movementForm.movement_type
    );
    try {
      await createMovement({
        product_id: Number(movementForm.product_id),
        variant_id: Number(movementForm.variant_id),
        movement_type: movementForm.movement_type,
        qty_in: outward ? 0 : qty,
        qty_out: outward ? qty : 0,
        date: movementForm.date,
        unit_price: movementForm.unit_price ? Number(movementForm.unit_price) : null,
      }).unwrap();
      setMovementOpen(false);
    } catch (err) {
      // 400 when the movement would drive stock negative.
      setMovementError(apiMessage(err, "Could not record this movement."));
    }
  };

  const onDeleteProduct = async (p: ProductResponse) => {
    const ok = await confirm({
      title: `Delete ${p.name}`,
      message: "The product, its variants and all its images will be removed.",
      confirmLabel: "Delete product",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await deleteProduct(p.product_id).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this product."));
    }
  };

  const uploadImage = async (productId: number, file: File | null) => {
    if (!file) return;
    setPageError(null);
    try {
      await addImage({ productId, image: file }).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not upload that image."));
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "products", label: "Products", icon: Package },
    { id: "movements", label: "Stock movements", icon: Layers },
    { id: "report", label: "Stock report", icon: BarChart3 },
  ];

  // The report is read-only, so it gets no header action.
  const headerAction =
    tab === "products"
      ? { label: "Add product", run: openCreate }
      : tab === "movements"
        ? {
            label: "Record movement",
            // Clear any prefill left by a variant's stock-in/out shortcut.
            run: () => {
              setMovementError(null);
              setMovementForm({
                product_id: "",
                variant_id: "",
                movement_type: "stock_in",
                qty: "",
                unit_price: "",
                date: new Date().toISOString().slice(0, 10),
              });
              setMovementOpen(true);
            },
          }
        : null;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Inventory"
        subtitle={`${products?.length ?? 0} products · ${totals.variants} variants · ${totals.units} units · ${money(totals.value)} value`}
        actionLabel={headerAction?.label}
        onAction={headerAction?.run}
      />

      <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-divider)" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-2 px-3 py-2.5"
              style={{
                color: active ? "var(--color-blurple)" : "var(--color-text-secondary)",
                borderBottom: active
                  ? "2px solid var(--color-blurple)"
                  : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {/* ── PRODUCTS ── */}
      {tab === "products" && (
        <>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search products or SKUs..."
            trailing={
              categories && categories.length > 0 ? (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={{
                    background: "var(--color-surface-card)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              ) : null
            }
          />

          {loadError ? (
            <EmptyState message={apiMessage(loadError, "Could not load products.")} />
          ) : isLoading ? (
            <EmptyState message="Loading products..." />
          ) : !filtered.length ? (
            <EmptyState
              message={
                search || categoryFilter
                  ? "No products match that filter."
                  : "No products yet."
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((p) => {
                const primary = p.images.find((i) => i.is_primary) ?? p.images[0];
                const stock = p.variants.reduce(
                  (n, v) => n + (v.stock_quantity ?? 0),
                  0
                );
                const category = categories?.find(
                  (c) => c.category_id === p.category_id
                );
                return (
                  <Card key={p.product_id} className="p-4">
                    <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                      <div
                        className="h-20 w-20 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-surface-elevated)" }}
                      >
                        {primary ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={primary.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Boxes
                            className="h-7 w-7"
                            style={{ color: "var(--color-text-muted)" }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailProductId(p.product_id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p
                              className="text-sm font-semibold truncate"
                              style={{ color: "var(--color-blurple)" }}
                            >
                              {p.name}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {[
                                category?.category_name,
                                `${p.variants.length} variant${p.variants.length === 1 ? "" : "s"}`,
                                `${stock} in stock`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </button>

                          <div className="flex gap-1 shrink-0">
                            <label
                              className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer"
                              style={{ color: "var(--color-text-muted)" }}
                              title="Add image"
                            >
                              <Package className="h-3.5 w-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  uploadImage(p.product_id, e.target.files?.[0] ?? null)
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              aria-label={`Edit ${p.name}`}
                              className="h-8 w-8 rounded-lg flex items-center justify-center"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(p)}
                              disabled={deleting}
                              aria-label={`Delete ${p.name}`}
                              className="h-8 w-8 rounded-lg flex items-center justify-center disabled:opacity-50"
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

                        {/* variants */}
                        <div
                          className="mt-3 rounded-xl border overflow-hidden"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          {p.variants.map((v) => {
                            const cover =
                              v.images.find((i) => i.is_primary) ?? v.images[0];
                            return (
                              <div
                                key={v.variant_id}
                                className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0"
                                style={{ borderColor: "var(--color-divider)" }}
                              >
                                {cover && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={cover.image_url}
                                    alt=""
                                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLedgerVariant({
                                      productId: p.product_id,
                                      variantId: v.variant_id,
                                    })
                                  }
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p
                                    className="text-xs font-medium truncate"
                                    style={{ color: "var(--color-blurple)" }}
                                  >
                                    {v.sku || `Variant #${v.variant_id}`}
                                  </p>
                                  {Object.keys(v.specs ?? {}).length > 0 && (
                                    <p
                                      className="text-[11px] truncate"
                                      style={{ color: "var(--color-text-muted)" }}
                                    >
                                      {Object.entries(v.specs)
                                        .map(([k, val]) => `${k}: ${String(val)}`)
                                        .join(" · ")}
                                    </p>
                                  )}
                                </button>
                                <div className="text-right shrink-0">
                                  <p
                                    className="text-xs font-semibold"
                                    style={{ color: "var(--color-text-primary)" }}
                                  >
                                    {money(v.price)}
                                  </p>
                                  <p
                                    className="text-[11px]"
                                    style={{
                                      color:
                                        v.stock_quantity > 0
                                          ? "var(--color-success)"
                                          : "var(--color-error)",
                                    }}
                                  >
                                    {v.stock_quantity} in stock
                                  </p>
                                </div>
                                <div className="flex gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setVariantTarget({
                                        productId: p.product_id,
                                        variantId: v.variant_id,
                                      })
                                    }
                                    aria-label={`Edit variant ${v.sku || v.variant_id}`}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center"
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteVariant(p, v)}
                                    disabled={variantDeleting}
                                    aria-label={`Delete variant ${v.sku || v.variant_id}`}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-50"
                                    style={{ color: "var(--color-error)" }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() =>
                              setVariantTarget({
                                productId: p.product_id,
                                variantId: null,
                              })
                            }
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold"
                            style={{ color: "var(--color-blurple)" }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {p.variants.length ? "Add variant" : "Add the first variant"}
                          </button>
                        </div>

                        {/* image strip */}
                        {p.images.length > 0 && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {p.images.map((img) => (
                              <div key={img.images_id} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.image_url}
                                  alt=""
                                  className="h-12 w-12 rounded-lg object-cover"
                                  style={{
                                    outline: img.is_primary
                                      ? "2px solid var(--color-blurple)"
                                      : "none",
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" style={{ background: "rgba(0,0,0,0.55)" }}>
                                  {!img.is_primary && (
                                    <button
                                      type="button"
                                      aria-label="Set primary"
                                      onClick={() =>
                                        setPrimary({
                                          productId: p.product_id,
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
                                        productId: p.product_id,
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
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── STOCK REPORT ── */}
      {tab === "report" && <StockReport categories={categories} />}

      {/* ── MOVEMENTS ── */}
      {tab === "movements" && (
        <>
        {movements && movements.length > 0 && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {movements.length} record{movements.length === 1 ? "" : "s"}
          </p>
        )}
        <Card className="overflow-hidden">
          {movementsLoading ? (
            <EmptyState message="Loading movements..." />
          ) : !movements?.length ? (
            <EmptyState message="No stock movements recorded." />
          ) : (
            movements.map((m) => {
              const inward = m.qty_in > 0;
              const variant = variantIndex.get(m.variant_id);
              return (
                <div
                  key={m.movement_id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
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

                  <button
                    type="button"
                    onClick={() =>
                      variant && setDetailProductId(variant.productId)
                    }
                    disabled={!variant}
                    className="min-w-0 flex-1 text-left disabled:cursor-default"
                  >
                    <p
                      className="text-sm font-semibold truncate"
                      style={{
                        color: variant
                          ? "var(--color-blurple)"
                          : "var(--color-text-primary)",
                      }}
                    >
                      {variant
                        ? `${variant.product} (${variant.sku})`
                        : `Variant #${m.variant_id}`}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {m.movement_type.replace(/_/g, " ")} ·{" "}
                      {String(m.date).slice(0, 10)}
                      {m.unit_price != null ? ` · ${money(m.unit_price)}` : ""}
                    </p>
                  </button>

                  <div className="text-right shrink-0">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: inward
                          ? "var(--color-success)"
                          : "var(--color-error)",
                      }}
                    >
                      {inward ? `+${m.qty_in}` : `−${m.qty_out}`}
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
                    disabled={movementDeleting}
                    aria-label="Delete movement"
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    style={{ color: "var(--color-error)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </Card>
        </>
      )}

      {/* product dialog */}
      {productOpen && (
        <Dialog
          title={editing ? `Edit ${editing.name}` : "Add product"}
          onClose={() => setProductOpen(false)}
          onSubmit={submitProduct}
          submitLabel={editing ? "Save changes" : "Create product"}
          saving={creating || updating}
          error={formError}
        >
          <TextField
            label="Product name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <SelectField
            label="Category"
            value={form.category_id}
            placeholder="— none —"
            onChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
            options={(categories ?? []).map((c) => ({
              value: String(c.category_id),
              label: c.category_name,
            }))}
          />
          <TextAreaField
            label="Description"
            value={form.descriptions}
            onChange={(v) => setForm((f) => ({ ...f, descriptions: v }))}
          />
          {!editing && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Images and variants are added after the product exists — the create
              route takes JSON only.
            </p>
          )}
        </Dialog>
      )}

      {/* product detail */}
      {detailProduct && (
        <ProductDetailDialog
          product={detailProduct}
          categories={categories}
          onClose={() => setDetailProductId(null)}
          onAddVariant={() =>
            setVariantTarget({
              productId: detailProduct.product_id,
              variantId: null,
            })
          }
          onEditVariant={(v) =>
            setVariantTarget({
              productId: detailProduct.product_id,
              variantId: v.variant_id,
            })
          }
          onDeleteVariant={(v) => onDeleteVariant(detailProduct, v)}
          onMovement={(v, direction) =>
            openMovementFor(detailProduct.product_id, v, direction)
          }
          onOpenVariant={(v) =>
            setLedgerVariant({
              productId: detailProduct.product_id,
              variantId: v.variant_id,
            })
          }
        />
      )}

      {/* variant stock ledger */}
      {ledgerProduct && ledgerTarget && (
        <VariantDetailDialog
          product={ledgerProduct}
          variant={ledgerTarget}
          deleting={movementDeleting}
          onClose={() => setLedgerVariant(null)}
          onMovement={(direction) =>
            openMovementFor(ledgerProduct.product_id, ledgerTarget, direction)
          }
          onDeleteMovement={onDeleteMovement}
        />
      )}

      {/* variant dialog */}
      {variantProduct && (
        <VariantDialog
          product={variantProduct}
          variant={variantEditing}
          onClose={() => setVariantTarget(null)}
        />
      )}

      {/* movement dialog */}
      {movementOpen && (
        <Dialog
          title="Record stock movement"
          onClose={() => setMovementOpen(false)}
          onSubmit={submitMovement}
          submitLabel="Record movement"
          saving={movementSaving}
          error={movementError}
        >
          <SelectField
            label="Product"
            value={movementForm.product_id}
            placeholder="— pick a product —"
            onChange={(v) =>
              setMovementForm((f) => ({ ...f, product_id: v, variant_id: "" }))
            }
            options={(products ?? []).map((p) => ({
              value: String(p.product_id),
              label: p.name,
            }))}
          />
          <SelectField
            label="Variant"
            value={movementForm.variant_id}
            placeholder="— pick a variant —"
            onChange={(v) => setMovementForm((f) => ({ ...f, variant_id: v }))}
            options={variantsOf(movementForm.product_id).map((v) => ({
              value: String(v.variant_id),
              label: `${v.sku || `#${v.variant_id}`} — ${v.stock_quantity} in stock`,
            }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Movement type"
              value={movementForm.movement_type}
              placeholder=""
              onChange={(v) =>
                setMovementForm((f) => ({ ...f, movement_type: v as MovementType }))
              }
              options={MOVEMENT_TYPES}
            />
            <TextField
              label="Quantity"
              value={movementForm.qty}
              inputMode="numeric"
              onChange={(v) => setMovementForm((f) => ({ ...f, qty: v }))}
            />
            <TextField
              label="Unit price (optional)"
              value={movementForm.unit_price}
              inputMode="decimal"
              placeholder="defaults to variant price"
              onChange={(v) => setMovementForm((f) => ({ ...f, unit_price: v }))}
            />
            <TextField
              label="Date"
              type="date"
              value={movementForm.date}
              onChange={(v) => setMovementForm((f) => ({ ...f, date: v }))}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
