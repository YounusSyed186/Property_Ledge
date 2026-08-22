"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  DollarSign,
  ClipboardCheck,
  BarChart3,
  FolderLock,
  Settings,
  Search,
  ChevronDown,
  TrendingUp,
} from "lucide-react";

export function ProductDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Properties", icon: Building2 },
    { name: "Tenants", icon: Users },
    { name: "Leases", icon: FileText },
    { name: "Rent", icon: DollarSign },
    { name: "Inspections", icon: ClipboardCheck },
    { name: "Reports", icon: BarChart3 },
    { name: "Documents", icon: FolderLock },
  ];

  const metrics = [
    {
      label: "Portfolio Value",
      value: "$2.48M",
      change: "+0.8% this month",
      isPositive: true,
    },
    {
      label: "Rent Collected",
      value: "$48,920",
      change: "+3.2% this month",
      isPositive: true,
    },
    {
      label: "Occupancy Rate",
      value: "96.4%",
      change: "+1.1% this month",
      isPositive: true,
    },
    {
      label: "Properties",
      value: "24",
      subtext: "Across portfolio",
      isPositive: null,
    },
  ];

  const payments = [
    { address: "12 Anderson Street", amount: "$2,400.00", status: "Paid" },
    { address: "7 Park Avenue", amount: "$3,180.00", status: "Paid" },
    { address: "46 Collins Street", amount: "$2,120.00", status: "Paid" },
    { address: "10 Waverley Road", amount: "$1,890.00", status: "Paid" },
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-mockup overflow-hidden text-foreground text-xs select-none transition-all duration-300">
      {/* Top Application Frame Bar (Desktop window header) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-subtle border-b border-border/70">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-[11px] font-medium text-muted font-heading">
            app.propertyledge.com.au
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] text-muted">
            <Search className="w-3 h-3 text-muted" />
            <span>Search anything...</span>
            <kbd className="text-[9px] bg-surface-subtle px-1 rounded text-muted">⌘K</kbd>
          </div>
          <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] font-bold text-accent">
            JM
          </div>
        </div>
      </div>

      <div className="flex min-h-[460px] sm:min-h-[500px]">
        {/* Sidebar */}
        <aside className="w-36 sm:w-44 border-r border-border bg-surface/50 p-3 flex flex-col justify-between hidden sm:flex">
          <div className="space-y-4">
            <div className="px-2 py-1 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center font-bold text-[10px]">
                P
              </div>
              <span className="font-heading font-bold text-xs tracking-tight">PropertyLedge</span>
            </div>

            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      isActive
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted hover:text-foreground hover:bg-surface-subtle"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] text-muted hover:text-foreground hover:bg-surface-subtle">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 p-4 sm:p-6 bg-surface space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-foreground">
                Dashboard Overview
              </h2>
              <p className="text-[11px] text-muted">Your portfolio performance at a glance</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-medium text-foreground hover:bg-surface-subtle">
                <span>This Month</span>
                <ChevronDown className="w-3 h-3 text-muted" />
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="p-3 rounded-xl border border-border bg-surface-subtle/50 hover:border-accent/40 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted font-medium">
                  {m.label}
                </span>
                <div className="text-base sm:text-lg font-bold font-heading text-foreground mt-0.5">
                  {m.value}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {m.isPositive ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {m.change}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted">{m.subtext}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Dual Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Payments Widget */}
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-xs text-foreground">
                  Recent Payments
                </span>
                <button className="text-[10px] text-muted flex items-center gap-1 hover:text-foreground">
                  <span>All</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle/40 hover:bg-surface-subtle text-[11px] transition-colors"
                  >
                    <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                      {p.address}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{p.amount}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 text-center">
                <button className="text-[10px] font-medium text-accent hover:underline">
                  View all payments →
                </button>
              </div>
            </div>

            {/* Portfolio Performance Chart Widget */}
            <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-xs text-foreground">
                  Portfolio Performance
                </span>
                <span className="text-[10px] text-muted">This Month</span>
              </div>

              {/* Responsive SVG Chart */}
              <div className="h-32 w-full pt-2">
                <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2="300" y2="60" stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="300" y2="100" stroke="var(--border-subtle)" strokeDasharray="3 3" />

                  {/* Area fill for income */}
                  <path
                    d="M 0,90 Q 60,75 120,40 T 240,25 T 300,15 L 300,100 L 0,100 Z"
                    fill="url(#incomeGrad)"
                  />

                  {/* Income Line */}
                  <path
                    d="M 0,90 Q 60,75 120,40 T 240,25 T 300,15"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Expenses Line */}
                  <path
                    d="M 0,98 Q 60,90 120,78 T 240,65 T 300,55"
                    fill="none"
                    stroke="#A9927D"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                  />

                  {/* Active Data Points */}
                  <circle cx="120" cy="40" r="3.5" fill="#10B981" />
                  <circle cx="300" cy="15" r="3.5" fill="#10B981" />
                </svg>
              </div>

              {/* X Axis Dates & Legend */}
              <div className="flex items-center justify-between text-[9px] text-muted pt-1">
                <span>1 May</span>
                <span>8 May</span>
                <span>15 May</span>
                <span>22 May</span>
                <span>29 May</span>
              </div>

              <div className="flex items-center justify-end gap-3 text-[10px] pt-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted font-medium">Income</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-muted font-medium">Expenses</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
