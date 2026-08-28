"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Activity,
  Key,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Copy,
  Check,
  Fingerprint,
} from "lucide-react";
import { logoutAction, updateProfileAction } from "@/lib/auth/actions";

interface ProfileCardProps {
  user: {
    id: string;
    email: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    createdAt?: string;
    emailVerified?: boolean;
    provider?: string;
    publicId?: string;
  };
  accountContext?: {
    status?: string;
    onboardingStatus?: string;
    firstLoginAt?: string;
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export function ProfileCard({ user, accountContext }: ProfileCardProps) {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState(user.fullName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [supportAccess, setSupportAccess] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedPublicId, setCopiedPublicId] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formatting helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await updateProfileAction({ fullName, phone });
      if (!res.success) {
        setMessage({ type: "error", text: res.error || "Failed to update profile." });
      } else {
        setMessage({ type: "success", text: "Profile & account settings updated successfully!" });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving profile changes." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const handleCopyPublicId = async () => {
    if (!user.publicId) return;
    await navigator.clipboard.writeText(user.publicId);
    setCopiedPublicId(true);
    setTimeout(() => setCopiedPublicId(false), 2000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col space-y-6">
      {/* 1. FULL WIDTH COVER & PROFILE HEADER BANNER */}
      <div className="w-full bg-surface dark:bg-[#12181C] border border-border/70 dark:border-[#222B30] rounded-3xl shadow-xl overflow-hidden relative">
        {/* Decorative Ambient Banner Header */}
        <div className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-[#CDE5ED] via-[#DCEBF0] to-[#E5F1F4] dark:from-[#15242B] dark:via-[#192B32] dark:to-[#142329] overflow-hidden">
          <div className="absolute inset-0 bg-architectural-grid opacity-25 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Header Controls */}
          <div className="absolute top-5 right-6 z-10 flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
              Account Status: {accountContext?.status || "Active"}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/80 dark:bg-[#0E1518]/80 backdrop-blur-md border border-black/10 dark:border-white/10 text-xs font-semibold text-foreground hover:bg-white dark:hover:bg-[#182328] transition-all shadow-sm"
            >
              <span>View Landing Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted" />
            </Link>
          </div>
        </div>

        {/* User Identity Header Row */}
        <div className="px-6 sm:px-10 pb-6 relative z-10 -mt-16 sm:-mt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar with Camera Change Overlay */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-surface dark:border-[#12181C] overflow-hidden bg-surface-subtle dark:bg-[#1A2328] shadow-lg flex items-center justify-center">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1C262C] to-[#0E1317] text-white font-heading text-4xl font-extrabold flex items-center justify-center">
                    {fullName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Name & Subtitles */}
            <div className="space-y-1 text-left pt-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  {fullName}
                </h1>
                <div className="w-6 h-6 rounded-full bg-[#0095F6] flex items-center justify-center text-white shrink-0 shadow-sm" title="Verified Account">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-surface-subtle dark:bg-[#1C262C] text-xs font-mono font-semibold text-muted border border-border/60">
                  Provider: {user.provider || "Email"}
                </span>
              </div>
              <p className="text-sm text-muted flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" />
                <span>{user.email}</span>
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-subtle dark:bg-[#1A2429] hover:bg-red-500/10 hover:text-red-500 border border-border/70 dark:border-[#253036] text-foreground transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Log out</span>
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save changes</span>}
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div className="px-6 sm:px-10 pb-4">
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} className="text-xs opacity-70">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN FULL-SCREEN GRID: 2 COLUMNS FOR ALL RELEVANT DB TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: PUBLIC PROFILE & PERSONAL DETAILS */}
        <div className="lg:col-span-7 space-y-6">
          {/* CARD: PUBLIC PROFILE & PERSONAL DETAILS */}
          <div className="bg-surface dark:bg-[#12181C] border border-border/70 dark:border-[#222B30] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-border/60 dark:border-[#222B30]">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Public Profile & Personal Details</h2>
                <p className="text-xs text-muted">Update your display information stored in the profiles table.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Field: Profile ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-muted" />
                  Profile ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={user.publicId || "Not available"}
                    className="flex-1 h-11 px-4 rounded-xl bg-surface-subtle dark:bg-[#172025] border border-border/80 dark:border-[#253036] text-sm font-mono text-foreground focus:outline-none"
                  />
                  {user.publicId && (
                    <button
                      type="button"
                      onClick={handleCopyPublicId}
                      className="h-11 px-4 rounded-xl bg-surface-subtle dark:bg-[#172025] border border-border/80 dark:border-[#253036] text-foreground hover:bg-surface-subtle/80 transition-colors flex items-center gap-2 text-xs font-semibold shrink-0"
                      aria-label="Copy profile ID"
                    >
                      {copiedPublicId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      {copiedPublicId ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted">
                  Share this ID so teammates can add you via Team → Add member → Profile ID.
                </p>
              </div>

              {/* Field: Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-muted" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Henry Sullivan"
                  className="w-full h-11 px-4 rounded-xl bg-surface-subtle dark:bg-[#172025] border border-border/80 dark:border-[#253036] text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Field: Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted" />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+61 400 000 000"
                  className="w-full h-11 px-4 rounded-xl bg-surface-subtle dark:bg-[#172025] border border-border/80 dark:border-[#253036] text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* CARD: AUTHENTICATION & SECURITY DATA */}
          <div className="bg-surface dark:bg-[#12181C] border border-border/70 dark:border-[#222B30] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-border/60 dark:border-[#222B30]">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Authentication & Identity</h2>
                <p className="text-xs text-muted">User identity data synchronized with Supabase Auth.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-surface-subtle/60 dark:bg-[#172025] border border-border/50 dark:border-[#253036] space-y-1">
                <span className="text-muted block">Email Address</span>
                <span className="font-semibold text-foreground block truncate">{user.email}</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-subtle/60 dark:bg-[#172025] border border-border/50 dark:border-[#253036] space-y-1">
                <span className="text-muted block">Auth Provider</span>
                <span className="font-semibold text-foreground block capitalize">{user.provider || "Email/Password"}</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface-subtle/60 dark:bg-[#172025] border border-border/50 dark:border-[#253036] space-y-1 sm:col-span-2">
                <span className="text-muted block">Account Created</span>
                <span className="font-semibold text-foreground block">{formatDate(user.createdAt)}</span>
              </div>
            </div>

            {/* Support Access Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-border/40 dark:border-[#1F282D]">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-foreground">Support Access</h3>
                <p className="text-xs text-muted max-w-md">
                  Grant PropertyLedge support team temporary access for account assistance.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={supportAccess}
                onClick={() => setSupportAccess(!supportAccess)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  supportAccess ? "bg-foreground" : "bg-border dark:bg-[#2A353C]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                    supportAccess ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACCOUNT CONTEXT & DATABASE TABLE RELEVANT DATA */}
        <div className="lg:col-span-5 space-y-6">
          {/* CARD: ACCOUNT_CONTEXT TABLE METRICS */}
          <div className="bg-surface dark:bg-[#12181C] border border-border/70 dark:border-[#222B30] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-border/60 dark:border-[#222B30]">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Account Context Table</h2>
                <p className="text-xs text-muted">Application context tracked in account_context table.</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-border/40 dark:border-[#253036]">
                <span className="text-muted flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Account Status
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {accountContext?.status || "Active"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/40 dark:border-[#253036]">
                <span className="text-muted flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  Onboarding Status
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase font-mono bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  {accountContext?.onboardingStatus || "Completed"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/40 dark:border-[#253036]">
                <span className="text-muted flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  Member Since
                </span>
                <span className="font-medium text-foreground">
                  {formatDate(user.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-muted flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent" />
                  Context Updated At
                </span>
                <span className="font-medium text-foreground">
                  {formatDate(accountContext?.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
