"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Moon,
  Pencil,
  RotateCcw,
  Settings2,
  Sun,
  Trash2,
} from "lucide-react";
import {
  Card,
  CrudHeader,
  Dialog,
  EmptyState,
  SearchBar,
  TextAreaField,
  TextField,
  apiMessage,
} from "@/app/(components)/crud";
import { useConfirm } from "@/app/(components)/crud/confirm";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setDarkMode } from "@/state";
import {
  useBulkUpdateSystemSettingsMutation,
  useCreateSystemSettingMutation,
  useDeleteSystemSettingMutation,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
} from "@/state/tageTypes/services/systemSettingsApi";
import type { SystemSettingResponse } from "@/state/types/settings";

const humanise = (key: string) =>
  key
    .replace(/[_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

export default function SettingsPage() {
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const {
    data: settings,
    isLoading,
    error: loadError,
  } = useGetSystemSettingsQuery();

  const [bulkUpdate, { isLoading: saving }] = useBulkUpdateSystemSettingsMutation();
  const [createSetting, { isLoading: creating }] = useCreateSystemSettingMutation();
  const [updateSetting, { isLoading: updating }] = useUpdateSystemSettingMutation();
  const [deleteSetting] = useDeleteSystemSettingMutation();

  const [search, setSearch] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  /** Edited values keyed by setting key — only these are sent on save. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Any row the server changed underneath us drops out of the draft set, so a
  // refetch never silently resurrects a stale edit.
  useEffect(() => {
    if (!settings) return;
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const s of settings) {
        const draft = prev[s.key];
        if (draft !== undefined && draft !== s.value) next[s.key] = draft;
      }
      return next;
    });
  }, [settings]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", description: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const [editing, setEditing] = useState<SystemSettingResponse | null>(null);
  const [editDescription, setEditDescription] = useState("");

  const rows = useMemo(() => {
    const list = settings ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) =>
      [s.key, s.value, s.description]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q))
    );
  }, [settings, search]);

  const dirtyKeys = Object.keys(drafts);

  const onSaveAll = async () => {
    if (!dirtyKeys.length) return;
    setPageError(null);
    setSavedNote(null);
    try {
      // One request for every edited row — the bulk route upserts by key.
      const res = await bulkUpdate({
        settings: dirtyKeys.map((key) => ({ key, value: drafts[key] })),
      }).unwrap();
      setDrafts({});
      setSavedNote(res.message ?? `${dirtyKeys.length} settings updated.`);
    } catch (err) {
      setPageError(apiMessage(err, "Could not save these settings."));
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const key = form.key.trim();
    if (key.length < 2) {
      setFormError("Key must be at least 2 characters.");
      return;
    }
    if (/\s/.test(key)) {
      setFormError("Keys cannot contain spaces — use dots or underscores.");
      return;
    }
    try {
      await createSetting({
        key,
        value: form.value,
        description: form.description.trim() || null,
      }).unwrap();
      setCreateOpen(false);
      setForm({ key: "", value: "", description: "" });
    } catch (err) {
      // 409 when the key already exists for this company.
      setFormError(apiMessage(err, "Could not create this setting."));
    }
  };

  const onSaveDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    try {
      await updateSetting({
        settingId: editing.setting_id,
        body: { description: editDescription.trim() },
      }).unwrap();
      setEditing(null);
    } catch (err) {
      setFormError(apiMessage(err, "Could not update this setting."));
    }
  };

  const onDelete = async (s: SystemSettingResponse) => {
    const ok = await confirm({
      title: `Delete ${s.key}`,
      message:
        "Anything reading this key falls back to its built-in default once it is gone.",
      confirmLabel: "Delete setting",
    });
    if (!ok) return;
    setPageError(null);
    try {
      await deleteSetting(s.setting_id).unwrap();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[s.key];
        return next;
      });
    } catch (err) {
      setPageError(apiMessage(err, "Could not delete this setting."));
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <CrudHeader
        title="Settings"
        subtitle={`${settings?.length ?? 0} system setting${settings?.length === 1 ? "" : "s"}`}
        actionLabel="Add setting"
        onAction={() => {
          setFormError(null);
          setCreateOpen(true);
        }}
      />

      {/* ── APPEARANCE (local, not server-backed) ── */}
      <Card className="p-4">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          Appearance
        </p>
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--color-info-tint)" }}
          >
            {isDarkMode ? (
              <Moon className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
            ) : (
              <Sun className="h-4 w-4" style={{ color: "var(--color-blurple)" }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Dark mode
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Stored on this device only — it is not a company setting.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Dark mode"
            onClick={() => dispatch(setDarkMode(!isDarkMode))}
            className="relative h-6 w-11 rounded-full transition-colors shrink-0"
            style={{
              background: isDarkMode
                ? "var(--color-blurple)"
                : "var(--color-divider)",
            }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
              style={{
                left: isDarkMode ? "1.375rem" : "0.125rem",
                background: "var(--color-on-accent)",
              }}
            />
          </button>
        </div>
      </Card>

      {/* ── SYSTEM SETTINGS ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-muted)" }}
        >
          System settings
        </p>
        {dirtyKeys.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrafts({})}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={onSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{
                background: "var(--color-blurple)",
                color: "var(--color-on-accent)",
              }}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save {dirtyKeys.length} change{dirtyKeys.length === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search key, value or description..."
      />

      {pageError && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          {pageError}
        </p>
      )}
      {savedNote && !dirtyKeys.length && (
        <p className="text-xs" style={{ color: "var(--color-success)" }}>
          {savedNote}
        </p>
      )}

      <Card className="overflow-hidden">
        {loadError ? (
          <EmptyState
            message={apiMessage(
              loadError,
              "Could not load system settings — these routes are admin-only."
            )}
          />
        ) : isLoading ? (
          <EmptyState message="Loading settings..." />
        ) : !rows.length ? (
          <EmptyState
            message={search ? "No settings match that search." : "No system settings yet."}
          />
        ) : (
          rows.map((s) => {
            const draft = drafts[s.key];
            const dirty = draft !== undefined;
            return (
              <div
                key={s.setting_id}
                className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0"
                style={{
                  borderColor: "var(--color-divider)",
                  background: dirty ? "var(--color-info-tint)" : undefined,
                }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "var(--color-divider)" }}
                >
                  <Settings2
                    className="h-4 w-4"
                    style={{ color: "var(--color-text-secondary)" }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {humanise(s.key)}
                  </p>
                  <p
                    className="text-[11px] font-mono truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {s.key}
                  </p>
                  {s.description && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="w-48 sm:w-64 shrink-0">
                  <input
                    value={draft ?? s.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSavedNote(null);
                      setDrafts((prev) => {
                        const next = { ...prev };
                        // Typing back to the saved value clears the dirty flag.
                        if (v === s.value) delete next[s.key];
                        else next[s.key] = v;
                        return next;
                      });
                    }}
                    aria-label={`${s.key} value`}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--color-surface-card)",
                      borderColor: dirty
                        ? "var(--color-blurple)"
                        : "var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  {dirty && (
                    <p
                      className="text-[11px] mt-1 truncate"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      was {s.value || "—"}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setEditDescription(s.description ?? "");
                      setEditing(s);
                    }}
                    aria-label={`Edit ${s.key} description`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s)}
                    aria-label={`Delete ${s.key}`}
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--color-error)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {settings && settings.length > 0 && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Edit any value then save — every changed row goes in a single bulk
          request, and a key that no longer exists is recreated rather than
          erroring.
        </p>
      )}

      {createOpen && (
        <Dialog
          title="Add setting"
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreate}
          submitLabel="Create setting"
          saving={creating}
          error={formError}
        >
          <TextField
            label="Key"
            value={form.key}
            placeholder="invoice.tax_rate"
            onChange={(v) => setForm((f) => ({ ...f, key: v }))}
          />
          <TextField
            label="Value"
            value={form.value}
            onChange={(v) => setForm((f) => ({ ...f, value: v }))}
          />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Keys are unique per company and values are stored as text — cast
            them wherever they are read.
          </p>
        </Dialog>
      )}

      {editing && (
        <Dialog
          title={editing.key}
          onClose={() => setEditing(null)}
          onSubmit={onSaveDescription}
          submitLabel="Save description"
          saving={updating}
          error={formError}
        >
          <TextAreaField
            label="Description"
            value={editDescription}
            onChange={setEditDescription}
          />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            The value is edited inline on the list. A description cannot be
            cleared back to empty once set — the server skips empty fields.
          </p>
        </Dialog>
      )}
    </div>
  );
}
