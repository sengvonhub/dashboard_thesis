"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, Search, X } from "lucide-react";

/** Turns an RTK Query error into something worth showing a user. */
export function apiMessage(err: unknown, fallback: string): string {
  const status = (err as { status?: number })?.status;
  const detail = (err as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (status === 403) return "Your role does not allow this.";
  if (status === 404) return "That record no longer exists.";
  if (status === 409) return "That value is already in use.";
  if (status === 422) return "The server rejected the form — check the fields.";
  return fallback;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Money-ish display for Decimal columns that arrive as strings. */
export function money(value: unknown): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── page chrome ──────────────────────────────────────────

export function CrudHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{
            background: "var(--color-blurple)",
            color: "var(--color-on-accent)",
          }}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  trailing,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm focus:outline-none"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
      {trailing}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p
      className="py-10 text-sm text-center"
      style={{ color: "var(--color-text-muted)" }}
    >
      {message}
    </p>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background: "var(--color-surface-card)",
        borderColor: "var(--color-border)",
      }}
    >
      {children}
    </div>
  );
}

// ── dialog ───────────────────────────────────────────────

export function Dialog({
  title,
  onClose,
  onSubmit,
  submitLabel = "Save",
  saving,
  error,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  saving?: boolean;
  error?: string | null;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${
          wide ? "max-w-3xl" : "max-w-lg"
        } max-h-[88vh] rounded-2xl border overflow-hidden flex flex-col`}
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <h2
            className="flex-1 text-base font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {children}
            {error && (
              <p className="text-xs" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            )}
          </div>

          <div
            className="shrink-0 px-5 py-4 border-t flex items-center justify-end gap-2"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold border"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--color-blurple)",
                color: "var(--color-on-accent)",
              }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── fields ───────────────────────────────────────────────

const fieldStyle = {
  background: "var(--color-surface)",
  borderColor: "var(--color-border)",
  color: "var(--color-text-primary)",
};

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
        style={fieldStyle}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "—",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
        style={fieldStyle}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none resize-none"
        style={fieldStyle}
      />
    </label>
  );
}

/** Circular avatar / square image picker with a live preview. */
export function ImagePicker({
  currentUrl,
  file,
  onPick,
  label = "Photo",
  rounded = "full",
  fallback,
}: {
  currentUrl?: string | null;
  file: File | null;
  onPick: (f: File | null) => void;
  label?: string;
  rounded?: "full" | "xl";
  fallback?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl ?? null;
  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <div
          className={`w-20 h-20 ${radius} overflow-hidden flex items-center justify-center`}
          style={{
            background: shown
              ? "var(--color-surface-card)"
              : "var(--gradient-brand)",
          }}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="w-full h-full object-cover" />
          ) : (
            <span
              className="text-lg font-bold"
              style={{ color: "var(--color-on-accent)" }}
            >
              {fallback ?? "?"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`Change ${label.toLowerCase()}`}
          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2"
          style={{
            background: "var(--color-blurple)",
            borderColor: "var(--color-surface-elevated)",
          }}
        >
          <Camera className="w-3.5 h-3.5" style={{ color: "var(--color-on-accent)" }} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        {file && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-warning)" }}>
            New image selected — save to upload.
          </p>
        )}
      </div>
    </div>
  );
}
