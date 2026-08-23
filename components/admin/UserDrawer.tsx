'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { DiceBearAvatar } from '@/components/admin/ui';

interface UserDrawerProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    planName: string;
    status: string;
    created_at?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserDrawer({ user, isOpen, onClose, onSuccess }: UserDrawerProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let animFrame: number;

    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 280);
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  if (!mounted || !user) return null;

  return (
    <div className="absolute inset-0 z-40 overflow-hidden font-sans rounded-xl lg:rounded-2xl">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div
          className={`w-full sm:w-[500px] md:w-[540px] max-w-full bg-admin-surface border-l border-admin-border text-admin-foreground flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
            animateIn ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-admin-border bg-admin-sidebar/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DiceBearAvatar seed={user.name} size={40} />
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">
                  User Account Inspection
                </span>
                <h2 className="text-base font-bold font-heading text-white truncate max-w-[260px]">
                  {user.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white hover:bg-admin-border/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Identity Summary Card */}
            <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-admin-border/60 pb-2">
                <span className="text-xs font-semibold uppercase font-mono text-admin-muted tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-admin-primary" />
                  <span>Account Identity</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                    user.status === 'active' || user.status === 'active admin'
                      ? 'bg-admin-success-soft text-admin-success border-admin-success/30'
                      : user.status === 'suspended'
                      ? 'bg-admin-danger/10 text-admin-danger border-admin-danger/30'
                      : 'bg-admin-warning-soft text-admin-warning border-admin-warning/30'
                  }`}
                >
                  {user.status}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-admin-foreground">
                  <Mail className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                  <span className="font-mono text-white select-all">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-admin-foreground">
                  <Phone className="w-3.5 h-3.5 text-admin-primary shrink-0" />
                  <span>{user.phone || 'No phone number linked'}</span>
                </div>
              </div>
            </div>

            {/* Role & Subscription Details */}
            <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-3">
              <span className="text-xs font-semibold uppercase font-mono text-admin-muted tracking-wider flex items-center gap-2 border-b border-admin-border/60 pb-2">
                <Shield className="w-3.5 h-3.5 text-admin-primary" />
                <span>Privileges & Subscription</span>
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-admin-muted">System Role</span>
                  <p className="font-bold text-white mt-0.5">{user.role}</p>
                </div>
                <div>
                  <span className="text-admin-muted">Current Plan</span>
                  <p className="font-mono font-bold text-admin-primary mt-0.5">{user.planName}</p>
                </div>
                <div>
                  <span className="text-admin-muted">User ID</span>
                  <p className="font-mono text-admin-muted text-[10px] truncate mt-0.5">{user.id}</p>
                </div>
                <div>
                  <span className="text-admin-muted">Joined Date</span>
                  <p className="text-white mt-0.5">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Management Notes */}
            <div className="p-4 rounded-xl bg-admin-surface border border-admin-border space-y-2 text-xs text-admin-muted">
              <div className="font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-admin-primary" />
                <span>Account Management Policy</span>
              </div>
              <p className="leading-relaxed">
                User accounts have direct access to their PropertyLedge property portfolio, financial records, and subscription billing. Account status changes take effect immediately across all client sessions.
              </p>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-admin-border bg-admin-sidebar/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-admin-primary-soft text-admin-primary border border-admin-primary/30 hover:bg-admin-primary hover:text-black font-semibold text-xs transition-all"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
