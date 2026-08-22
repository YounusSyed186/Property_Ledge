import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function SectionLabel({
  children,
  className = "",
  dot = true,
}: SectionLabelProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface/50 text-[11px] font-medium tracking-[0.15em] uppercase text-accent font-heading backdrop-blur-sm ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      <span>{children}</span>
    </div>
  );
}
