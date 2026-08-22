"use client";

import React from "react";
import { NexusModuleData } from "./types";

interface ConnectionPath {
  id: string;
  moduleId: string;
  d: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  flowDuration: number;
  flowDelay: number;
}

interface NexusConnectionsProps {
  modules: NexusModuleData[];
  activeModuleId: string | null;
  hoveredModuleId: string | null;
}

export function NexusConnections({
  activeModuleId,
  hoveredModuleId,
}: NexusConnectionsProps) {
  // Center is (220, 220) on a 440x440 viewBox
  // Node coordinates (radius approx 155px from center):
  // Leases (Top): (220, 65)
  // Reports (Top-Right): (355, 140)
  // Payments (Bottom-Right): (355, 300)
  // Documents (Bottom): (220, 375)
  // Inspections (Bottom-Left): (85, 300)
  // Rent (Top-Left): (85, 140)

  const paths: ConnectionPath[] = [
    {
      id: "path-leases",
      moduleId: "leases",
      d: "M 220 65 Q 220 145 220 220",
      startX: 220,
      startY: 65,
      endX: 220,
      endY: 220,
      flowDuration: 3.4,
      flowDelay: 6.2,
    },
    {
      id: "path-reports",
      moduleId: "reports",
      d: "M 355 140 Q 290 150 220 220",
      startX: 355,
      startY: 140,
      endX: 220,
      endY: 220,
      flowDuration: 4.1,
      flowDelay: 3.0,
    },
    {
      id: "path-payments",
      moduleId: "payments",
      d: "M 355 300 Q 290 290 220 220",
      startX: 355,
      startY: 300,
      endX: 220,
      endY: 220,
      flowDuration: 2.5,
      flowDelay: 1.4,
    },
    {
      id: "path-documents",
      moduleId: "documents",
      d: "M 220 375 Q 220 295 220 220",
      startX: 220,
      startY: 375,
      endX: 220,
      endY: 220,
      flowDuration: 3.8,
      flowDelay: 4.7,
    },
    {
      id: "path-inspections",
      moduleId: "inspections",
      d: "M 85 300 Q 150 290 220 220",
      startX: 85,
      startY: 300,
      endX: 220,
      endY: 220,
      flowDuration: 3.2,
      flowDelay: 7.8,
    },
    {
      id: "path-rent",
      moduleId: "rent",
      d: "M 85 140 Q 150 150 220 220",
      startX: 85,
      startY: 140,
      endX: 220,
      endY: 220,
      flowDuration: 2.8,
      flowDelay: 0.0,
    },
  ];

  return (
    <svg
      viewBox="0 0 440 440"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow filter for data particles */}
        <filter id="particle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Linear gradients for architectural connection wires */}
        <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Connection Paths & Flow Particles */}
      {paths.map((p) => {
        const isHighlighted =
          activeModuleId === p.moduleId || hoveredModuleId === p.moduleId;

        return (
          <g key={p.id}>
            {/* Background Idle / Active Connection Path */}
            <path
              id={p.id}
              d={p.d}
              stroke={isHighlighted ? "url(#conn-gradient)" : "var(--accent)"}
              strokeWidth={isHighlighted ? 1.5 : 1}
              strokeOpacity={isHighlighted ? 0.85 : 0.22}
              strokeDasharray={isHighlighted ? "none" : "3 3"}
              className="transition-all duration-300"
            />

            {/* Glowing Accent Flow Indicator when active or hovered */}
            {isHighlighted && (
              <path
                d={p.d}
                stroke="var(--accent)"
                strokeWidth={3}
                strokeOpacity={0.25}
                filter="url(#particle-glow)"
              />
            )}

            {/* Animated Data Workflow Particles */}
            <circle r={isHighlighted ? 3.5 : 2.5} fill="var(--accent)" filter="url(#particle-glow)">
              <animateMotion
                dur={`${p.flowDuration}s`}
                begin={`${p.flowDelay}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${p.id}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0.2;1;1;0.2"
                keyTimes="0;0.2;0.8;1"
                dur={`${p.flowDuration}s`}
                begin={`${p.flowDelay}s`}
                repeatCount="indefinite"
              />
            </circle>

            {/* Secondary trail particle for realistic data transmission */}
            <circle r={1.5} fill="var(--accent)" opacity="0.6">
              <animateMotion
                dur={`${p.flowDuration}s`}
                begin={`${p.flowDelay + 0.3}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${p.id}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
