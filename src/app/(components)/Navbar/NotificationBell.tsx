"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleAlert,
  Info,
  MessageSquare,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import {
  useGetMyNotificationsQuery,
  useGetMyNotificationSummaryQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} from "@/state/tageTypes/services/notificationsApi";
import type {
  NotificationResponse,
  NotificationType,
} from "@/state/types/notification";
import NotificationDetail from "./NotificationDetail";

const TYPE_STYLE: Record<
  NotificationType,
  { icon: React.ElementType; color: string; tint: string }
> = {
  info: { icon: Info, color: "var(--color-info)", tint: "var(--color-info-tint)" },
  success: {
    icon: CheckCircle2,
    color: "var(--color-success)",
    tint: "var(--color-success-tint)",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--color-warning)",
    tint: "var(--color-warning-tint)",
  },
  error: {
    icon: CircleAlert,
    color: "var(--color-error)",
    tint: "var(--color-error-tint)",
  },
  chat: {
    icon: MessageSquare,
    color: "var(--color-blurple)",
    tint: "var(--color-info-tint)",
  },
};

/** "3m ago", "2h ago", "5d ago" */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Row({
  item,
  onOpen,
  onDelete,
}: {
  item: NotificationResponse;
  onOpen: (item: NotificationResponse) => void;
  onDelete: (id: number) => void;
}) {
  const style = TYPE_STYLE[item.type] ?? TYPE_STYLE.info;
  const Icon = style.icon;

  return (
    <div
      className="group relative flex gap-3 px-4 py-3 border-b transition-colors cursor-pointer"
      style={{
        borderColor: "var(--color-divider)",
        background: item.is_read ? "transparent" : "var(--color-info-tint)",
      }}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: style.tint }}
      >
        <Icon className="h-4 w-4" style={{ color: style.color }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: "var(--color-text-primary)" }}
          >
            {item.title}
          </p>
          {!item.is_read && (
            <span
              className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: "var(--color-blurple)" }}
            />
          )}
        </div>
        <p
          className="text-xs mt-0.5 line-clamp-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {item.message}
        </p>
        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          {timeAgo(item.created_at)}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.notification_id);
        }}
        aria-label="Delete notification"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-7 w-7 rounded-md flex items-center justify-center shrink-0 self-start"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Hoisted to module scope on purpose. Passing an object literal inline gives
 * RTK Query a new arg reference on every render, which churns the subscription
 * and leaves the hook reporting isLoading even after the fetch has fulfilled.
 */
const LIST_ARGS = { unreadOnly: false } as const;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationResponse | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: summary } = useGetMyNotificationSummaryQuery();
  // Fetched up front rather than on open. `/notifications/my` returns the
  // whole list unpaginated, it is needed the moment the panel opens, and
  // gating it behind `open` meant every first open showed a spinner. It also
  // gives the socket's `new_notification` handler a live cache entry to
  // prepend into — with no entry, pushes only moved the badge.
  const { data: items, isLoading } = useGetMyNotificationsQuery(LIST_ARGS);

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();
  const [remove] = useDeleteNotificationMutation();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const unread = summary?.unread ?? 0;

  // Opening a notification is also what marks it read — the dropdown closes so
  // the dialog is not stacked on top of it.
  const openDetail = (item: NotificationResponse) => {
    setSelected(item);
    setOpen(false);
    if (!item.is_read) markRead(item.notification_id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex items-center justify-center"
      >
        <Bell
          className="cursor-pointer"
          size={22}
          style={{ color: "var(--color-text-secondary)" }}
        />
        {unread > 0 && (
          <span
            className="absolute -top-2 -right-2 inline-flex items-center justify-center px-[0.4rem] py-1 text-[10px] font-semibold leading-none rounded-full"
            style={{
              background: "var(--color-error)",
              color: "var(--color-on-error)",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border overflow-hidden z-50"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "0 12px 32px -12px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Notifications
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>

            {unread > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                style={{ color: "var(--color-blurple)" }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {isLoading && (
              <p
                className="px-4 py-8 text-sm text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                Loading...
              </p>
            )}

            {!isLoading && items && items.length === 0 && (
              <div className="px-4 py-10 flex flex-col items-center gap-2">
                <Bell className="h-6 w-6" style={{ color: "var(--color-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No notifications yet
                </p>
              </div>
            )}

            {items?.map((n) => (
              <Row
                key={n.notification_id}
                item={n}
                onOpen={openDetail}
                onDelete={(id) => remove(id)}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <NotificationDetail
          // Re-read from the list so the dialog reflects the mark-as-read that
          // happens on open, rather than the snapshot taken at click time.
          item={
            items?.find(
              (n) => n.notification_id === selected.notification_id
            ) ?? selected
          }
          onClose={() => setSelected(null)}
          onDelete={(id) => remove(id)}
        />
      )}
    </div>
  );
}
