"use client";

import React from "react";
import { ChevronDown, TrendingUp } from "lucide-react";

export function FinancialDashboard() {
  const financialMetrics = [
    {
      label: "Rental Income",
      amount: "$182,400",
      change: "+8.4%",
      isPositive: true,
    },
    {
      label: "Operating Expenses",
      amount: "$42,820",
      change: "+4.1%",
      isPositive: false,
    },
    {
      label: "Net Income",
      amount: "$139,580",
      change: "+10.2%",
      isPositive: true,
    },
  ];

  const barData = [
    { month: "Jan", income: 80, expense: 35 },
    { month: "Feb", income: 85, expense: 30 },
    { month: "Mar", income: 90, expense: 45 },
    { month: "Apr", income: 88, expense: 38 },
    { month: "May", income: 95, expense: 40 },
    { month: "Jun", income: 98, expense: 42 },
  ];

  const expenseBreakdown = [
    { name: "Maintenance", pct: "39%", color: "#10B981" },
    { name: "Management Fees", pct: "25%", color: "var(--foreground)" },
    { name: "Council Rates", pct: "18%", color: "#A9927D" },
    { name: "Insurance", pct: "10%", color: "#D4A771" },
    { name: "Other Expenses", pct: "8%", color: "#66737A" },
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-mockup overflow-hidden text-foreground text-xs select-none">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-subtle/30">
        <div>
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
            Financial Overview
          </h3>
          <p className="text-[11px] text-muted">Year to date performance</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-foreground hover:bg-surface-subtle"
        >
          <span>This Financial Year</span>
          <ChevronDown className="w-3 h-3 text-muted" />
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {financialMetrics.map((m, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-border bg-surface-subtle/40 space-y-1"
            >
              <span className="text-[10px] uppercase font-medium text-muted">
                {m.label}
              </span>
              <div className="text-lg font-bold font-heading text-foreground">
                {m.amount}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>{m.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts: Bar Chart + Donut Chart */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
          {/* Income vs Expenses Bar Chart */}
          <div className="md:col-span-7 p-3.5 rounded-xl border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-xs text-foreground">
                Income vs Expenses
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1 text-muted">
                  <span className="w-2 h-2 rounded-xs bg-emerald-600" /> Income
                </span>
                <span className="flex items-center gap-1 text-muted">
                  <span className="w-2 h-2 rounded-xs bg-accent" /> Expense
                </span>
              </div>
            </div>

            {/* Custom Bar Visualization */}
            <div className="h-36 flex items-end justify-between gap-2 pt-4 px-2 border-b border-border/60">
              {barData.map((b, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-28">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${b.income}%` }}
                      className="w-3 sm:w-3.5 bg-emerald-600/80 group-hover:bg-emerald-600 rounded-t-xs transition-all duration-300"
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${b.expense}%` }}
                      className="w-3 sm:w-3.5 bg-accent/80 group-hover:bg-accent rounded-t-xs transition-all duration-300"
                    />
                  </div>
                  <span className="text-[10px] text-muted font-medium">{b.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expenses Breakdown Donut Chart */}
          <div className="md:col-span-5 p-3.5 rounded-xl border border-border bg-surface flex flex-col justify-between">
            <span className="font-heading font-semibold text-xs text-foreground">
              Expenses Breakdown
            </span>

            <div className="flex items-center gap-4 py-2">
              {/* Donut SVG */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeDasharray="93 145"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="var(--foreground)"
                    strokeWidth="16"
                    strokeDasharray="60 178"
                    strokeDashoffset="-93"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#A9927D"
                    strokeWidth="16"
                    strokeDasharray="43 195"
                    strokeDashoffset="-153"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#D4A771"
                    strokeWidth="16"
                    strokeDasharray="24 214"
                    strokeDashoffset="-196"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[10px] font-bold text-foreground">$42,820</div>
                  <div className="text-[8px] text-muted">Total Exp</div>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1 text-[10px] flex-1">
                {expenseBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted truncate">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground ml-1">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
