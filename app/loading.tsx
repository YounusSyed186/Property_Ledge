import React from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0E171B] text-[#F4F3EF]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7A66A]" />
        <p className="text-xs font-medium text-[#A8B0B3] tracking-wide">Loading PropertyLedge...</p>
      </div>
    </div>
  );
}
