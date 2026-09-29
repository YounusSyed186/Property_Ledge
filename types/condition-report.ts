export type ConditionReportType = 'Move In' | 'Routine' | 'Move Out' | 'Custom';

export type ConditionReportStatus = 'Draft' | 'Completed';

export type RoomStatus = 'Incomplete' | 'Completed';

export type ItemRating =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Needs Repair'
  | 'Damaged'
  | 'Not Applicable';

export type DefectSeverity = 'Minor' | 'Moderate' | 'Major' | 'Urgent';

export interface ConditionReport {
  id: string;
  workspace_id: string;
  property_id: string;
  lease_id: string | null;
  baseline_report_id?: string | null;
  inspector_id: string | null;
  type: ConditionReportType;
  inspection_date: string;
  inspector_name: string;
  status: ConditionReportStatus;
  notes: string | null;
  signature_manager: string | null;
  signature_tenant: string | null;
  signature_landlord: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  properties?: {
    id: string;
    name?: string;
    address_line_1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
  leases?: {
    id: string;
    start_date: string;
    end_date: string | null;
    status: string;
  } | null;
  baseline_report?: {
    id: string;
    type: ConditionReportType;
    inspection_date: string;
    inspector_name: string;
    status: ConditionReportStatus;
  } | null;
  inspection_rooms?: InspectionRoomSummary[];
}

export interface InspectionRoomSummary {
  id: string;
  name: string;
  status: RoomStatus;
  room_order: number;
}

export interface InspectionRoom {
  id: string;
  report_id: string;
  name: string;
  status: RoomStatus;
  room_order: number;
  created_at: string;
}

export interface InspectionItem {
  id: string;
  room_id: string;
  name: string;
  rating: ItemRating | null;
  created_at: string;
}

export interface InspectionDefect {
  id: string;
  room_id: string;
  item_name?: string | null;
  notes: string;
  severity: DefectSeverity;
  created_at: string;
}

export interface InspectionPhoto {
  id: string;
  room_id: string;
  defect_id?: string | null;
  item_id?: string | null;
  photo_url: string;
  created_at: string;
}

export interface RoomTemplateConfig {
  name: string;
  count: number;
}

export const DEFAULT_ROOM_TEMPLATES: RoomTemplateConfig[] = [
  { name: 'Entrance / Hall', count: 1 },
  { name: 'Living Room', count: 1 },
  { name: 'Kitchen', count: 1 },
  { name: 'Bedroom', count: 3 },
  { name: 'Bathroom', count: 2 },
  { name: 'Laundry', count: 1 },
  { name: 'Balcony', count: 0 },
  { name: 'Garage', count: 1 },
  { name: 'Security & Safety', count: 1 },
];

export const STANDARD_INSPECTION_ITEMS: string[] = [
  'Walls',
  'Ceiling',
  'Floor',
  'Doors',
  'Windows',
  'Curtains/Blinds',
  'Power Points',
  'Lights',
  'Smoke Alarm',
  'Air Conditioner',
  'Cleanliness',
  'General Condition',
];

export const KITCHEN_ITEMS: string[] = [
  'Floor / Tiles',
  'Walls / Splashback',
  'Ceiling',
  'Doors / Windows / Screens',
  'Blinds / Curtains',
  'Lights / Powerpoints',
  'Benchtops / Tiling',
  'Cupboards / Drawers',
  'Sink / Taps / Disposal',
  'Stovetop / Griller',
  'Oven / Trays',
  'Exhaust Fan / Rangehood',
  'Dishwasher',
  'Cleanliness',
];

export const BATHROOM_ITEMS: string[] = [
  'Floor / Tiles',
  'Walls / Tiles',
  'Ceiling',
  'Doors / Doorframe',
  'Windows / Screens',
  'Lights / Powerpoints',
  'Mirror / Vanity / Cabinet',
  'Basin / Taps / Drain',
  'Shower / Screen / Taps',
  'Bath / Taps / Plug',
  'Toilet / Seat / Cistern',
  'Towel Rails / Hooks',
  'Exhaust Fan',
  'Cleanliness',
];

export const BEDROOM_ITEMS: string[] = [
  'Floor / Carpet',
  'Walls',
  'Ceiling',
  'Doors / Doorframe',
  'Windows / Screens / Latches',
  'Window Safety Devices',
  'Blinds / Curtains',
  'Built-in Wardrobes / Shelving',
  'Lights',
  'Power Points / Switches',
  'Air Conditioner / Heater',
  'Cleanliness',
];

export const SAFETY_GENERAL_ITEMS: string[] = [
  'Smoke Alarms (Tested & Working)',
  'Electrical Safety Switches (RCD)',
  'Water Efficiency Devices (Showerheads/Taps)',
  'Communication / Internet Line',
  'Mould / Dampness Check',
  'Locks, Keys & Security Latches',
  'Structural Integrity & Ventilation',
  'Rubbish / Grounds Cleanliness',
];

/**
 * Returns tailored checklist items based on room name category.
 */
export function getItemsForRoomType(roomName: string): string[] {
  const lower = roomName.toLowerCase();
  if (lower.includes('kitchen')) {
    return KITCHEN_ITEMS;
  }
  if (lower.includes('bath') || lower.includes('ensuite') || lower.includes('powder') || lower.includes('toilet')) {
    return BATHROOM_ITEMS;
  }
  if (lower.includes('bed') || lower.includes('living') || lower.includes('lounge') || lower.includes('dining')) {
    return BEDROOM_ITEMS;
  }
  if (lower.includes('safety') || lower.includes('security') || lower.includes('general') || lower.includes('statutory')) {
    return SAFETY_GENERAL_ITEMS;
  }
  return STANDARD_INSPECTION_ITEMS;
}

export interface CreateConditionReportInput {
  propertyId: string;
  leaseId?: string | null;
  baselineReportId?: string | null;
  inspectionType: ConditionReportType;
  inspectionDate: string;
  inspectorName: string;
  notes?: string;
  roomTemplates: RoomTemplateConfig[];
}

export interface FullConditionReportData {
  report: ConditionReport;
  rooms: InspectionRoom[];
  items: InspectionItem[];
  defects: InspectionDefect[];
  photos: InspectionPhoto[];
  baselineReport?: FullConditionReportData | null;
}

// --- Historical Comparison Engine Types ---

export type ComparisonItemSeverity = 'unchanged' | 'improved' | 'degraded' | 'not_compared';

export interface ItemComparisonResult {
  itemName: string;
  previousRating: ItemRating | null;
  currentRating: ItemRating | null;
  changed: boolean;
  severity: ComparisonItemSeverity;
  comments?: string;
  defects: InspectionDefect[];
  photosCount: number;
}

export interface RoomComparisonResult {
  roomId: string;
  roomName: string;
  itemsCompared: ItemComparisonResult[];
  changedItemsCount: number;
  degradedItemsCount: number;
  currentDefects: InspectionDefect[];
  previousDefects: InspectionDefect[];
  photosCount: number;
}

export interface InspectionComparisonSummary {
  baselineReportId?: string | null;
  baselineDate?: string | null;
  baselineType?: string | null;
  totalRoomsCompared: number;
  totalItemsCompared: number;
  changedItemsCount: number;
  degradedItemsCount: number;
  improvedItemsCount: number;
  newDefectsCount: number;
  roomComparisons: RoomComparisonResult[];
}
