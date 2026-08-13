"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/app/redux";
import { useAuth } from "@/state/tageTypes/lib/hook";
import { notificationsApi } from "@/state/tageTypes/services/notificationsApi";
import type {
  NotificationResponse,
  NotificationSocketEvent,
} from "@/state/types/notification";

/**
 * Derive the WebSocket URL from the REST base URL.
 *
 * The socket is registered on the app root (`/ws/notifications`) while the REST
 * routes sit under `/api/v1`, so the path is dropped and only the origin kept.
 * http -> ws, https -> wss.
 */
function resolveSocketUrl(token: string): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return null;
  try {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/notifications";
    url.search = `?token=${encodeURIComponent(token)}`;
    return url.toString();
  } catch {
    return null;
  }
}

const PING_INTERVAL_MS = 25_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export interface NotificationSocketState {
  isConnected: boolean;
  /** From the server's `presence_count` broadcast. */
  onlineCount: number | null;
  lastEvent: NotificationSocketEvent | null;
}

/**
 * Live notification socket.
 *
 * Mount ONCE, high in the tree (the dashboard layout) — every mount opens
 * another connection, and the server keeps a set of sockets per user rather
 * than replacing them, so duplicates stay open and each event arrives N times.
 *
 * Incoming `new_notification` events are written straight into the RTK Query
 * cache, so the bell badge and any open list update without a refetch.
 */
export function useNotificationSocket(): NotificationSocketState {
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<NotificationSocketEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  // Set on unmount so a scheduled reconnect doesn't resurrect a dead socket.
  const closedByUsRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const url = resolveSocketUrl(accessToken);
    if (!url) return;

    closedByUsRef.current = false;

    const clearTimers = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      pingRef.current = null;
      reconnectRef.current = null;
    };

    const connect = () => {
      if (closedByUsRef.current) return;

      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setIsConnected(true);
        // The server replies { type: "pong" }; this keeps proxies from
        // dropping an idle connection.
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (raw) => {
        let data: NotificationSocketEvent;
        try {
          data = JSON.parse(raw.data);
        } catch {
          return;
        }
        setLastEvent(data);

        if ("type" in data && data.type === "presence_count") {
          setOnlineCount(data.count);
          return;
        }

        if ("event" in data && data.event === "connected") {
          // Trust the socket's counts over a possibly stale cached summary.
          dispatch(
            notificationsApi.util.upsertQueryData(
              "getMyNotificationSummary",
              undefined,
              {
                total: data.total,
                unread: data.unread,
                read: Math.max(data.total - data.unread, 0),
              }
            )
          );
          return;
        }

        if ("event" in data && data.event === "new_notification") {
          const incoming: NotificationResponse = {
            notification_id: data.notification_id,
            user_id: data.user_id,
            title: data.title,
            message: data.message,
            type: data.type,
            is_read: data.is_read,
            reference_id: data.reference_id ?? null,
            reference_type: data.reference_type ?? null,
            reference_status: null,
            created_at: data.created_at,
          };

          dispatch(
            notificationsApi.util.updateQueryData(
              "getMyNotifications",
              { unreadOnly: false },
              (draft) => {
                // Redis can redeliver; don't insert the same id twice.
                if (
                  !draft.some(
                    (n) => n.notification_id === incoming.notification_id
                  )
                ) {
                  draft.unshift(incoming);
                }
              }
            )
          );

          dispatch(
            notificationsApi.util.updateQueryData(
              "getMyNotificationSummary",
              undefined,
              (draft) => {
                draft.total += 1;
                if (!incoming.is_read) draft.unread += 1;
              }
            )
          );
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearTimers();
        if (closedByUsRef.current) return;
        // Exponential backoff, capped — the server closes with 4001 on a bad
        // or expired token, and hammering it would not help.
        const delay = Math.min(
          1000 * 2 ** attemptsRef.current,
          MAX_RECONNECT_DELAY_MS
        );
        attemptsRef.current += 1;
        reconnectRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByUsRef.current = true;
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, accessToken, dispatch]);

  return { isConnected, onlineCount, lastEvent };
}
