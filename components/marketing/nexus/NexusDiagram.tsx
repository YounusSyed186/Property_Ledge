"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  FileText,
  BarChart3,
  ClipboardCheck,
  CreditCard,
  FolderLock,
} from "lucide-react";
import { NexusModuleData } from "./types";
import { NexusGrid } from "./NexusGrid";
import { NexusCore } from "./NexusCore";
import { NexusConnections } from "./NexusConnections";
import { NexusModule } from "./NexusModule";
import { NexusActivityPill } from "./NexusActivityPill";

const MODULES: NexusModuleData[] = [
  {
    id: "leases",
    name: "Leases",
    icon: FileText,
    angle: 270, // Top
    description: "Digital lease generation & automated renewals",
    activityLabel: "LEASE RENEWED",
  },
  {
    id: "reports",
    name: "Reports",
    icon: BarChart3,
    angle: 330, // Top Right
    description: "ATO compliant real-time tax & yield reports",
    activityLabel: "REPORT GENERATED",
  },
  {
    id: "payments",
    name: "Payments",
    icon: CreditCard,
    angle: 30, // Bottom Right
    description: "Automated payment reconciliation & disbursement",
    activityLabel: "PAYMENT RECONCILED",
  },
  {
    id: "documents",
    name: "Documents",
    icon: FolderLock,
    angle: 90, // Bottom
    description: "Secure vault & compliance document storage",
    activityLabel: "DOCUMENT STORED",
  },
  {
    id: "inspections",
    name: "Inspections",
    icon: ClipboardCheck,
    angle: 150, // Bottom Left
    description: "Automated routine inspection scheduling & logs",
    activityLabel: "INSPECTION LOGGED",
  },
  {
    id: "rent",
    name: "Rent",
    icon: DollarSign,
    angle: 210, // Top Left
    description: "Automated rent collection & arrears notices",
    activityLabel: "RENT SYNCED",
  },
];

// Normalized percentages (0-100%) matching the 440x440 viewBox
const MODULE_COORDINATES: Record<string, { xPercent: number; yPercent: number }> = {
  leases: { xPercent: 50, yPercent: 15 },
  reports: { xPercent: 80.5, yPercent: 32 },
  payments: { xPercent: 80.5, yPercent: 68 },
  documents: { xPercent: 50, yPercent: 85 },
  inspections: { xPercent: 19.5, yPercent: 68 },
  rent: { xPercent: 19.5, yPercent: 32 },
};

export function NexusDiagram() {
  const [activeModuleId, setActiveModuleId] = useState<string | null>("rent");
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>("RENT SYNCED");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const triggerWorkflow = useCallback((moduleId: string) => {
    const mod = MODULES.find((m) => m.id === moduleId);
    if (!mod) return;

    setActiveModuleId(mod.id);
    setActiveLabel(mod.activityLabel);
    setIsProcessing(true);

    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Organic background workflow loop
  useEffect(() => {
    const sequence = ["rent", "payments", "reports", "documents", "leases", "inspections"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      // Don't override if user is actively hovering a node
      if (hoveredModuleId) return;

      currentIndex = (currentIndex + 1) % sequence.length;
      triggerWorkflow(sequence[currentIndex]);
    }, 4200);

    return () => clearInterval(interval);
  }, [hoveredModuleId, triggerWorkflow]);

  const handleModuleClick = (id: string) => {
    triggerWorkflow(id);
  };

  const handleHoverStart = (id: string) => {
    setHoveredModuleId(id);
    const mod = MODULES.find((m) => m.id === id);
    if (mod) {
      setActiveLabel(mod.activityLabel);
    }
  };

  const handleHoverEnd = () => {
    setHoveredModuleId(null);
  };

  return (
    <div className="relative w-full max-w-[420px] sm:max-w-[460px] aspect-square mx-auto flex items-center justify-center p-2 select-none">
      {/* Activity Status Pill at top */}
      <NexusActivityPill label={isProcessing || hoveredModuleId ? activeLabel : null} />

      {/* Layer 1: Ambient Lighting, Grid & Orbit Rings */}
      <NexusGrid />

      {/* Layer 2: SVG Connections & Flow Particles */}
      <NexusConnections
        modules={MODULES}
        activeModuleId={activeModuleId}
        hoveredModuleId={hoveredModuleId}
      />

      {/* Layer 3: Central Operating Core */}
      <NexusCore
        isProcessing={isProcessing}
        activeLabel={hoveredModuleId ? activeLabel : null}
      />

      {/* Layer 4: Six Module Nodes arranged in orbit */}
      {MODULES.map((mod) => {
        const coords = MODULE_COORDINATES[mod.id];
        const isActive = activeModuleId === mod.id;
        const isHovered = hoveredModuleId === mod.id;
        const isDimmed = Boolean(hoveredModuleId && hoveredModuleId !== mod.id);

        return (
          <NexusModule
            key={mod.id}
            module={mod}
            xPercent={coords.xPercent}
            yPercent={coords.yPercent}
            isActive={isActive}
            isHovered={isHovered}
            isDimmed={isDimmed}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
            onClick={handleModuleClick}
          />
        );
      })}
    </div>
  );
}
