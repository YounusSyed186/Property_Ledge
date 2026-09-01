'use client';

import React from 'react';
import { ToastProvider } from '@/components/admin/ui/Toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
