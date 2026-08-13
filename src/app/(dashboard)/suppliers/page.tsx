"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Mail, MapPin, Pencil, Phone, Trash2, User } from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  ImagePicker,
  SearchBar,
  TextField,
  apiMessage,
  initialsOf,
} from "@/app/(components)/crud";
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type { SupplierResponse } from "@/state/types/inventory";

const EMPTY = {
  name: "",
  contact_person: "",
  phone: "",
  phone2: "",
  email: "",
  address: "",
};

export default function SuppliersPage() {
  const { data: suppliers, isLoading, error: loadError } = useGetSuppliersQuery();
  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: deleting }] = useDeleteSupplierMutation();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SupplierResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.contact_person, s.email, s.phone, s.phone2, s.address]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setAvatar(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (s: SupplierResponse) => {
    setEditing(s);
    setForm({
      name: s.name ?? "",
      contact_person: s.contact_person ?? "",
      phone: s.phone ?? "",
      phone2: s.phone2 ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
    });
    setAvatar(null);
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    try {
      if (editing) {
        await updateSupplier({
          id: editing.supplier_id,
          data: { ...form, avatar },
        }).unwrap();
      } else {
        await createSupplier({ ...form, avatar }).unwrap();
      }
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Could not save this supplier."));
    }
  };

  const onDelete = async (s: SupplierResponse) => {
    if (!window.confirm(`Delete supplier “${s.name}”?`)) return;
    setPageError(null);
    try {
      await deleteSupplier(s.supplier_id).unwrap();
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this supplier."));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Suppliers"
        subtitle={`${suppliers?.length ?? 0} vendors`}
        actionLabel="Add supplier"
        onAction={openCreate}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search name, contact, email, phone..."
      />

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {/* Every /suppliers route is require_manager, so a non-manager sees 403. */}
      {loadError ? (
        <EmptyState message={apiMessage(loadError, "Could not load suppliers.")} />
      ) : isLoading ? (
        <EmptyState message="Loading suppliers..." />
      ) : !filtered.length ? (
        <EmptyState
          message={search ? "No suppliers match that search." : "No suppliers yet."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.supplier_id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                  style={{
                    background: s.avatar_url
                      ? "var(--color-surface-elevated)"
                      : "var(--gradient-brand)",
                  }}
                >
                  {s.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--color-on-accent)" }}
                    >
                      {initialsOf(s.name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {s.name}
                  </p>
                  {s.contact_person && (
                    <p
                      className="text-xs truncate inline-flex items-center gap-1.5 mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <User className="h-3 w-3 shrink-0" />
                      {s.contact_person}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    aria-label={`Edit ${s.name}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    disabled={deleting}
                    aria-label={`Delete ${s.name}`}
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

              <div className="flex flex-col gap-1">
                {s.email && (
                  <span
                    className="text-xs inline-flex items-center gap-2 truncate"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {s.email}
                  </span>
                )}
                {(s.phone || s.phone2) && (
                  <span
                    className="text-xs inline-flex items-center gap-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    {[s.phone, s.phone2].filter(Boolean).join(" · ")}
                  </span>
                )}
                {s.address && (
                  <span
                    className="text-xs inline-flex items-center gap-2 truncate"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {s.address}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Dialog
          title={editing ? `Edit ${editing.name}` : "Add supplier"}
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel={editing ? "Save changes" : "Create supplier"}
          saving={creating || updating}
          error={error}
        >
          <ImagePicker
            label="Logo"
            currentUrl={editing?.avatar_url}
            file={avatar}
            onPick={setAvatar}
            fallback={initialsOf(form.name || "?")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Name" value={form.name} onChange={set("name")} />
            <TextField
              label="Contact person"
              value={form.contact_person}
              onChange={set("contact_person")}
            />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} />
            <TextField
              label="Alternate phone"
              value={form.phone2}
              onChange={set("phone2")}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
            <TextField label="Address" value={form.address} onChange={set("address")} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
