"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Mail, Pencil, Phone, Trash2, Wallet } from "lucide-react";
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
  money,
} from "@/app/(components)/crud";
import {
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
} from "@/state/tageTypes/services/inventoryApi";
import type { CustomerResponse } from "@/state/types/inventory";

const EMPTY = { name: "", email: "", phone: "" };

export default function CustomersPage() {
  const { data: customers, isLoading, error: loadError } = useGetCustomersQuery();
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: deleting }] = useDeleteCustomerMutation();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalSpend = useMemo(
    () => (customers ?? []).reduce((sum, c) => sum + Number(c.total_purchase ?? 0), 0),
    [customers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setAvatar(null);
    setError(null);
    setOpen(true);
  };

  const openEdit = (c: CustomerResponse) => {
    setEditing(c);
    setForm({ name: c.name ?? "", email: c.email ?? "", phone: c.phone ?? "" });
    setAvatar(null);
    setError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // The API enforces min_length=2 on name for create.
    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    try {
      if (editing) {
        await updateCustomer({
          id: editing.customer_id,
          data: { ...form, avatar },
        }).unwrap();
      } else {
        await createCustomer({ ...form, avatar }).unwrap();
      }
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, "Could not save this customer."));
    }
  };

  const onDelete = async (c: CustomerResponse) => {
    if (!window.confirm(`Delete customer “${c.name}”?`)) return;
    setPageError(null);
    try {
      await deleteCustomer(c.customer_id).unwrap();
    } catch (err) {
      // DELETE is require_manager while the rest of this module is
      // require_login, so a normal user hits 403 only on this action.
      setPageError(apiMessage(err, "Could not delete this customer."));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Customers"
        subtitle={`${customers?.length ?? 0} customers · ${money(totalSpend)} lifetime`}
        actionLabel="Add customer"
        onAction={openCreate}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search name, email, phone..."
      />

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}

      {loadError ? (
        <EmptyState message={apiMessage(loadError, "Could not load customers.")} />
      ) : isLoading ? (
        <EmptyState message="Loading customers..." />
      ) : !filtered.length ? (
        <EmptyState
          message={search ? "No customers match that search." : "No customers yet."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.customer_id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                  style={{
                    background: c.avatar_url
                      ? "var(--color-surface-elevated)"
                      : "var(--gradient-brand)",
                  }}
                >
                  {c.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--color-on-accent)" }}
                    >
                      {initialsOf(c.name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {c.name}
                  </p>
                  <span
                    className="text-xs inline-flex items-center gap-1.5 mt-0.5"
                    style={{ color: "var(--color-success)" }}
                  >
                    <Wallet className="h-3 w-3" />
                    {money(c.total_purchase)}
                  </span>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Edit ${c.name}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c)}
                    disabled={deleting}
                    aria-label={`Delete ${c.name}`}
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
                {c.email && (
                  <span
                    className="text-xs inline-flex items-center gap-2 truncate"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {c.email}
                  </span>
                )}
                {c.phone && (
                  <span
                    className="text-xs inline-flex items-center gap-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    {c.phone}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Dialog
          title={editing ? `Edit ${editing.name}` : "Add customer"}
          onClose={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel={editing ? "Save changes" : "Create customer"}
          saving={creating || updating}
          error={error}
        >
          <ImagePicker
            currentUrl={editing?.avatar_url}
            file={avatar}
            onPick={setAvatar}
            fallback={initialsOf(form.name || "?")}
          />
          <TextField label="Name" value={form.name} onChange={set("name")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
            />
            <TextField label="Phone" value={form.phone} onChange={set("phone")} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
