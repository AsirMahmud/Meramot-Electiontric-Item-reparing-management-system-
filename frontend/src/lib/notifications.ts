export const NOTIFICATIONS_STORAGE_KEY = "meramot.notifications";
export const NOTIFICATIONS_CHANGED_EVENT = "meramot-notifications-changed";

export type NotificationType =
  | "cart"
  | "request"
  | "order"
  | "review"
  | "delivery"
  | "payment"
  | "system";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  href?: string;
  read: boolean;
  createdAt: string;
};

type PushNotificationInput = {
  title: string;
  message: string;
  type?: NotificationType;
  href?: string;
};

const MAX_LOCAL_NOTIFICATIONS = 50;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safeParseNotifications(value: string | null): NotificationItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is NotificationItem =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.message === "string" &&
        typeof item.createdAt === "string"
    );
  } catch {
    return [];
  }
}

function emitNotificationChange(items: NotificationItem[]) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, {
      detail: items,
    })
  );
}

export function getLocalNotifications() {
  if (!canUseStorage()) return [];
  return safeParseNotifications(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY));
}

export function saveLocalNotifications(items: NotificationItem[]) {
  if (!canUseStorage()) return;

  const limited = items
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_LOCAL_NOTIFICATIONS);

  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limited));
  emitNotificationChange(limited);
}

export function pushLocalNotification(input: PushNotificationInput) {
  const notification: NotificationItem = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    message: input.message,
    type: input.type || "system",
    href: input.href,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const next = [notification, ...getLocalNotifications()];
  saveLocalNotifications(next);
  return notification;
}

export function markLocalNotificationRead(id: string) {
  const next = getLocalNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  saveLocalNotifications(next);
}

export function markAllLocalNotificationsRead() {
  const next = getLocalNotifications().map((item) => ({ ...item, read: true }));
  saveLocalNotifications(next);
}

export function clearLocalNotifications() {
  saveLocalNotifications([]);
}

export function getUnreadLocalNotificationCount() {
  return getLocalNotifications().filter((item) => !item.read).length;
}
