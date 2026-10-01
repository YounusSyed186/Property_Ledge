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

export interface InspectionItemDetails {
  clean?: boolean | null;
  undamaged?: boolean | null;
  working?: boolean | null;
  landlordComments?: string;
  tenantComments?: string;
  tenantAgrees?: boolean | null;
}

export interface RoomTemplateConfig {
  name: string;
  count: number;
}

// Full NSW Government Schedule 2 Standard Room Structure
export const DEFAULT_ROOM_TEMPLATES: RoomTemplateConfig[] = [
  { name: 'Entrance / Hall', count: 1 },
  { name: 'Lounge Room', count: 1 },
  { name: 'Dining Room', count: 1 },
  { name: 'Kitchen', count: 1 },
  { name: 'Bedroom 1', count: 1 },
  { name: 'Ensuite', count: 1 },
  { name: 'Bedroom 2', count: 1 },
  { name: 'Bedroom 3', count: 1 },
  { name: 'Bathroom', count: 1 },
  { name: 'Laundry', count: 1 },
  { name: 'Security / Safety', count: 1 },
  { name: 'General', count: 1 },
];

// NSW Schedule 2 Room Item Definitions
export const NSW_ENTRANCE_HALL_ITEMS: string[] = [
  'Front door / screen door / security door',
  'Walls / picture hooks',
  'Doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points / door bell',
  'Skirting boards',
  'Floor coverings',
  'Other',
];

export const NSW_LOUNGE_ROOM_ITEMS: string[] = [
  'Walls / picture hooks',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Skirting boards',
  'Floor coverings',
  'Other',
];

export const NSW_DINING_ROOM_ITEMS: string[] = [
  'Walls / picture hooks',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Skirting boards',
  'Floor coverings',
  'Other',
];

export const NSW_KITCHEN_ITEMS: string[] = [
  'Walls / picture hooks',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Skirting boards',
  'Floor coverings',
  'Cupboards / drawers',
  'Benchtops / tiling',
  'Sink / taps / disposal unit',
  'Stove top / hot plates',
  'Oven / griller',
  'Exhaust fan / range hood',
  'Dishwasher',
  'Other',
];

export const NSW_BEDROOM_ITEMS: string[] = [
  'Walls / picture hooks',
  'Built-in wardrobe / shelves',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Skirting boards',
  'Floor coverings',
  'Other',
];

export const NSW_ENSUITE_ITEMS: string[] = [
  'Walls / tiles',
  'Floor tiles / floor coverings',
  'Doors / doorway frame',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Bath / taps',
  'Shower / screen / taps',
  'Wash basin / taps',
  'Mirror / cabinet / vanity',
  'Towel rails',
  'Toilet / cistern / seat',
  'Toilet roll holder',
  'Heating / exhaust fan / vent',
  'Other',
];

export const NSW_BATHROOM_ITEMS: string[] = [
  'Walls / tiles',
  'Floor tiles / floor coverings',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Bath / taps',
  'Shower / screen / taps',
  'Wash basin / taps',
  'Mirror / cabinet / vanity',
  'Towel rails',
  'Toilet / cistern / seat',
  'Toilet roll holder',
  'Heating / exhaust fan / vent',
  'Other',
];

export const NSW_LAUNDRY_ITEMS: string[] = [
  'Walls / tiles',
  'Floor tiles / floor coverings',
  'Doors / doorway frames',
  'Windows / screens / window safety devices',
  'Ceiling / light fittings',
  'Blinds / curtains',
  'Lights / power points',
  'Washing machine / taps',
  'Exhaust fan / vent',
  'Washing tub',
  'Dryer',
  'Other',
];

export const NSW_SECURITY_SAFETY_ITEMS: string[] = [
  'External door locks',
  'Window locks',
  'Keys',
  'Security / alarm system',
  'Smoke alarms',
  'Electrical safety switch',
  'Other',
];

export const NSW_GENERAL_ITEMS: string[] = [
  'Heating / air conditioning',
  'Staircase / handrails',
  'External television antenna / TV points',
  'Balcony / porch / deck',
  'Swimming pool',
  'Swimming pool fence / gate',
  'Gates / fences',
  'Grounds / garden',
  'Garden hose / fittings',
  'Watering system',
  'Lawns / edges',
  'Letter box / street number',
  'Water tanks / septic tanks',
  'Garbage bins',
  'Paving / driveways',
  'Clothesline',
  'Garage / carport / storeroom',
  'Garden shed',
  'Hot water system',
  'Gutters / downpipe',
  'Other',
];

// Backwards-compatible item mappings
export const STANDARD_INSPECTION_ITEMS: string[] = NSW_LOUNGE_ROOM_ITEMS;
export const KITCHEN_ITEMS: string[] = NSW_KITCHEN_ITEMS;
export const BATHROOM_ITEMS: string[] = NSW_BATHROOM_ITEMS;
export const BEDROOM_ITEMS: string[] = NSW_BEDROOM_ITEMS;
export const SAFETY_GENERAL_ITEMS: string[] = NSW_SECURITY_SAFETY_ITEMS;

/**
 * Returns tailored checklist items based on room name category matching NSW Schedule 2.
 */
export function getItemsForRoomType(roomName: string): string[] {
  const lower = roomName.toLowerCase();
  if (lower.includes('entrance') || lower.includes('hall')) {
    return NSW_ENTRANCE_HALL_ITEMS;
  }
  if (lower.includes('kitchen')) {
    return NSW_KITCHEN_ITEMS;
  }
  if (lower.includes('ensuite')) {
    return NSW_ENSUITE_ITEMS;
  }
  if (lower.includes('bath') || lower.includes('powder') || lower.includes('toilet')) {
    return NSW_BATHROOM_ITEMS;
  }
  if (lower.includes('dining')) {
    return NSW_DINING_ROOM_ITEMS;
  }
  if (lower.includes('lounge') || lower.includes('living')) {
    return NSW_LOUNGE_ROOM_ITEMS;
  }
  if (lower.includes('bed')) {
    return NSW_BEDROOM_ITEMS;
  }
  if (lower.includes('laundry')) {
    return NSW_LAUNDRY_ITEMS;
  }
  if (lower.includes('security') || lower.includes('safety') || lower.includes('statutory')) {
    return NSW_SECURITY_SAFETY_ITEMS;
  }
  if (lower.includes('general') || lower.includes('grounds') || lower.includes('exterior') || lower.includes('garage') || lower.includes('balcony')) {
    return NSW_GENERAL_ITEMS;
  }
  return NSW_LOUNGE_ROOM_ITEMS;
}

// --- NSW Statutory Schedule 2 Sections Data Models ---

export interface MinimumStandardsData {
  structurallySound: boolean | null;
  adequateLighting: boolean | null;
  adequateVentilation: boolean | null;
  adequateElectricityGasOutlets: boolean | null;
  adequatePlumbingDrainage: boolean | null;
  suppliedElectricity: boolean | null;
  suppliedGas: boolean | null;
  connectedWaterSupply: boolean | null;
  bathroomFacilitiesPrivacy: boolean | null;
  tenantAgrees: boolean | null;
  tenantDisagreedItems?: string;
}

export interface HealthIssuesData {
  mouldOrDampness: boolean | null;
  pestsOrVermin: boolean | null;
  rubbishOnPremises: boolean | null;
  looseFillAsbestosRegister: boolean | null;
  notes?: string;
}

export interface SmokeAlarmsData {
  installedCompliantEPA1979: boolean | null;
  checkedAndWorking: boolean | null;
  dateLastChecked?: string;
  removableBatteriesReplaced12Months: boolean | null | 'N/A';
  dateRemovableBatteriesChanged?: string;
  lithiumBatteriesReplacedPeriod: boolean | null | 'N/A';
  dateLithiumBatteriesChanged?: string;
}

export interface OtherSafetyIssuesData {
  damagedAppliances: boolean | null;
  electricalHazards: boolean | null;
  gasHazards: boolean | null;
  tenantAgrees: boolean | null;
  tenantDisagreedItems?: string;
}

export interface CommunicationFacilitiesData {
  telephoneLineConnected: boolean | null;
  internetLineConnected: boolean | null;
}

export interface WaterEfficiencyData {
  separatelyMetered: boolean | null;
  showerheadsMax9Lpm: boolean | null;
  toiletsDualFlush3StarWELS: boolean | null | 'N/A';
  internalTapsMax9Lpm: boolean | null;
  leaksFixed: boolean | null;
  dateLastChecked?: string;
  waterMeterStartReading?: string;
  waterMeterStartDate?: string;
  waterMeterEndReading?: string;
  waterMeterEndDate?: string;
}

export interface FurnitureData {
  furnitureIncluded: boolean | null;
  attachedListNotes?: string;
}

export interface WorkDoneDatesData {
  smokeAlarmsWorkDate?: string;
  externalPaintingDate?: string;
  internalPaintingDate?: string;
  flooringDate?: string;
  additionalComments?: string;
}

export interface LandlordWorkCommitmentItem {
  id: string;
  description: string;
  completionDueDate?: string;
  signature?: string | null;
  signatureDate?: string;
  status?: 'Open' | 'In Progress' | 'Completed';
  responsible?: string;
}

export interface SignaturesData {
  startTenancyLandlordSig?: string | null;
  startTenancyLandlordDate?: string;
  startTenancyTenantSig?: string | null;
  startTenancyTenantDate?: string;
  endTenancyLandlordSig?: string | null;
  endTenancyLandlordDate?: string;
  endTenancyTenantSig?: string | null;
  endTenancyTenantDate?: string;
}

export interface Schedule2StatutoryData {
  minimumStandards: MinimumStandardsData;
  healthIssues: HealthIssuesData;
  smokeAlarms: SmokeAlarmsData;
  safetyIssues: OtherSafetyIssuesData;
  communicationFacilities: CommunicationFacilitiesData;
  waterEfficiency: WaterEfficiencyData;
  furniture: FurnitureData;
  workDoneDates: WorkDoneDatesData;
  workCommitments: LandlordWorkCommitmentItem[];
  signatures: SignaturesData;
  itemDetailsMap?: Record<string, InspectionItemDetails>;
}

export const DEFAULT_SCHEDULE_2_DATA: Schedule2StatutoryData = {
  minimumStandards: {
    structurallySound: true,
    adequateLighting: true,
    adequateVentilation: true,
    adequateElectricityGasOutlets: true,
    adequatePlumbingDrainage: true,
    suppliedElectricity: true,
    suppliedGas: true,
    connectedWaterSupply: true,
    bathroomFacilitiesPrivacy: true,
    tenantAgrees: true,
    tenantDisagreedItems: '',
  },
  healthIssues: {
    mouldOrDampness: false,
    pestsOrVermin: false,
    rubbishOnPremises: false,
    looseFillAsbestosRegister: false,
    notes: '',
  },
  smokeAlarms: {
    installedCompliantEPA1979: true,
    checkedAndWorking: true,
    dateLastChecked: new Date().toISOString().split('T')[0],
    removableBatteriesReplaced12Months: true,
    dateRemovableBatteriesChanged: new Date().toISOString().split('T')[0],
    lithiumBatteriesReplacedPeriod: 'N/A',
    dateLithiumBatteriesChanged: '',
  },
  safetyIssues: {
    damagedAppliances: false,
    electricalHazards: false,
    gasHazards: false,
    tenantAgrees: true,
    tenantDisagreedItems: '',
  },
  communicationFacilities: {
    telephoneLineConnected: true,
    internetLineConnected: true,
  },
  waterEfficiency: {
    separatelyMetered: true,
    showerheadsMax9Lpm: true,
    toiletsDualFlush3StarWELS: true,
    internalTapsMax9Lpm: true,
    leaksFixed: true,
    dateLastChecked: new Date().toISOString().split('T')[0],
    waterMeterStartReading: '',
    waterMeterStartDate: new Date().toISOString().split('T')[0],
    waterMeterEndReading: '',
    waterMeterEndDate: '',
  },
  furniture: {
    furnitureIncluded: false,
    attachedListNotes: '',
  },
  workDoneDates: {
    smokeAlarmsWorkDate: '',
    externalPaintingDate: '',
    internalPaintingDate: '',
    flooringDate: '',
    additionalComments: '',
  },
  workCommitments: [],
  signatures: {
    startTenancyLandlordSig: null,
    startTenancyLandlordDate: new Date().toISOString().split('T')[0],
    startTenancyTenantSig: null,
    startTenancyTenantDate: new Date().toISOString().split('T')[0],
    endTenancyLandlordSig: null,
    endTenancyLandlordDate: '',
    endTenancyTenantSig: null,
    endTenancyTenantDate: '',
  },
  itemDetailsMap: {},
};

/**
 * Parses structured Schedule 2 data safely from raw notes text or returns default.
 */
export function parseSchedule2Data(rawNotes?: string | null): {
  plainNotes: string;
  statutory: Schedule2StatutoryData;
} {
  if (!rawNotes) {
    return { plainNotes: '', statutory: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_2_DATA)) };
  }

  const marker = '---SCHEDULE_2_METADATA---';
  const markerIdx = rawNotes.indexOf(marker);

  if (markerIdx === -1) {
    // Try to parse as whole json
    if (rawNotes.trim().startsWith('{') && rawNotes.includes('minimumStandards')) {
      try {
        const parsed = JSON.parse(rawNotes.trim());
        return {
          plainNotes: parsed.plainNotes || '',
          statutory: { ...DEFAULT_SCHEDULE_2_DATA, ...parsed },
        };
      } catch {
        return { plainNotes: rawNotes, statutory: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_2_DATA)) };
      }
    }
    return { plainNotes: rawNotes, statutory: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_2_DATA)) };
  }

  const plainNotes = rawNotes.substring(0, markerIdx).trim();
  const jsonStr = rawNotes.substring(markerIdx + marker.length).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      plainNotes,
      statutory: {
        ...DEFAULT_SCHEDULE_2_DATA,
        ...parsed,
        minimumStandards: { ...DEFAULT_SCHEDULE_2_DATA.minimumStandards, ...(parsed.minimumStandards || {}) },
        healthIssues: { ...DEFAULT_SCHEDULE_2_DATA.healthIssues, ...(parsed.healthIssues || {}) },
        smokeAlarms: { ...DEFAULT_SCHEDULE_2_DATA.smokeAlarms, ...(parsed.smokeAlarms || {}) },
        safetyIssues: { ...DEFAULT_SCHEDULE_2_DATA.safetyIssues, ...(parsed.safetyIssues || {}) },
        communicationFacilities: { ...DEFAULT_SCHEDULE_2_DATA.communicationFacilities, ...(parsed.communicationFacilities || {}) },
        waterEfficiency: { ...DEFAULT_SCHEDULE_2_DATA.waterEfficiency, ...(parsed.waterEfficiency || {}) },
        furniture: { ...DEFAULT_SCHEDULE_2_DATA.furniture, ...(parsed.furniture || {}) },
        workDoneDates: { ...DEFAULT_SCHEDULE_2_DATA.workDoneDates, ...(parsed.workDoneDates || {}) },
        workCommitments: Array.isArray(parsed.workCommitments) ? parsed.workCommitments : [],
        signatures: { ...DEFAULT_SCHEDULE_2_DATA.signatures, ...(parsed.signatures || {}) },
        itemDetailsMap: parsed.itemDetailsMap || {},
      },
    };
  } catch {
    return { plainNotes, statutory: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_2_DATA)) };
  }
}

/**
 * Serializes plain notes and Schedule 2 statutory metadata for storage.
 */
export function serializeSchedule2Data(
  plainNotes: string,
  statutory: Schedule2StatutoryData
): string {
  const marker = '---SCHEDULE_2_METADATA---';
  return `${plainNotes.trim()}\n\n${marker}\n${JSON.stringify(statutory)}`;
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
  statutoryData?: Schedule2StatutoryData;
}

export interface FullConditionReportData {
  report: ConditionReport;
  rooms: InspectionRoom[];
  items: InspectionItem[];
  defects: InspectionDefect[];
  photos: InspectionPhoto[];
  baselineReport?: FullConditionReportData | null;
  schedule2Data?: Schedule2StatutoryData;
}

// --- Historical Comparison Engine Types ---

export type ComparisonItemSeverity = 'unchanged' | 'improved' | 'degraded' | 'not_compared';

export interface ItemComparisonResult {
  itemName: string;
  previousRating: ItemRating | null;
  currentRating: ItemRating | null;
  previousClean?: boolean | null;
  currentClean?: boolean | null;
  previousUndamaged?: boolean | null;
  currentUndamaged?: boolean | null;
  previousWorking?: boolean | null;
  currentWorking?: boolean | null;
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
