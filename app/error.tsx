'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0E171B] text-[#F4F3EF] p-4">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#152228] border border-[#26373F] shadow-2xl space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading">
            Something went wrong
          </h2>
          <p className="text-sm text-[#A8B0B3] leading-relaxed">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-left text-xs font-mono text-[#C7A66A] overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-[#C7A66A] hover:bg-[#d8b77b] text-[#081216] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try again</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
