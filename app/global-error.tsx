'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal Global Application Error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen w-full flex items-center justify-center bg-[#0E171B] text-[#F4F3EF] p-4 font-sans antialiased">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#152228] border border-[#26373F] shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Application Error
            </h1>
            <p className="text-sm text-[#A8B0B3] leading-relaxed">
              A critical layout error interrupted the application. Please reload or try again.
            </p>
          </div>

          {error.message && (
            <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-left text-xs font-mono text-[#C7A66A] overflow-x-auto max-h-24">
              {error.message}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full py-3 px-4 rounded-xl bg-[#C7A66A] hover:bg-[#d8b77b] text-[#081216] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
