"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Package, Pencil, Shapes, Trash2 } from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  ImagePicker,
  SearchBar,
  TextField,
  apiMessage,
} from "@/app/(components)/crud";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useGetProductsQuery,
  useUpdateCategoryMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type { CategoryResponse } from "@/state/types/inventory";

export default function CategoriesPage() {
  const { data: categories, isLoading, error: loadError } = useGetCategoriesQuery();
  const { data: products } = useGetProductsQuery();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] = useDeleteCategoryMutation();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!categories) return [];
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.category_name.toLowerCase().includes(q));
  }, [categories, search]);

  /** Product counts come from /products, since categories don't carry them. */
  const countFor = (categoryId: number) =>
    (products ?? []).filter((p) => p.category_id === categoryId).length;

  const openCreate = () => {
    setEditing(null);
    setName("");
    setImage(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (c: CategoryResponse) => {
    setEditing(c);
    setName(c.category_name);
    setImage(null);
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Category name must be at least 2 characters.");
      return;
    }
    try {
      if (editing) {
        await updateCategory({
          id: editing.category_id,
          category_name: name.trim(),
          image,
        }).unwrap();
      } else {
        await createCategory({ category_name: name.trim(), image }).unwrap();
      }
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Could not save this category."));
    }
  };

  const onDelete = async (c: CategoryResponse) => {
    const count = countFor(c.category_id);
    const warning = count
      ? `“${c.category_name}” still has ${count} product${count === 1 ? "" : "s"}. Delete anyway?`
      : `Delete category “${c.category_name}”?`;
    if (!window.confirm(warning)) return;
    setPageError(null);
    try {
      await deleteCategory(c.category_id).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this category."));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Categories"
        subtitle={`${categories?.length ?? 0} product groups`}
        actionLabel="Add category"
        onAction={openCreate}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search categories..." />

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {loadError ? (
        <EmptyState message={apiMessage(loadError, "Could not load categories.")} />
      ) : isLoading ? (
        <EmptyState message="Loading categories..." />
      ) : !filtered.length ? (
        <EmptyState
          message={search ? "No categories match that search." : "No categories yet."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <Card key={c.category_id} className="overflow-hidden flex flex-col">
              <div
                className="h-28 flex items-center justify-center"
                style={{ background: "var(--color-surface-elevated)" }}
              >
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Shapes
                    className="h-8 w-8"
                    style={{ color: "var(--color-text-muted)" }}
                  />
                )}
              </div>

              <div className="p-4 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {c.category_name}
                  </p>
                  <span
                    className="text-xs inline-flex items-center gap-1.5 mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Package className="h-3 w-3" />
                    {countFor(c.category_id)} products
                  </span>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Edit ${c.category_name}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c)}
                    disabled={deleting}
                    aria-label={`Delete ${c.category_name}`}
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
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Dialog
          title={editing ? `Edit ${editing.category_name}` : "Add category"}
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel={editing ? "Save changes" : "Create category"}
          saving={creating || updating}
          error={error}
        >
          <ImagePicker
            label="Category image"
            rounded="xl"
            currentUrl={editing?.image_url}
            file={image}
            onPick={setImage}
            fallback={name.slice(0, 2).toUpperCase() || "?"}
          />
          <TextField label="Category name" value={name} onChange={setName} />
          {/* category_total is deliberately not editable: the PATCH route only
              reads category_name and image, so any value sent is discarded. */}
        </Dialog>
      )}
    </div>
  );
}
