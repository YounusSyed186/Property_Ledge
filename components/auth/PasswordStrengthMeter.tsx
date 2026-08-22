"use client";

import React from "react";
import { evaluatePasswordStrength } from "@/lib/auth/password-strength";

interface PasswordStrengthMeterProps {
  password?: string;
}

export function PasswordStrengthMeter({ password = "" }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label } = evaluatePasswordStrength(password);

  const getSegmentColor = (index: number) => {
    if (index >= score) return "bg-black/10 dark:bg-white/10";
    switch (label) {
      case "weak":
        return "bg-red-500";
      case "fair":
        return "bg-amber-500";
      case "good":
        return "bg-blue-500 dark:bg-blue-400";
      case "strong":
        return "bg-emerald-500";
      default:
        return "bg-black/10 dark:bg-white/10";
    }
  };

  const getLabelColor = () => {
    switch (label) {
      case "weak":
        return "text-red-500 font-semibold";
      case "fair":
        return "text-amber-500 font-semibold";
      case "good":
        return "text-blue-500 dark:text-blue-400 font-semibold";
      case "strong":
        return "text-emerald-500 font-semibold";
      default:
        return "text-muted font-normal";
    }
  };

  return (
    <div className="space-y-1.5 pt-1.5 select-none" aria-live="polite">
      {/* 4 Segment Bars */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-full rounded-full transition-all duration-300 ${getSegmentColor(index)}`}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#7C878B] font-medium">
          Password strength: <span className={`capitalize ${getLabelColor()}`}>{label}</span>
        </span>
      </div>
    </div>
  );
}
