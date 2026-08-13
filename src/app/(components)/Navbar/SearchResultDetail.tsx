"use client";

import React, { useEffect } from "react";
import { Mail, MapPin, Package, Phone, User, X } from "lucide-react";
import type { StaffResponse } from "@/state/types/user";
import type { ProductResponse } from "@/state/types/inventory";

export type SearchDetailTarget =
  | { kind: "staff"; item: StaffResponse }
  | { kind: "product"; item: ProductResponse };

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 flex items-start gap-3 px-5 py-4 border-b"
          style={{
            borderColor: "var(--color-divider)",
            background: "var(--color-surface-elevated)",
          }}
        >
          <div className="min-w-0 flex-1">
            <h2
              className="text-base font-semibold leading-snug truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "var(--color-divider)" }}
      >
        <Icon className="h-4 w-4" style={{ color: "var(--color-text-secondary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </p>
        <p className="text-sm truncate" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StaffDetail({ item, onClose }: { item: StaffResponse; onClose: () => void }) {
  return (
    <Shell
      title={item.name}
      subtitle={item.staff_role?.role_name ?? "Staff"}
      onClose={onClose}
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          style={{
            background: item.avatar_url
              ? "var(--color-surface-card)"
              : "var(--gradient-brand)",
          }}
        >
          {item.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.avatar_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-lg font-bold"
              style={{ color: "var(--color-on-accent)" }}
            >
              {initialsOf(item.name)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.staff_role?.role_name && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--color-info)",
                  background: "var(--color-info-tint)",
                }}
              >
                {item.staff_role.role_name}
              </span>
            )}
            {item.staff_role?.is_manager && (
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--color-success)",
                  background: "var(--color-success-tint)",
                }}
              >
                Manager
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border divide-y"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="px-3">
          <InfoRow icon={Mail} label="Email" value={item.email} />
        </div>
        <div className="px-3" style={{ borderColor: "var(--color-divider)" }}>
          <InfoRow icon={Phone} label="Phone" value={item.phone} />
        </div>
        <div className="px-3" style={{ borderColor: "var(--color-divider)" }}>
          <InfoRow icon={MapPin} label="Address" value={item.address} />
        </div>
        <div className="px-3" style={{ borderColor: "var(--color-divider)" }}>
          <InfoRow
            icon={User}
            label="Details"
            value={
              [
                item.gender,
                item.age != null ? `${item.age} yrs` : null,
                item.date_of_birth ? item.date_of_birth.slice(0, 10) : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
        </div>
      </div>
    </Shell>
  );
}

function ProductDetail({
  item,
  onClose,
}: {
  item: ProductResponse;
  onClose: () => void;
}) {
  const primary =
    item.images.find((i) => i.is_primary) ?? item.images[0] ?? null;

  const totalStock = item.variants.reduce(
    (sum, v) => sum + (v.stock_quantity ?? 0),
    0
  );

  return (
    <Shell
      title={item.name}
      subtitle={`${item.variants.length} variant${
        item.variants.length === 1 ? "" : "s"
      } · ${totalStock} in stock`}
      onClose={onClose}
    >
      <div className="flex gap-4 mb-4">
        <div
          className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: "var(--color-surface-card)" }}
        >
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="h-7 w-7" style={{ color: "var(--color-text-muted)" }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {item.descriptions ? (
            <p
              className="text-sm whitespace-pre-wrap break-words"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {item.descriptions}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>
              No description
            </p>
          )}
        </div>
      </div>

      <p
        className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{ color: "var(--color-text-muted)" }}
      >
        Variants
      </p>

      {item.variants.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          This product has no variants yet.
        </p>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          {item.variants.map((v) => (
            <div
              key={v.variant_id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {v.sku || `Variant #${v.variant_id}`}
                </p>
                {Object.keys(v.specs ?? {}).length > 0 && (
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {Object.entries(v.specs)
                      .map(([k, val]) => `${k}: ${String(val)}`)
                      .join(" · ")}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {v.price}
                </p>
                <p
                  className="text-xs"
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
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

export default function SearchResultDetail({
  target,
  onClose,
}: {
  target: SearchDetailTarget;
  onClose: () => void;
}) {
  return target.kind === "staff" ? (
    <StaffDetail item={target.item} onClose={onClose} />
  ) : (
    <ProductDetail item={target.item} onClose={onClose} />
  );
}
