'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/app/actions/notifications';
import { cn } from '@/lib/utils';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationCenterProps {
  className?: string;
  variant?: 'default' | 'navbar';
}

export function NotificationCenter({ className, variant = 'default' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    const result = await markNotificationRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString(), isUnread: false } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      const result = await markAllNotificationsRead();
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString(), isUnread: false }))
        );
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-center"
        className={cn(
          'relative flex items-center justify-center transition-colors',
          variant === 'navbar'
            ? 'h-7 w-7 rounded-md border border-admin-sidebar-border text-admin-sidebar-muted hover:bg-admin-sidebar-hover hover:text-admin-sidebar-foreground'
            : 'h-9 w-9 rounded-xl border border-admin-border bg-admin-surface text-admin-muted shadow-2xs hover:bg-admin-surface-elevated hover:text-admin-foreground'
        )}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={variant === 'navbar' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-admin-success px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
            <h3 className="text-sm font-semibold text-admin-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="flex items-center gap-1 text-[11px] font-medium text-admin-primary transition-colors hover:text-admin-primary/80 disabled:opacity-50"
              >
                {isMarkingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-admin-muted" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-admin-muted">No notifications yet</p>
            ) : (
              <ul className="divide-y divide-admin-border">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => notification.isUnread && handleMarkRead(notification.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors hover:bg-admin-surface-elevated',
                        notification.isUnread && 'bg-admin-primary-soft/30'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {notification.isUnread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-admin-success" />
                        )}
                        <div className={cn('min-w-0 flex-1', !notification.isUnread && 'pl-4')}>
                          <p className="truncate text-sm font-medium text-admin-foreground">{notification.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-admin-muted">{notification.message}</p>
                          <p className="mt-1 text-[10px] text-admin-muted">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
