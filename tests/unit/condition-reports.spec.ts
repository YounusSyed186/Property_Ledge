import { test, expect } from '@playwright/test';
import {
  getItemsForRoomType,
  KITCHEN_ITEMS,
  BATHROOM_ITEMS,
  BEDROOM_ITEMS,
  SAFETY_GENERAL_ITEMS,
  STANDARD_INSPECTION_ITEMS,
  FullConditionReportData,
} from '@/types/condition-report';
import { compareConditionReports } from '@/lib/inspections/comparison-engine';
import { generateConditionReportPDF } from '@/lib/pdf/condition-report-pdf';

test.describe('PropertyLedge Unified Condition Report & Inspection Engine QA Suite', () => {
  test.describe('1. Room-Specific Checklist & NSW Schedule 2 Item Mappings', () => {
    test('returns tailored items for Kitchen areas conforming to Schedule 2', () => {
      const items = getItemsForRoomType('Main Kitchen & Pantry');
      expect(items).toEqual(KITCHEN_ITEMS);
      expect(items).toContain('Oven / griller');
      expect(items).toContain('Stove top / hot plates');
      expect(items).toContain('Benchtops / tiling');
      expect(items).toContain('Sink / taps / disposal unit');
      expect(items).toContain('Dishwasher');
    });

    test('returns tailored items for Bathroom and Ensuite areas conforming to Schedule 2', () => {
      const bathItems = getItemsForRoomType('Master Bathroom');
      const ensuiteItems = getItemsForRoomType('Ensuite');
      expect(bathItems).toContain('Shower / screen / taps');
      expect(bathItems).toContain('Toilet / cistern / seat');
      expect(bathItems).toContain('Mirror / cabinet / vanity');
      expect(ensuiteItems).toContain('Shower / screen / taps');
      expect(ensuiteItems).toContain('Doors / doorway frame');
    });

    test('returns tailored items for Bedroom and Lounge areas conforming to Schedule 2', () => {
      const bedItems = getItemsForRoomType('Bedroom 1');
      const livingItems = getItemsForRoomType('Lounge Room');
      expect(bedItems).toContain('Built-in wardrobe / shelves');
      expect(bedItems).toContain('Windows / screens / window safety devices');
      expect(livingItems).toContain('Walls / picture hooks');
      expect(livingItems).toContain('Lights / power points');
    });

    test('returns statutory items for Security & Safety sections conforming to Schedule 2', () => {
      const safetyItems = getItemsForRoomType('Security / Safety');
      expect(safetyItems).toEqual(SAFETY_GENERAL_ITEMS);
      expect(safetyItems).toContain('Smoke alarms');
      expect(safetyItems).toContain('Electrical safety switch');
      expect(safetyItems).toContain('External door locks');
      expect(safetyItems).toContain('Window locks');
    });

    test('falls back to standard items for custom room names', () => {
      const fallbackItems = getItemsForRoomType('Workshop Shed');
      expect(fallbackItems).toEqual(STANDARD_INSPECTION_ITEMS);
    });
  });

  test.describe('2. Historical Comparison Engine (Incoming vs Routine vs Outgoing)', () => {
    const mockBaselineReport: FullConditionReportData = {
      report: {
        id: 'cr-baseline-001',
        workspace_id: 'ws-test',
        property_id: 'prop-test',
        lease_id: 'lease-test',
        inspector_id: 'user-001',
        type: 'Move In',
        inspection_date: '2026-01-15',
        inspector_name: 'Sarah Jenkins',
        status: 'Completed',
        notes: 'Initial move-in inspection',
        signature_manager: 'data:image/png;base64,mock',
        signature_tenant: 'data:image/png;base64,mock',
        signature_landlord: null,
        completed_at: '2026-01-15T10:00:00Z',
        created_at: '2026-01-15T09:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
      },
      rooms: [
        { id: 'room-kitch', report_id: 'cr-baseline-001', name: 'Kitchen', status: 'Completed', room_order: 0, created_at: '2026-01-15T09:00:00Z' },
        { id: 'room-bed1', report_id: 'cr-baseline-001', name: 'Bedroom 1', status: 'Completed', room_order: 1, created_at: '2026-01-15T09:00:00Z' },
      ],
      items: [
        { id: 'item-k-floor', room_id: 'room-kitch', name: 'Floor / Tiles', rating: 'Good', created_at: '2026-01-15T09:00:00Z' },
        { id: 'item-k-bench', room_id: 'room-kitch', name: 'Benchtops / Tiling', rating: 'Excellent', created_at: '2026-01-15T09:00:00Z' },
        { id: 'item-k-oven', room_id: 'room-kitch', name: 'Oven / Trays', rating: 'Needs Repair', created_at: '2026-01-15T09:00:00Z' },
        { id: 'item-b-walls', room_id: 'room-bed1', name: 'Walls', rating: 'Good', created_at: '2026-01-15T09:00:00Z' },
      ],
      defects: [
        { id: 'def-k-oven', room_id: 'room-kitch', item_name: 'Oven / Trays', notes: 'Heating element loose', severity: 'Minor', created_at: '2026-01-15T09:00:00Z' },
      ],
      photos: [
        { id: 'photo-k-1', room_id: 'room-kitch', photo_url: 'data:image/png;base64,mock', created_at: '2026-01-15T09:00:00Z' },
      ],
    };

    test('Incoming inspection without baseline returns standalone metrics', () => {
      const summary = compareConditionReports(mockBaselineReport, null);
      expect(summary.baselineReportId).toBeNull();
      expect(summary.totalRoomsCompared).toBe(2);
      expect(summary.totalItemsCompared).toBe(4);
      expect(summary.changedItemsCount).toBe(0);
      expect(summary.degradedItemsCount).toBe(0);
    });

    test('Outgoing inspection accurately detects degraded items and new defects', () => {
      const mockOutgoingReport: FullConditionReportData = {
        report: {
          id: 'cr-outgoing-002',
          workspace_id: 'ws-test',
          property_id: 'prop-test',
          lease_id: 'lease-test',
          baseline_report_id: 'cr-baseline-001',
          inspector_id: 'user-001',
          type: 'Move Out',
          inspection_date: '2026-09-29',
          inspector_name: 'Sarah Jenkins',
          status: 'Draft',
          notes: 'End of lease exit inspection',
          signature_manager: null,
          signature_tenant: null,
          signature_landlord: null,
          completed_at: null,
          created_at: '2026-09-29T09:00:00Z',
          updated_at: '2026-09-29T09:00:00Z',
        },
        rooms: [
          { id: 'out-room-kitch', report_id: 'cr-outgoing-002', name: 'Kitchen', status: 'Completed', room_order: 0, created_at: '2026-09-29T09:00:00Z' },
          { id: 'out-room-bed1', report_id: 'cr-outgoing-002', name: 'Bedroom 1', status: 'Completed', room_order: 1, created_at: '2026-09-29T09:00:00Z' },
        ],
        items: [
          // Degraded: Floor went from Good -> Damaged
          { id: 'out-k-floor', room_id: 'out-room-kitch', name: 'Floor / Tiles', rating: 'Damaged', created_at: '2026-09-29T09:00:00Z' },
          // Unchanged: Benchtops still Excellent
          { id: 'out-k-bench', room_id: 'out-room-kitch', name: 'Benchtops / Tiling', rating: 'Excellent', created_at: '2026-09-29T09:00:00Z' },
          // Improved: Oven repaired from Needs Repair -> Good
          { id: 'out-k-oven', room_id: 'out-room-kitch', name: 'Oven / Trays', rating: 'Good', created_at: '2026-09-29T09:00:00Z' },
          // Unchanged: Bedroom walls
          { id: 'out-b-walls', room_id: 'out-room-bed1', name: 'Walls', rating: 'Good', created_at: '2026-09-29T09:00:00Z' },
        ],
        defects: [
          { id: 'out-def-floor', room_id: 'out-room-kitch', item_name: 'Floor / Tiles', notes: 'Cracked tile near sink', severity: 'Major', created_at: '2026-09-29T09:00:00Z' },
        ],
        photos: [
          { id: 'out-photo-1', room_id: 'out-room-kitch', defect_id: 'out-def-floor', photo_url: 'data:image/png;base64,mock', created_at: '2026-09-29T09:00:00Z' },
        ],
      };

      const summary = compareConditionReports(mockOutgoingReport, mockBaselineReport);

      expect(summary.baselineReportId).toBe('cr-baseline-001');
      expect(summary.totalRoomsCompared).toBe(2);
      expect(summary.totalItemsCompared).toBe(4);
      expect(summary.changedItemsCount).toBe(2); // Floor degraded + Oven improved
      expect(summary.degradedItemsCount).toBe(1); // Floor: Good -> Damaged
      expect(summary.improvedItemsCount).toBe(1); // Oven: Needs Repair -> Good
      expect(summary.newDefectsCount).toBe(1); // Cracked tile defect

      const kitchenDiff = summary.roomComparisons.find((r) => r.roomName === 'Kitchen');
      expect(kitchenDiff).toBeDefined();

      const floorDiff = kitchenDiff?.itemsCompared.find((i) => i.itemName === 'Floor / Tiles');
      expect(floorDiff?.changed).toBe(true);
      expect(floorDiff?.severity).toBe('degraded');
      expect(floorDiff?.previousRating).toBe('Good');
      expect(floorDiff?.currentRating).toBe('Damaged');

      const benchDiff = kitchenDiff?.itemsCompared.find((i) => i.itemName === 'Benchtops / Tiling');
      expect(benchDiff?.changed).toBe(false);
      expect(benchDiff?.severity).toBe('unchanged');

      const ovenDiff = kitchenDiff?.itemsCompared.find((i) => i.itemName === 'Oven / Trays');
      expect(ovenDiff?.changed).toBe(true);
      expect(ovenDiff?.severity).toBe('improved');
    });
  });

  test.describe('3. Unified Condition Report PDF Generation', () => {
    test('generates Incoming Condition Report PDF with clean layout and signatures', () => {
      const mockIncoming: FullConditionReportData = {
        report: {
          id: 'cr-pdf-in',
          workspace_id: 'ws-test',
          property_id: 'prop-test',
          lease_id: 'lease-test',
          inspector_id: 'user-001',
          type: 'Move In',
          inspection_date: '2026-09-29',
          inspector_name: 'John Smith (Property Manager)',
          status: 'Completed',
          notes: 'Standard Move-in baseline report',
          signature_manager: null,
          signature_tenant: null,
          signature_landlord: null,
          completed_at: '2026-09-29T11:00:00Z',
          created_at: '2026-09-29T10:00:00Z',
          updated_at: '2026-09-29T11:00:00Z',
          properties: {
            id: 'prop-test',
            name: 'Harbourview Penthouse',
            address_line_1: '100 George Street',
            city: 'Sydney',
            state: 'NSW',
            postal_code: '2000',
          },
        },
        rooms: [
          { id: 'r1', report_id: 'cr-pdf-in', name: 'Entrance / Hall', status: 'Completed', room_order: 0, created_at: '2026-09-29T10:00:00Z' },
          { id: 'r2', report_id: 'cr-pdf-in', name: 'Kitchen', status: 'Completed', room_order: 1, created_at: '2026-09-29T10:00:00Z' },
        ],
        items: [
          { id: 'it1', room_id: 'r1', name: 'Floor', rating: 'Good', created_at: '2026-09-29T10:00:00Z' },
          { id: 'it2', room_id: 'r1', name: 'Walls', rating: 'Good', created_at: '2026-09-29T10:00:00Z' },
          { id: 'it3', room_id: 'r2', name: 'Oven / Trays', rating: 'Excellent', created_at: '2026-09-29T10:00:00Z' },
        ],
        defects: [],
        photos: [],
      };

      const doc = generateConditionReportPDF(mockIncoming);
      expect(doc).toBeDefined();
      const pageCount = (doc.internal as any).getNumberOfPages();
      expect(pageCount).toBeGreaterThanOrEqual(3); // Cover + Rooms + Safety/Signatures
    });

    test('generates Outgoing Condition Report PDF with dedicated Historical Comparison matrix', () => {
      const mockOutgoingWithBaseline: FullConditionReportData = {
        report: {
          id: 'cr-pdf-out',
          workspace_id: 'ws-test',
          property_id: 'prop-test',
          lease_id: 'lease-test',
          baseline_report_id: 'cr-pdf-in',
          inspector_id: 'user-001',
          type: 'Move Out',
          inspection_date: '2026-09-29',
          inspector_name: 'John Smith (Property Manager)',
          status: 'Completed',
          notes: 'Outgoing tenancy inspection with baseline comparison',
          signature_manager: null,
          signature_tenant: null,
          signature_landlord: null,
          completed_at: '2026-09-29T11:00:00Z',
          created_at: '2026-09-29T10:00:00Z',
          updated_at: '2026-09-29T11:00:00Z',
          properties: {
            id: 'prop-test',
            name: 'Harbourview Penthouse',
            address_line_1: '100 George Street',
            city: 'Sydney',
            state: 'NSW',
            postal_code: '2000',
          },
        },
        rooms: [
          { id: 'r1', report_id: 'cr-pdf-out', name: 'Kitchen', status: 'Completed', room_order: 0, created_at: '2026-09-29T10:00:00Z' },
        ],
        items: [
          { id: 'it1', room_id: 'r1', name: 'Floor / Tiles', rating: 'Damaged', created_at: '2026-09-29T10:00:00Z' },
          { id: 'it2', room_id: 'r1', name: 'Oven / Trays', rating: 'Good', created_at: '2026-09-29T10:00:00Z' },
        ],
        defects: [
          { id: 'def1', room_id: 'r1', item_name: 'Floor / Tiles', notes: 'Cracked tile near sink', severity: 'Major', created_at: '2026-09-29T10:00:00Z' },
        ],
        photos: [],
        baselineReport: {
          report: {
            id: 'cr-pdf-in',
            workspace_id: 'ws-test',
            property_id: 'prop-test',
            lease_id: 'lease-test',
            inspector_id: 'user-001',
            type: 'Move In',
            inspection_date: '2026-01-15',
            inspector_name: 'John Smith',
            status: 'Completed',
            notes: 'Move In',
            signature_manager: null,
            signature_tenant: null,
            signature_landlord: null,
            completed_at: '2026-01-15T11:00:00Z',
            created_at: '2026-01-15T10:00:00Z',
            updated_at: '2026-01-15T11:00:00Z',
          },
          rooms: [
            { id: 'base-r1', report_id: 'cr-pdf-in', name: 'Kitchen', status: 'Completed', room_order: 0, created_at: '2026-01-15T10:00:00Z' },
          ],
          items: [
            { id: 'base-it1', room_id: 'base-r1', name: 'Floor / Tiles', rating: 'Good', created_at: '2026-01-15T10:00:00Z' },
            { id: 'base-it2', room_id: 'base-r1', name: 'Oven / Trays', rating: 'Good', created_at: '2026-01-15T10:00:00Z' },
          ],
          defects: [],
          photos: [],
        },
      };

      const doc = generateConditionReportPDF(mockOutgoingWithBaseline);
      expect(doc).toBeDefined();
      const pageCount = (doc.internal as any).getNumberOfPages();
      // Should include cover, comparison page, room page, safety page, signatures page
      expect(pageCount).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('4. NSW Schedule 2 Statutory Data & Metadata Engine', () => {
    test('accurately parses and serializes Schedule 2 statutory metadata with delimiters', () => {
      const { parseSchedule2Data, serializeSchedule2Data, DEFAULT_SCHEDULE_2_DATA } = require('@/types/condition-report');

      const plainNotes = 'Tenant reported keys collected at 10am.';
      const testStatutory = {
        ...DEFAULT_SCHEDULE_2_DATA,
        minimumStandards: {
          ...DEFAULT_SCHEDULE_2_DATA.minimumStandards,
          structurallySound: true,
          adequateLighting: true,
          electricitySupplied: true,
          waterSupply: true,
          bathroomPrivacy: true,
        },
        smokeAlarms: {
          ...DEFAULT_SCHEDULE_2_DATA.smokeAlarms,
          installedCorrectly: true,
          checkedAndWorking: true,
          dateLastChecked: '2026-09-01',
          batteriesReplaced12Months: true,
        },
        waterEfficiency: {
          ...DEFAULT_SCHEDULE_2_DATA.waterEfficiency,
          separatelyMetered: true,
          showerheadsMax9L: true,
          toiletsDualFlushWels3Star: true,
          waterMeterStart: '004523.8',
          waterMeterStartDate: '2026-10-01',
        },
        workCommitments: [
          {
            id: 'wc-1',
            description: 'Fix laundry tap washer leak',
            completionDueDate: '2026-10-15',
            status: 'Open',
          },
        ],
        itemDetailsMap: {
          'it-kitchen-bench': {
            clean: true,
            undamaged: false,
            working: true,
            landlordComments: 'Small hairline chip near sink edge',
            tenantComments: 'Agreed, noted on move-in',
            tenantAgrees: true,
          },
        },
      };

      const serialized = serializeSchedule2Data(plainNotes, testStatutory);
      expect(serialized).toContain('---SCHEDULE_2_METADATA---');
      expect(serialized).toContain('Tenant reported keys collected at 10am.');

      const { plainNotes: parsedNotes, statutory: parsedStatutory } = parseSchedule2Data(serialized);
      expect(parsedNotes).toBe('Tenant reported keys collected at 10am.');
      expect(parsedStatutory.minimumStandards.structurallySound).toBe(true);
      expect(parsedStatutory.smokeAlarms.checkedAndWorking).toBe(true);
      expect(parsedStatutory.smokeAlarms.dateLastChecked).toBe('2026-09-01');
      expect(parsedStatutory.waterEfficiency.waterMeterStart).toBe('004523.8');
      expect(parsedStatutory.workCommitments).toHaveLength(1);
      expect(parsedStatutory.workCommitments[0].description).toBe('Fix laundry tap washer leak');
      expect(parsedStatutory.itemDetailsMap['it-kitchen-bench'].undamaged).toBe(false);
      expect(parsedStatutory.itemDetailsMap['it-kitchen-bench'].landlordComments).toBe('Small hairline chip near sink edge');
    });

    test('handles empty and legacy unformatted notes safely with default fallbacks', () => {
      const { parseSchedule2Data } = require('@/types/condition-report');

      const legacyResult = parseSchedule2Data('Old legacy notes from 2024 without metadata.');
      expect(legacyResult.plainNotes).toBe('Old legacy notes from 2024 without metadata.');
      expect(legacyResult.statutory).toBeDefined();
      expect(legacyResult.statutory.minimumStandards.structurallySound).toBe(true);
      expect(legacyResult.statutory.workCommitments).toEqual([]);

      const emptyResult = parseSchedule2Data(null);
      expect(emptyResult.plainNotes).toBe('');
      expect(emptyResult.statutory).toBeDefined();
      expect(emptyResult.statutory.waterEfficiency.separatelyMetered).toBe(true);
    });
  });
});

