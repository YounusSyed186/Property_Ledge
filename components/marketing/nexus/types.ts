import { LucideIcon } from "lucide-react";

export interface NexusModuleData {
  id: string;
  name: string;
  icon: LucideIcon;
  angle: number; // Angle in degrees on orbit ring
  description: string;
  activityLabel: string;
}

export interface NexusNodePosition {
  x: number;
  y: number;
}
