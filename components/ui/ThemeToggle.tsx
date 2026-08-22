"use client";

import React, { useState, useEffect, useRef } from "react";
import { executeThemeTransition, applyThemeMode, ThemeMode } from "@/lib/themeTransition";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [localDark, setLocalDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      setLocalDark(document.documentElement.classList.contains("dark"));
      
      const syncTheme = () => {
        setLocalDark(document.documentElement.classList.contains("dark"));
      };
      window.addEventListener("theme-change", syncTheme);
      return () => window.removeEventListener("theme-change", syncTheme);
    }
  }, []);

  const handleBinaryToggle = async () => {
    const targetDark = !localDark;
    const targetMode: ThemeMode = targetDark ? "dark" : "light";

    await executeThemeTransition({
      originElement: buttonRef.current,
      targetMode,
      onComplete: () => {
        applyThemeMode(targetMode);
        setLocalDark(targetDark);
      },
    });
  };

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-xl border border-border/50 flex items-center justify-center text-muted opacity-50 ${className}`}
        aria-hidden="true"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-border/40" />
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleBinaryToggle}
      type="button"
      aria-label={localDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative w-8 h-8 rounded-xl border border-border hover:border-accent/70 bg-surface/70 backdrop-blur-md flex items-center justify-center text-foreground transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          className={`w-3.5 h-3.5 text-accent transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform ${
            localDark
              ? "opacity-0 rotate-90 scale-50 pointer-events-none absolute"
              : "opacity-100 rotate-0 scale-100"
          }`}
        />
        <Moon
          className={`w-3.5 h-3.5 text-accent transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform ${
            localDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-90 scale-50 pointer-events-none absolute"
          }`}
        />
      </div>
    </button>
  );
}
