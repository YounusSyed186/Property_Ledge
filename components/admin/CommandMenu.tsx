'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, CreditCard, Receipt, CornerDownLeft, X, Shield, ArrowRight } from 'lucide-react';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'Admin Dashboard Overview', href: '/admin', icon: Shield },
    { label: 'Subscriptions Management', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'User Directory', href: '/admin/users', icon: Users },
    { label: 'Payments & Receipts', href: '/admin/payments', icon: Receipt },
    { label: 'Plans & Pricing', href: '/admin/plans', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-admin-surface border border-admin-border rounded-xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-admin-border bg-admin-sidebar-surface/60">
          <Search className="w-4 h-4 text-admin-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subscriptions, users, payments, or commands..."
            className="w-full bg-transparent text-sm text-admin-foreground placeholder:text-admin-muted focus:outline-none font-sans"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-admin-muted hover:text-admin-foreground hover:bg-admin-border/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Body */}
        <div className="p-3 max-h-[380px] overflow-y-auto space-y-3 font-sans">
          <div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-admin-muted px-2 mb-1.5">
              Quick Navigation
            </p>
            <div className="space-y-0.5">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    router.push(link.href);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-admin-foreground hover:bg-admin-primary-soft hover:text-admin-primary transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <link.icon className="w-4 h-4 text-admin-muted group-hover:text-admin-primary transition-colors" />
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-admin-border bg-admin-sidebar/40 flex items-center justify-between text-[11px] text-admin-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-admin-surface border border-admin-border px-1.5 py-0.5 rounded font-mono text-[9px]">ESC</kbd>
              <span>to close</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-admin-primary">PropertyLedge V3 Admin</span>
        </div>
      </div>
    </div>
  );
}
