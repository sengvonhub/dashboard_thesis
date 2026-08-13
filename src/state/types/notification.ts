/** Mirrors NotificationTypeEnum in app/schemas/schema.py. */
export type NotificationType = "info" | "warning" | "error" | "success" | "chat";

export interface NotificationResponse {
  notification_id: number;
  user_id?: number | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  reference_id?: number | null;
  reference_type?: string | null;
  reference_status?: string | null;
  created_at: string;
}

export interface NotificationCreate {
  user_id?: number | null;
  title: string;
  message: string;
  type?: NotificationType;
  is_read?: boolean;
  reference_id?: number | null;
  reference_type?: string | null;
}

/** GET /notifications/my/summary */
export interface NotificationSummaryResponse {
  total: number;
  unread: number;
  read: number;
}

export interface BulkMarkReadRequest {
  notification_ids: number[];
}

// ── WebSocket events ─────────────────────────────────────
// ws://<host>/ws/notifications?token=<access_token>
// Note the socket is mounted at the app root, NOT under /api/v1.

/** Sent once on connect, carrying the unread counts. */
export interface WsConnectedEvent {
  event: "connected";
  user_id: number;
  unread: number;
  total: number;
}

/** Pushed by the server when a notification is created. */
export interface WsNewNotificationEvent {
  event: "new_notification";
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  reference_id?: number | null;
  reference_type?: string | null;
  created_at: string;
}

/** Broadcast when someone in the company connects or disconnects. */
export interface WsPresenceEvent {
  type: "presence_count";
  count: number;
}

export interface WsPongEvent {
  type: "pong";
}

export type NotificationSocketEvent =
  | WsConnectedEvent
  | WsNewNotificationEvent
  | WsPresenceEvent
  | WsPongEvent;
