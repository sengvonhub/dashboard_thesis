"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Info,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import type {
  NotificationResponse,
  NotificationType,
} from "@/state/types/notification";

const TYPE_STYLE: Record<
  NotificationType,
  { icon: React.ElementType; color: string; tint: string; label: string }
> = {
  info: { icon: Info, color: "var(--color-info)", tint: "var(--color-info-tint)", label: "Info" },
  success: { icon: CheckCircle2, color: "var(--color-success)", tint: "var(--color-success-tint)", label: "Success" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)", tint: "var(--color-warning-tint)", label: "Warning" },
  error: { icon: CircleAlert, color: "var(--color-error)", tint: "var(--color-error-tint)", label: "Error" },
  chat: { icon: MessageSquare, color: "var(--color-blurple)", tint: "var(--color-info-tint)", label: "Message" },
};

/**
 * Maps `reference_type` to the module route that shows the referenced record.
 *
 * The API stores `reference_type` as a free-text String(50) and nothing
 * constrains its values, so this is a best-effort lookup built from the values
 * seen in the services (`leave_request`, `invoice`, `inventory`). An unmapped
 * type simply hides the "Open" action rather than linking somewhere wrong —
 * add entries here as the backend starts emitting new ones.
 */
const REFERENCE_ROUTES: Record<string, { href: string; label: string }> = {
  leave_request: { href: "/leave", label: "Leave" },
  leave: { href: "/leave", label: "Leave" },
  invoice: { href: "/invoices", label: "Invoices" },
  quotation: { href: "/quotations", label: "Quotations" },
  inventory: { href: "/inventory", label: "Inventory" },
  product: { href: "/inventory", label: "Inventory" },
  category: { href: "/categories", label: "Categories" },
  customer: { href: "/customers", label: "Customers" },
  supplier: { href: "/suppliers", label: "Suppliers" },
  staff: { href: "/hr", label: "HR / Staff" },
  user: { href: "/hr", label: "HR / Staff" },
  attendance: { href: "/attendance", label: "Attendance" },
  salary: { href: "/payroll", label: "Payroll" },
  payroll: { href: "/payroll", label: "Payroll" },
};

export default function NotificationDetail({
  item,
  onClose,
  onDelete,
}: {
  item: NotificationResponse;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const router = useRouter();
  const style = TYPE_STYLE[item.type] ?? TYPE_STYLE.info;
  const Icon = style.icon;

  const ref = item.reference_type
    ? REFERENCE_ROUTES[item.reference_type.toLowerCase()]
    : undefined;

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    // Stop the page behind the dialog from scrolling.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const created = new Date(item.created_at);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "var(--color-scrim)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface-elevated)",
          borderColor: "var(--color-border)",
          boxShadow: "0 24px 64px -24px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          className="flex items-start gap-3 px-5 pt-5 pb-4 border-b"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: style.tint }}
          >
            <Icon className="h-5 w-5" style={{ color: style.color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: style.color, background: style.tint }}
              >
                {style.label}
              </span>
              {!item.is_read && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color: "var(--color-blurple)",
                    background: "var(--color-info-tint)",
                  }}
                >
                  Unread
                </span>
              )}
              {item.reference_status && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color: "var(--color-text-secondary)",
                    background: "var(--color-divider)",
                  }}
                >
                  {item.reference_status}
                </span>
              )}
            </div>
            <h2
              className="mt-2 text-base font-semibold leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {item.title}
            </h2>
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

        {/* body — full message, not the 2-line clamp used in the list */}
        <div className="px-5 py-4">
          <p
            className="text-sm whitespace-pre-wrap break-words"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {item.message}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Received
              </dt>
              <dd className="text-xs mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                {Number.isNaN(created.getTime())
                  ? "—"
                  : created.toLocaleString()}
              </dd>
            </div>

            {item.reference_type && (
              <div>
                <dt
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Reference
                </dt>
                <dd className="text-xs mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                  {item.reference_type}
                  {item.reference_id != null ? ` #${item.reference_id}` : ""}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* actions */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 border-t"
          style={{ borderColor: "var(--color-divider)" }}
        >
          <button
            onClick={() => {
              onDelete(item.notification_id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "var(--color-error)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

          {ref ? (
            <button
              onClick={() => {
                onClose();
                router.push(ref.href);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--color-blurple)",
                color: "var(--color-on-accent)",
              }}
            >
              Open {ref.label}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold border"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
