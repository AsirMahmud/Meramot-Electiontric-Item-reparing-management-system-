"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";

import {
  clearLocalNotifications,
  getLocalNotifications,
  markAllLocalNotificationsRead,
  markLocalNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATIONS_STORAGE_KEY,
  type NotificationItem,
} from "@/lib/notifications";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "cart":
      return "🛒";
    case "request":
      return "🛠️";
    case "order":
      return "📦";
    case "review":
      return "⭐";
    case "delivery":
      return "🏍️";
    case "payment":
      return "৳";
    default:
      return "🔔";
  }
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  function refresh() {
    setItems(getLocalNotifications());
  }

  useEffect(() => {
    refresh();

    function handleNotificationChange(event: Event) {
      const customEvent = event as CustomEvent<NotificationItem[]>;
      if (Array.isArray(customEvent.detail)) {
        setItems(customEvent.detail);
      } else {
        refresh();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === NOTIFICATIONS_STORAGE_KEY) refresh();
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);
  const visibleItems = items.slice(0, 8);

  function toggleOpen() {
    setIsOpen((current) => {
      const next = !current;
      if (next && unreadCount > 0) {
        markAllLocalNotificationsRead();
      }
      return next;
    });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mint-200)] text-[var(--accent-dark)] shadow-sm transition hover:scale-105 hover:bg-[var(--mint-300)]"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-dark)] px-1 text-xs font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[120] mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">Notifications</h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {items.length
                  ? `${items.length} recent update${items.length === 1 ? "" : "s"}`
                  : "No updates yet"}
              </p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => clearLocalNotifications()}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
              >
                Clear
              </button>
            )}
          </div>

          {visibleItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
              Small updates like cart actions, request submissions, and order changes will appear here.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto p-2">
              {visibleItems.map((item) => {
                const content = (
                  <div className="flex gap-3 rounded-2xl px-3 py-3 transition hover:bg-[var(--mint-50)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mint-100)] text-lg">
                      {getIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-[var(--foreground)]">
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-dark)]" />
                        )}
                      </div>

                      <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
                        {item.message}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                        {formatNotificationTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        markLocalNotificationRead(item.id);
                        setIsOpen(false);
                      }}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return <div key={item.id}>{content}</div>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}