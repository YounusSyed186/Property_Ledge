'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export interface ToastOptions {
  title: string;
  description?: string;
  message?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  action?: React.ReactNode;
}

interface ToastContextValue {
  toast: {
    (options: ToastOptions): void;
    (type: ToastType, title: string, message?: string, action?: React.ReactNode): void;
  };
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const toastStyles: Record<ToastType, { icon: React.ReactNode; iconClass: string; borderClass: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    iconClass: 'text-admin-success',
    borderClass: 'border-admin-success/30',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    iconClass: 'text-admin-danger',
    borderClass: 'border-admin-danger/30',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    iconClass: 'text-admin-warning',
    borderClass: 'border-admin-warning/30',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    iconClass: 'text-admin-info',
    borderClass: 'border-admin-info/30',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerToast = useCallback(
    (
      arg1: ToastType | ToastOptions,
      arg2?: string,
      arg3?: string,
      arg4?: React.ReactNode
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      let type: ToastType = 'info';
      let title = '';
      let message: string | undefined;
      let action: React.ReactNode | undefined;

      if (typeof arg1 === 'object' && arg1 !== null) {
        title = arg1.title;
        message = arg1.description || arg1.message;
        action = arg1.action;
        if (arg1.variant === 'destructive') {
          type = 'error';
        } else if (arg1.variant === 'success') {
          type = 'success';
        } else if (arg1.variant === 'warning') {
          type = 'warning';
        } else {
          type = 'info';
        }
      } else {
        type = arg1 as ToastType;
        title = arg2 || '';
        message = arg3;
        action = arg4;
      }

      setToasts((prev) => [...prev, { id, type, title, message, action }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    toast: triggerToast as any,
    success: (title, message) => triggerToast('success', title, message),
    error: (title, message) => triggerToast('error', title, message),
    warning: (title, message) => triggerToast('warning', title, message),
    info: (title, message) => triggerToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2.5 max-w-sm w-full" aria-live="polite">
        {toasts.map((t) => {
          const style = toastStyles[t.type] || toastStyles.info;
          return (
            <div
              key={t.id}
              className={cn(
                'bg-admin-surface-elevated border rounded-xl shadow-elevation-3 p-4 flex items-start gap-3 animate-slide-up',
                style.borderClass
              )}
              role="alert"
            >
              <span className={cn('shrink-0 mt-0.5', style.iconClass)}>{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-admin-foreground">{t.title}</p>
                {t.message && <p className="text-caption text-admin-muted mt-0.5">{t.message}</p>}
                {t.action && <div className="mt-2">{t.action}</div>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-md text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}