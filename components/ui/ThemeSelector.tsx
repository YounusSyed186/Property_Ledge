"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sun, Monitor, Sparkles } from "lucide-react";
import { ThemeMode, executeThemeTransition, applyThemeMode } from "@/lib/themeTransition";

interface ThemeOption {
  id: ThemeMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  preview: React.ReactNode;
}

export function ThemeSelector({ className = "" }: { className?: string }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load initial theme from document attribute / localStorage
  useEffect(() => {
    if (typeof document !== "undefined") {
      const stored = localStorage.getItem("propertyledge_theme") as ThemeMode;
      const currentMode = stored || (document.documentElement.getAttribute("data-theme-mode") as ThemeMode) || "dark";
      setThemeModeState(currentMode);
    }

    const syncTheme = () => {
      const stored = localStorage.getItem("propertyledge_theme") as ThemeMode;
      if (stored) setThemeModeState(stored);
    };

    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (mode: ThemeMode) => {
    const currentAttr = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme-mode") : null;
    if (mode === themeMode && currentAttr === mode) return;

    await executeThemeTransition({
      originElement: triggerRef.current,
      targetMode: mode,
      onComplete: () => {
        applyThemeMode(mode);
        setThemeModeState(mode);
        setIsOpen(false);
      },
    });
  };

  const themeOptions: ThemeOption[] = [
    {
      id: "light",
      label: "Mixed",
      description: "Dark sidebar · Light workspace",
      icon: Sun,
      preview: (
        <div className="w-10 h-7 rounded border border-border/40 overflow-hidden flex shadow-xs relative">
          <div className="w-2.5 bg-[#0D1117] h-full" />
          <div className="flex-1 bg-[#FFFFFF] h-full" />
        </div>
      ),
    },
    {
      id: "full-light",
      label: "Full Light",
      description: "Light sidebar · Light workspace",
      icon: Sparkles,
      preview: (
        <div className="w-10 h-7 rounded border border-border/40 overflow-hidden flex shadow-xs relative">
          <div className="w-2.5 bg-[#F1F3F5] h-full" />
          <div className="flex-1 bg-[#F9FAFB] h-full" />
        </div>
      ),
    },
    {
      id: "full-dark",
      label: "Full Dark",
      description: "Dark sidebar · Dark workspace",
      icon: Monitor,
      preview: (
        <div className="w-10 h-7 rounded border border-border/40 overflow-hidden flex shadow-xs relative">
          <div className="w-2.5 bg-[#0D1117] h-full" />
          <div className="flex-1 bg-[#070A0D] h-full" />
        </div>
      ),
    },
  ];

  const activeOption = themeOptions.find((opt) => opt.id === themeMode) || themeOptions[0];
  const ActiveIcon = activeOption.icon;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Popover Trigger Button */}
      <motion.button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Select appearance mode"
        className="w-9 h-9 rounded-lg border border-admin-border bg-admin-surface flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-elevated transition-colors shadow-xs cursor-pointer focus:outline-none"
      >
        <ActiveIcon className="w-4 h-4 text-admin-foreground" />
      </motion.button>

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-admin-border bg-admin-surface text-admin-foreground shadow-xl z-50 overflow-hidden p-2 select-none"
          >
            <div className="px-3.5 py-2 border-b border-admin-divider mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-tight text-admin-muted uppercase">Appearance</span>
            </div>

            <div className="space-y-1">
              {themeOptions.map((option) => {
                const isSelected = option.id === themeMode;

                return (
                  <motion.button
                    key={option.id}
                    onClick={() => handleSelect(option.id)}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors relative group focus:outline-none ${
                      isSelected
                        ? "bg-admin-surface-elevated"
                        : "hover:bg-admin-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Visual Preview Graphic */}
                      <div className="shrink-0 relative">
                        {option.preview}
                        {isSelected && (
                          <div className="absolute inset-0 bg-admin-foreground/5 rounded flex items-center justify-center" />
                        )}
                      </div>

                      {/* Text details */}
                      <div className="leading-tight min-w-0">
                        <p className="text-xs font-bold flex items-center gap-1.5 text-admin-foreground">
                          {option.label}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </p>
                        <p className="text-[10px] text-admin-muted truncate mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
