"use client";

import React from "react";
import { Plus } from "lucide-react";

export function PortfolioDashboard() {
  const propertySummary = [
    { label: "Total Properties", count: "24", sub: "+2 this month" },
    { label: "Occupied", count: "23", sub: "95.8%" },
    { label: "Vacant", count: "1", sub: "4.2%" },
    { label: "Maintenance", count: "2", sub: "8.3%" },
  ];

  const properties = [
    {
      address: "12 Anderson Street",
      type: "House",
      location: "Sydney, NSW",
      occupancy: "Occupied",
      rent: "$2,400 / mo",
      status: "Active",
    },
    {
      address: "7 Park Avenue",
      type: "Townhouse",
      location: "Melbourne, VIC",
      occupancy: "Occupied",
      rent: "$3,180 / mo",
      status: "Active",
    },
    {
      address: "46 Collins Street",
      type: "Apartment",
      location: "Melbourne, VIC",
      occupancy: "Occupied",
      rent: "$2,890 / mo",
      status: "Active",
    },
    {
      address: "10 Waverley Road",
      type: "House",
      location: "Brisbane, QLD",
      occupancy: "Occupied",
      rent: "$1,890 / mo",
      status: "Active",
    },
    {
      address: "8 Ocean Drive",
      type: "Apartment",
      location: "Gold Coast, QLD",
      occupancy: "Vacant",
      rent: "—",
      status: "Listing",
    },
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-mockup overflow-hidden text-foreground text-xs select-none">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-subtle/30">
        <div>
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
            Properties
          </h3>
          <p className="text-[11px] text-muted">
            Manage all properties and performance in your portfolio
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background font-medium text-[11px] hover:bg-foreground/90 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3 h-3" />
          <span>Add Property</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {propertySummary.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl border border-border/80 bg-surface-subtle/40 space-y-0.5"
            >
              <div className="text-[10px] uppercase font-medium tracking-wider text-muted">
                {item.label}
              </div>
              <div className="text-base sm:text-lg font-bold font-heading text-foreground">
                {item.count}
              </div>
              <div className="text-[10px] text-accent font-medium">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Properties Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[540px]">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted font-heading">
                <th className="pb-2 font-semibold">Property</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Location</th>
                <th className="pb-2 font-semibold">Occupancy</th>
                <th className="pb-2 font-semibold">Rent</th>
                <th className="pb-2 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[11px]">
              {properties.map((p, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-surface-subtle/60 transition-colors duration-150 group"
                >
                  <td className="py-2.5 font-medium text-foreground">{p.address}</td>
                  <td className="py-2.5 text-muted">{p.type}</td>
                  <td className="py-2.5 text-muted">{p.location}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        p.occupancy === "Occupied"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {p.occupancy}
                    </span>
                  </td>
                  <td className="py-2.5 font-semibold text-foreground">{p.rent}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        p.status === "Active"
                          ? "bg-foreground/5 text-foreground border border-border"
                          : "bg-accent/15 text-accent border border-accent/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
