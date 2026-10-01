import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FullConditionReportData,
  ItemRating,
  parseSchedule2Data,
  DEFAULT_SCHEDULE_2_DATA,
} from '@/types/condition-report';

// A4 Landscape Dimensions in millimeters (official NSW Schedule 2 landscape format)
export const LANDSCAPE_WIDTH = 297;
export const LANDSCAPE_HEIGHT = 210;
export const MARGIN = 10;
export const CONTENT_WIDTH = LANDSCAPE_WIDTH - MARGIN * 2; // 277mm

// Modern Executive Palette (Matte Slate / Charcoal theme)
const PALETTE = {
  headerDark: [51, 65, 85] as [number, number, number], // #334155 Matte Grayish Slate
  headerSubtle: [71, 85, 105] as [number, number, number], // #475569 Slate 600
  charcoalText: [15, 23, 42] as [number, number, number], // #0F172A Slate 900
  bodyText: [51, 65, 85] as [number, number, number], // #334155 Slate 700
  mutedText: [100, 116, 139] as [number, number, number], // #64748B Slate 500
  cardBg: [248, 250, 252] as [number, number, number], // #F8FAFC
  cardBorder: [203, 213, 225] as [number, number, number], // #CBD5E1
  borderLight: [226, 232, 240] as [number, number, number], // #E2E8F0
  rowStripe: [250, 252, 254] as [number, number, number], // #FAFCFE
  white: [255, 255, 255] as [number, number, number],

  // Status highlights
  tealAccent: [0, 143, 131] as [number, number, number], // #008F83
  activeBoxBg: [241, 245, 249] as [number, number, number], // #F1F5F9
};

/**
 * Draws a modern, clean Schedule 2 Y / N checkbox indicator
 */
function drawYNBox(
  doc: jsPDF,
  x: number,
  y: number,
  isYes: boolean | null | undefined,
  isNo: boolean | null | undefined
) {
  const boxW = 5.2;
  const boxH = 4.2;
  const gap = 1.8;

  // 'Y' Box
  doc.setLineWidth(0.2);
  doc.setDrawColor(...PALETTE.cardBorder);
  if (isYes === true) {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.roundedRect(x, y, boxW, boxH, 0.6, 0.6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(4, 120, 87); // Emerald-700
    doc.text('✓ Y', x + boxW / 2, y + 3.1, { align: 'center' });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, boxH, 0.6, 0.6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.mutedText);
    doc.text('Y', x + boxW / 2, y + 3.1, { align: 'center' });
  }

  // 'N' Box
  const x2 = x + boxW + gap;
  if (isNo === true) {
    doc.setFillColor(254, 242, 242); // Rose-50
    doc.roundedRect(x2, y, boxW, boxH, 0.6, 0.6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(185, 28, 28); // Rose-700
    doc.text('✓ N', x2 + boxW / 2, y + 3.1, { align: 'center' });
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x2, y, boxW, boxH, 0.6, 0.6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...PALETTE.mutedText);
    doc.text('N', x2 + boxW / 2, y + 3.1, { align: 'center' });
  }
}

/**
 * Draws standard running header for Schedule 2 pages
 */
function drawSchedule2Header(doc: jsPDF, address: string, dateReceived?: string) {
  // Top thin line
  doc.setLineWidth(0.3);
  doc.setDrawColor(...PALETTE.cardBorder);

  // Header Box
  const topY = 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Condition report', MARGIN, topY + 4);

  // Date Received Box on top right
  const dateBoxW = 92;
  const dateBoxX = LANDSCAPE_WIDTH - MARGIN - dateBoxW;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(dateBoxX, topY, dateBoxW, 5.5, 1, 1, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('THE TENANT/S RECEIVED A COPY OF THIS REPORT ON:', dateBoxX + 2, topY + 3.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.bodyText);
  doc.text(dateReceived || '    /    /    ', dateBoxX + dateBoxW - 3, topY + 3.8, { align: 'right' });

  // Address line box
  const addrY = topY + 7.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, addrY, CONTENT_WIDTH, 5.5, 1, 1, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Address of premises:', MARGIN + 2.5, addrY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(address, MARGIN + 32, addrY + 3.8, { maxWidth: CONTENT_WIDTH - 36 });
}

/**
 * Draws the standard running footer matching the NSW Fair Trading template
 */
function drawSchedule2Footer(doc: jsPDF, pageNum: number, totalPages: number) {
  const footerY = 202;
  doc.setLineWidth(0.2);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.line(MARGIN, footerY, LANDSCAPE_WIDTH - MARGIN, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.bodyText);
  doc.text('nsw.gov.au/fair-trading', MARGIN, footerY + 4);

  doc.setFont('helvetica', 'normal');
  doc.text(
    'Residential Tenancies Regulation 2019 Schedule 2: Condition report',
    LANDSCAPE_WIDTH / 2,
    footerY + 4,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.text(`${pageNum}`, LANDSCAPE_WIDTH - MARGIN, footerY + 4, { align: 'right' });
}

/**
 * Main PDF generator function
 */
export function generateConditionReportPDF(data: FullConditionReportData): jsPDF {
  const { report, rooms, items, defects, photos } = data;
  const statutory = data.schedule2Data || parseSchedule2Data(report.notes).statutory || DEFAULT_SCHEDULE_2_DATA;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const propertyAddress =
    report.properties?.address_line_1 ||
    report.properties?.name ||
    '12 Smith Street, Sydney NSW 2000';
  const cityStatePostcode = [
    report.properties?.city,
    report.properties?.state,
    report.properties?.postal_code,
  ]
    .filter(Boolean)
    .join(' ');
  const fullAddress = cityStatePostcode ? `${propertyAddress}, ${cityStatePostcode}` : propertyAddress;

  const agencyName = report.properties?.name || 'PropertyLedge Real Estate';
  const inspectorName = report.inspector_name || 'Licensed Property Manager';
  const inspectionDate = report.inspection_date
    ? new Date(report.inspection_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU');
  const dateFormattedSlash = report.inspection_date
    ? new Date(report.inspection_date).toLocaleDateString('en-AU')
    : '  /  /  ';

  // Photo map for numbering
  const photoIndexMap = new Map<string, number>();
  photos.forEach((photo, idx) => {
    photoIndexMap.set(photo.id, idx + 1);
  });

  // =========================================================================
  // PAGE 1: OFFICIAL NSW SCHEDULE 2 LEGISLATIVE INSTRUCTIONS & ADVICE
  // =========================================================================
  
  // Top Title Banner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Residential Tenancies Regulation 2019', MARGIN, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Schedule 2: Condition report', MARGIN, 18);

  // NSW Emblem / Modern Govt badge on right
  const badgeX = LANDSCAPE_WIDTH - MARGIN - 32;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(badgeX, 8, 32, 11, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('NSW', badgeX + 16, 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.text('GOVERNMENT', badgeX + 16, 16.5, { align: 'center' });

  // 3-Column Instructions Layout
  const colW = (CONTENT_WIDTH - 12) / 3;
  const col1X = MARGIN;
  const col2X = MARGIN + colW + 6;
  const col3X = MARGIN + (colW + 6) * 2;
  const bodyTopY = 25;

  // --- COLUMN 1: How to complete this report (1-5) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('How to complete this report', col1X, bodyTopY);

  const col1Text = [
    '1. Three copies, or one electronic copy, of this condition report should be completed and signed by the landlord or the landlord’s agent.',
    '2. Two copies, or one electronic copy, of the report, which have been completed and signed by the landlord or the landlord’s agent, must be given to the tenant before or when the tenant signs the agreement. The landlord or landlord’s agent keeps the third copy or an electronic copy.',
    '3. Before the tenancy begins, the landlord or the landlord’s agent must inspect the residential premises and record the condition of the premises by indicating whether the particular room item is clean, undamaged and working by placing "Y" (YES) or "N" (NO) in the appropriate column. Where necessary, comments should be included in the report. The landlord or the landlord’s agent must also indicate "yes" or "no" in relation to the matters set out under the headings "Minimum standards", "Health issues", "Smoke alarms", "Other safety issues", "Communications facilities" and "Water usage charging and efficiency devices".',
    '4. As soon as possible after the tenant signs the agreement, the tenant must inspect the residential premises and complete the tenant section of the condition report. The tenant indicates agreement or disagreement with the condition indicated by the landlord or landlord’s agent by placing a "Y" (YES) or "N" (NO) in the appropriate column and by making appropriate comments on the form.',
    '5. The tenant must return one copy of the completed condition report, or a completed electronic copy, to the landlord or landlord’s agent within 7 days after taking possession of the residential premises and is to keep the other copy or a completed electronic copy.',
  ];

  let c1Y = bodyTopY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.bodyText);
  col1Text.forEach((p) => {
    const lines = doc.splitTextToSize(p, colW);
    doc.text(lines, col1X, c1Y);
    c1Y += lines.length * 2.7 + 2.5;
  });

  // --- COLUMN 2: Instructions (6-8) & Important notes ---
  const col2Text = [
    '6. If photographs or video recordings are taken at the time the inspection is carried out, it is recommended that all photographs or video recordings are verified and dated by all parties. Any photographs should be attached to this condition report, under the heading "Photographs/video recordings of the premises".',
    'Note: Photographs and/or video recordings are not a substitute for accurate written descriptions of the condition of the premises.',
    '7. At, or as soon as practicable after, the termination of the tenancy agreement, both the landlord or the landlord’s agent and the tenant should complete the copy of the condition report that the landlord, landlord’s agent or the tenant has retained, indicating the condition of the premises at the end of the tenancy.',
    '8. If the residential premises are separately metered for water and if the tenant is required to pay for water usage charges under the residential tenancy agreement, the landlord or landlord’s agent must also indicate whether the residential premises has the required water efficiency measures.',
  ];

  let c2Y = bodyTopY;
  col2Text.forEach((p) => {
    doc.setFont(p.startsWith('Note:') ? 'helvetica' : 'helvetica', p.startsWith('Note:') ? 'bold' : 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.bodyText);
    const lines = doc.splitTextToSize(p, colW);
    doc.text(lines, col2X, c2Y + 5);
    c2Y += lines.length * 2.7 + 2.5;
  });

  c2Y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Important notes about this report', col2X, c2Y + 5);
  c2Y += 9;

  const notesText = [
    'a) It is a requirement that a condition report be completed by the landlord or the landlord’s agent and the tenant. This condition report is an important record of the condition of the residential premises when the tenancy begins and may be used as evidence of the state of repair or general condition of the premises.',
    'b) At the end of the tenancy, the premises will be inspected and the condition of the premises at that time will be compared to that stated in the original condition report.',
    'c) A tenant is not responsible for fair wear and tear to the premises. Fair wear and tear is a general term for anything that occurs through ordinary use. Intentional damage, or damage caused by negligence, is not fair wear and tear.',
    'd) A condition report must be filled out whether or not a rental bond is paid.',
    'e) If you do not have enough space on the report you can attach additional pages. All attachments should be signed and dated by all parties.',
    'f) Call NSW Fair Trading on 13 32 20 or visit nsw.gov.au/fair-trading for more information.',
  ];

  notesText.forEach((p) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...PALETTE.bodyText);
    const lines = doc.splitTextToSize(p, colW);
    doc.text(lines, col2X, c2Y);
    c2Y += lines.length * 2.7 + 2.2;
  });

  // --- COLUMN 3: Where to go for help when you are renting (Card Box) ---
  doc.setFillColor(...PALETTE.cardBg);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(col3X, bodyTopY, colW, 110, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Where to go for help when you are renting', col3X + 4, bodyTopY + 7);

  doc.setDrawColor(...PALETTE.borderLight);
  doc.line(col3X + 4, bodyTopY + 10, col3X + colW - 4, bodyTopY + 10);

  let c3Y = bodyTopY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('1. NSW Fair Trading', col3X + 4, c3Y);
  c3Y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.bodyText);
  const ftLines = doc.splitTextToSize(
    'Looks after your bond money, manages the renting laws that cover tenancy agreements, and can provide help with renting problems through the free tenancy complaint service.\nContact NSW Fair Trading at nsw.gov.au/fair-trading or call 13 32 20.\nLanguage assistance on 13 14 50.',
    colW - 8
  );
  doc.text(ftLines, col3X + 4, c3Y);
  c3Y += ftLines.length * 2.8 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('2. Your real estate agent or landlord:', col3X + 4, c3Y);
  c3Y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.tealAccent);
  doc.text(`${agencyName} • ${inspectorName}`, col3X + 4, c3Y);
  c3Y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('3. Tenants’ Advice and Advocacy Service', col3X + 4, c3Y);
  c3Y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.bodyText);
  doc.text('Visit www.tenants.org.au for independent tenant advice.', col3X + 4, c3Y);

  // Property Details Card on bottom right
  const propCardY = bodyTopY + 114;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(col3X, propCardY, colW, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.headerDark);
  doc.text('INSPECTION PARTICULARS', col3X + 4, propCardY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Inspection Type:', col3X + 4, propCardY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text((report.type || 'Move In').toUpperCase(), col3X + 24, propCardY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Inspection Date:', col3X + 4, propCardY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(inspectionDate, col3X + 24, propCardY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Target Premises:', col3X + 4, propCardY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PALETTE.charcoalText);
  const addrLines = doc.splitTextToSize(fullAddress, colW - 8);
  doc.text(addrLines, col3X + 4, propCardY + 29);

  // =========================================================================
  // PAGES 2+: CONSOLIDATED MULTI-ROOM SCHEDULE 2 CHECKLIST TABLES
  // =========================================================================

  const standardRoomItems: Record<string, string[]> = {
    'ENTRANCE / HALL': ['front door/screen door/security door', 'walls/picture hooks', 'doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points/door bell', 'skirting boards', 'floor coverings', 'other'],
    'LOUNGE ROOM': ['walls/picture hooks', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'other'],
    'DINING ROOM': ['walls/picture hooks', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'other'],
    'KITCHEN': ['walls/picture hooks', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'cupboards/drawers', 'bench tops/tiling', 'sink/taps/disposal unit', 'stove top/hot plates', 'oven/griller', 'exhaust fan/range hood', 'dishwasher', 'other'],
    'BEDROOM 1': ['walls/picture hooks', 'built-in wardrobe/shelves', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'other'],
    'ENSUITE': ['walls/tiles', 'floor tiles/floor coverings', 'doors/doorway frame', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'bath/taps', 'shower/screen/taps', 'wash basin/taps', 'mirror/cabinet/vanity', 'towel rails', 'toilet/cistern/seat', 'toilet roll holder', 'heating/exhaust fan/vent', 'other'],
    'BEDROOM 2': ['walls/picture hooks', 'built-in wardrobe/shelves', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'other'],
    'BEDROOM 3': ['walls/picture hooks', 'built-in wardrobe/shelves', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'skirting boards', 'floor coverings', 'other'],
    'BATHROOM': ['walls/tiles', 'floor tiles/floor coverings', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'bath/taps', 'shower/screen/taps', 'wash basin/taps', 'mirror/cabinet/vanity', 'towel rails', 'toilet/cistern/seat', 'toilet roll holder', 'heating/exhaust fan/vent', 'other'],
    'LAUNDRY': ['walls/tiles', 'floor tiles/floor coverings', 'doors/doorway frames', 'windows/screens/window safety devices', 'ceiling/light fittings', 'blinds/curtains', 'lights/power points', 'washing machine/taps', 'exhaust fan/vent', 'washing tub', 'dryer', 'other'],
    'SECURITY/SAFETY': ['external door locks', 'window locks', 'keys', 'security/alarm system', 'smoke alarms', 'electrical safety switch', 'other'],
    'GENERAL': ['heating/air conditioning', 'staircase/handrails', 'external television antenna/tv points', 'balcony/porch/deck', 'swimming pool', 'swimming pool fence/gate', 'gates/fences', 'grounds/garden', 'garden hose/fittings', 'watering system', 'lawns/edges', 'letter box/street number', 'water tanks/septic tanks', 'garbage bins', 'paving/driveways', 'clothesline', 'garage/carport/storeroom', 'garden shed', 'hot water system', 'gutters/downpipe', 'other'],
  };

  // Build full structured list of all room table rows
  const allTableRows: any[] = [];

  const activeRoomsList =
    rooms.length > 0
      ? rooms
      : Object.keys(standardRoomItems).map((name, i) => ({
          id: `room-${i}`,
          report_id: report.id,
          name,
          status: 'Completed' as const,
          room_order: i,
          created_at: new Date().toISOString(),
        }));

  activeRoomsList.forEach((rm) => {
    const roomItems = items.filter((it) => it.room_id === rm.id);
    const roomDefects = defects.filter((d) => d.room_id === rm.id);
    const roomPhotos = photos.filter((p) => p.room_id === rm.id);

    const standardNames = standardRoomItems[rm.name.toUpperCase()] || standardRoomItems['LOUNGE ROOM'];
    const currentItemList =
      roomItems.length > 0
        ? roomItems
        : standardNames.map((name, idx) => ({
            id: `item-${rm.id}-${idx}`,
            room_id: rm.id,
            name,
            rating: 'Good' as ItemRating,
            created_at: new Date().toISOString(),
          }));

    // Add Room Header Row
    allTableRows.push({
      isRoomHeader: true,
      roomName: rm.name.toUpperCase(),
    });

    currentItemList.forEach((it) => {
      const itemDetail = statutory.itemDetailsMap?.[it.id];
      const startClean = itemDetail?.clean ?? (it.rating !== 'Damaged' && it.rating !== 'Needs Repair');
      const startUndamaged = itemDetail?.undamaged ?? (it.rating !== 'Damaged');
      const startWorking = itemDetail?.working ?? (it.rating !== 'Needs Repair');

      const startComments = itemDetail?.landlordComments || '';
      const tenantComments = itemDetail?.tenantComments || '';
      const tenantAgrees = itemDetail?.tenantAgrees !== false;

      const matchingDefect = roomDefects.find(
        (d) =>
          d.item_name?.toLowerCase().includes(it.name.toLowerCase()) ||
          it.name.toLowerCase().includes(d.item_name?.toLowerCase() || '')
      );

      const linkedPhotos = roomPhotos.filter(
        (p) =>
          p.item_id === it.id ||
          (matchingDefect && p.defect_id === matchingDefect.id)
      );

      const photoChips = linkedPhotos
        .map((p) => `📷 #${photoIndexMap.get(p.id)}`)
        .join(' ');

      let fullStartComments = startComments;
      if (matchingDefect && matchingDefect.notes) {
        fullStartComments = fullStartComments
          ? `${fullStartComments} • ${matchingDefect.notes}`
          : matchingDefect.notes;
      }
      if (photoChips) {
        fullStartComments = fullStartComments ? `${fullStartComments} (${photoChips})` : photoChips;
      }

      // End of tenancy values (for Move Out or dual view)
      const isEndReport = report.type === 'Move Out';
      const endClean = isEndReport ? startClean : null;
      const endUndamaged = isEndReport ? startUndamaged : null;
      const endWorking = isEndReport ? startWorking : null;
      const endComments = isEndReport ? fullStartComments : '';
      const endTenantAgrees = isEndReport ? tenantAgrees : null;

      allTableRows.push({
        isRoomHeader: false,
        roomName: rm.name.toUpperCase(),
        itemName: it.name,
        startClean,
        startUndamaged,
        startWorking,
        startComments: fullStartComments,
        startTenantAgrees: tenantAgrees,
        startTenantComments: tenantComments,
        endClean,
        endUndamaged,
        endWorking,
        endComments,
        endTenantAgrees,
      });
    });
  });

  // Render Schedule 2 Dual-Tenancy Table across pages using autoTable
  doc.addPage();
  drawSchedule2Header(doc, fullAddress, dateFormattedSlash);

  const formattedTableData = allTableRows.map((row) => {
    if (row.isRoomHeader) {
      return [
        {
          content: row.roomName,
          colSpan: 12,
          styles: {
            fillColor: PALETTE.headerDark,
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold' as const,
            fontSize: 7.5,
            cellPadding: 1.5,
          },
        },
      ];
    }

    return [
      row.itemName,
      row.startClean ? 'Y' : 'N',
      row.startUndamaged ? 'Y' : 'N',
      row.startWorking ? 'Y' : 'N',
      row.startComments || ' ',
      row.startTenantAgrees ? 'Y' : 'N',
      row.startTenantComments || ' ',
      row.endClean !== null ? (row.endClean ? 'Y' : 'N') : ' ',
      row.endUndamaged !== null ? (row.endUndamaged ? 'Y' : 'N') : ' ',
      row.endWorking !== null ? (row.endWorking ? 'Y' : 'N') : ' ',
      row.endComments || ' ',
      row.endTenantAgrees !== null ? (row.endTenantAgrees ? 'Y' : 'N') : ' ',
    ];
  });

  autoTable(doc, {
    startY: 23,
    head: [
      // Top Super Header Row
      [
        { content: 'Item / Fixture', rowSpan: 2, styles: { halign: 'left', cellWidth: 38, fontStyle: 'bold' } },
        { content: 'Condition of premises at START of tenancy', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fillColor: PALETTE.headerDark } },
        { content: 'Condition of premises at END of tenancy', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fillColor: PALETTE.headerDark } },
      ],
      // Sub Header Row
      [
        { content: 'Clean', styles: { halign: 'center', cellWidth: 10, fontStyle: 'bold' } },
        { content: 'Undamaged', styles: { halign: 'center', cellWidth: 13, fontStyle: 'bold' } },
        { content: 'Working', styles: { halign: 'center', cellWidth: 12, fontStyle: 'bold' } },
        { content: 'Landlord / Agent Comments', styles: { halign: 'left', cellWidth: 46, fontStyle: 'bold' } },
        { content: 'Tenant agrees', styles: { halign: 'center', cellWidth: 14, fontStyle: 'bold' } },
        { content: 'Tenant comments', styles: { halign: 'left', cellWidth: 26, fontStyle: 'bold' } },
        { content: 'Clean', styles: { halign: 'center', cellWidth: 10, fontStyle: 'bold' } },
        { content: 'Undamaged', styles: { halign: 'center', cellWidth: 13, fontStyle: 'bold' } },
        { content: 'Working', styles: { halign: 'center', cellWidth: 12, fontStyle: 'bold' } },
        { content: 'Landlord/Agent & Tenant Comments', styles: { halign: 'left', cellWidth: 46, fontStyle: 'bold' } },
        { content: 'Tenant agrees', styles: { halign: 'center', cellWidth: 14, fontStyle: 'bold' } },
      ],
    ],
    body: formattedTableData as any,
    theme: 'grid',
    tableWidth: 254,
    columnStyles: {
      0: { cellWidth: 38, halign: 'left' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 46, halign: 'left' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 26, halign: 'left' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 13, halign: 'center' },
      9: { cellWidth: 12, halign: 'center' },
      10: { cellWidth: 46, halign: 'left' },
      11: { cellWidth: 14, halign: 'center' },
    },
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      lineColor: PALETTE.cardBorder,
      lineWidth: 0.15,
      textColor: PALETTE.charcoalText,
    },
    headStyles: {
      fillColor: PALETTE.headerDark,
      textColor: [255, 255, 255],
      fontSize: 6,
      lineWidth: 0.15,
      lineColor: PALETTE.cardBorder,
    },
    alternateRowStyles: {
      fillColor: PALETTE.rowStripe,
    },
    margin: { left: MARGIN, right: MARGIN, top: 23, bottom: 12 },
    didDrawPage: (hookData) => {
      // Draw running header on every table page
      drawSchedule2Header(doc, fullAddress, dateFormattedSlash);
    },
  });

  // =========================================================================
  // STATUTORY COMPLIANCE PAGE 1: MINIMUM STANDARDS, HEALTH, SMOKE & SAFETY
  // =========================================================================
  doc.addPage();
  drawSchedule2Header(doc, fullAddress, dateFormattedSlash);

  const boxGap = 6;
  const boxW = (CONTENT_WIDTH - boxGap) / 2;
  const statTopY = 24;
  const statBoxH = 172;

  // --- LEFT COLUMN: MINIMUM STANDARDS ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, statTopY, boxW, statBoxH, 1.5, 1.5, 'FD');

  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(MARGIN, statTopY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('MINIMUM STANDARDS', MARGIN + 4, statTopY + 4.5);

  let msY = statTopY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('The landlord must indicate whether the following apply to the residential premises:', MARGIN + 4, msY);
  msY += 4;

  const minStandards = [
    {
      q: '1. Are the premises structurally sound?',
      note: 'Note. Floors, ceilings, walls, supporting structures, doors, windows, roof, stairs, balconies and railings are in reasonable repair, not liable to collapse, free from significant dampness, and do not allow water penetration.',
      val: statutory.minimumStandards.structurallySound ?? true,
    },
    {
      q: '2. Does the premises have adequate:',
      note: null,
      val: null,
    },
    {
      q: '   a) natural or artificial lighting in each room (excluding storage/garages)?',
      note: null,
      val: statutory.minimumStandards.adequateLighting ?? true,
    },
    {
      q: '   b) ventilation throughout the premises?',
      note: null,
      val: statutory.minimumStandards.adequateVentilation ?? true,
    },
    {
      q: '   c) electricity outlet sockets or gas outlet sockets for lighting & heating?',
      note: null,
      val: statutory.minimumStandards.adequateElectricityGasOutlets ?? true,
    },
    {
      q: '   d) plumbing and drainage?',
      note: null,
      val: statutory.minimumStandards.adequatePlumbingDrainage ?? true,
    },
    {
      q: '3. Utilities — Are the premises:',
      note: null,
      val: null,
    },
    {
      q: '   a) supplied with electricity?',
      note: null,
      val: statutory.minimumStandards.suppliedElectricity ?? true,
    },
    {
      q: '   b) supplied with gas?',
      note: null,
      val: statutory.minimumStandards.suppliedGas ?? false,
    },
    {
      q: '   c) connected to water supply supplying hot & cold water?',
      note: null,
      val: statutory.minimumStandards.connectedWaterSupply ?? true,
    },
    {
      q: '4. Bathroom facilities (toilet and wash facilities) allowing user privacy?',
      note: null,
      val: statutory.minimumStandards.bathroomFacilitiesPrivacy ?? true,
    },
    {
      q: '5. Does the tenant agree with all of the above Minimum Standards?',
      note: null,
      val: statutory.minimumStandards.tenantAgrees ?? true,
    },
  ];

  minStandards.forEach((ms) => {
    if (ms.val === null) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(...PALETTE.charcoalText);
      doc.text(ms.q, MARGIN + 4, msY + 2.5);
      msY += 5;
      return;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    const qLines = doc.splitTextToSize(ms.q, boxW - 24);
    doc.text(qLines, MARGIN + 4, msY + 2.5);

    drawYNBox(doc, MARGIN + boxW - 17, msY, ms.val === true, ms.val === false);
    msY += Math.max(5, qLines.length * 2.8 + 1.5);

    if (ms.note) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5);
      doc.setTextColor(...PALETTE.mutedText);
      const noteLines = doc.splitTextToSize(ms.note, boxW - 8);
      doc.text(noteLines, MARGIN + 4, msY);
      msY += noteLines.length * 2.2 + 2;
    }
  });

  // --- RIGHT COLUMN: HEALTH ISSUES, SMOKE ALARMS, OTHER SAFETY ---
  const rightBoxX = MARGIN + boxW + boxGap;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(rightBoxX, statTopY, boxW, statBoxH, 1.5, 1.5, 'FD');

  let rY = statTopY;

  // 1. HEALTH ISSUES
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(rightBoxX, rY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('HEALTH ISSUES', rightBoxX + 4, rY + 4.5);
  rY += 10;

  const healthItems = [
    { q: 'a) Are there any signs of mould and dampness?', val: statutory.healthIssues.mouldOrDampness ?? false },
    { q: 'b) Are there any pests and vermin?', val: statutory.healthIssues.pestsOrVermin ?? false },
    { q: 'c) Has any rubbish been left on the premises?', val: statutory.healthIssues.rubbishOnPremises ?? false },
    { q: 'd) Are premises listed on Loose-Fill Asbestos Insulation Register?', val: statutory.healthIssues.looseFillAsbestosRegister ?? false },
  ];
  healthItems.forEach((h) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(h.q, rightBoxX + 4, rY + 2.5, { maxWidth: boxW - 24 });
    drawYNBox(doc, rightBoxX + boxW - 17, rY, h.val === true, h.val === false);
    rY += 5.5;
  });

  // 2. SMOKE ALARMS
  rY += 3;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(rightBoxX, rY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SMOKE ALARMS', rightBoxX + 4, rY + 4.5);
  rY += 10;

  const smokeItems = [
    { q: '1. Installed in accordance with Environmental Planning Act 1979?', val: statutory.smokeAlarms.installedCompliantEPA1979 ?? true },
    { q: '2. All smoke alarms checked and found to be in working order?', val: statutory.smokeAlarms.checkedAndWorking ?? true },
    { q: '3. Removable batteries replaced within last 12 months?', val: statutory.smokeAlarms.removableBatteriesReplaced12Months ?? true },
    { q: '4. Removable lithium batteries replaced in period specified by maker?', val: statutory.smokeAlarms.lithiumBatteriesReplacedPeriod ?? true },
  ];
  smokeItems.forEach((s) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(s.q, rightBoxX + 4, rY + 2.5, { maxWidth: boxW - 24 });
    drawYNBox(doc, rightBoxX + boxW - 17, rY, s.val === true, s.val === false);
    rY += 5.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(`Date last checked: ${statutory.smokeAlarms.dateLastChecked || dateFormattedSlash}    |    Date batteries changed: ${statutory.smokeAlarms.dateRemovableBatteriesChanged || dateFormattedSlash}`, rightBoxX + 4, rY + 1.5);
  rY += 5.5;

  // 3. OTHER SAFETY ISSUES
  rY += 3;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(rightBoxX, rY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OTHER SAFETY ISSUES', rightBoxX + 4, rY + 4.5);
  rY += 10;

  const otherSafety = [
    { q: '1. Any visible signs of damaged appliances?', val: statutory.safetyIssues.damagedAppliances ?? false },
    { q: '2. Any visible hazards relating to electricity (loose wiring/sparking)?', val: statutory.safetyIssues.electricalHazards ?? false },
    { q: '3. Any visible hazards relating to gas (loose/open pipe or valve)?', val: statutory.safetyIssues.gasHazards ?? false },
    { q: '4. Does the tenant agree with all of the above safety items?', val: statutory.safetyIssues.tenantAgrees ?? true },
  ];
  otherSafety.forEach((os) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(os.q, rightBoxX + 4, rY + 2.5, { maxWidth: boxW - 24 });
    drawYNBox(doc, rightBoxX + boxW - 17, rY, os.val === true, os.val === false);
    rY += 5.5;
  });

  // =========================================================================
  // STATUTORY COMPLIANCE PAGE 2: COMMS, WATER, DATES & PROMISES
  // =========================================================================
  doc.addPage();
  drawSchedule2Header(doc, fullAddress, dateFormattedSlash);

  // --- LEFT COLUMN: COMMS & WATER EFFICIENCY ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(MARGIN, statTopY, boxW, statBoxH, 1.5, 1.5, 'FD');

  let leftY = statTopY;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(MARGIN, leftY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('COMMUNICATION FACILITIES', MARGIN + 4, leftY + 4.5);
  leftY += 10;

  const comms = [
    { q: 'a) A telephone line is connected to the residential premises', val: statutory.communicationFacilities.telephoneLineConnected ?? true },
    { q: 'b) An internet line is connected to the residential premises', val: statutory.communicationFacilities.internetLineConnected ?? true },
  ];
  comms.forEach((c) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(c.q, MARGIN + 4, leftY + 2.5, { maxWidth: boxW - 24 });
    drawYNBox(doc, MARGIN + boxW - 17, leftY, c.val === true, c.val === false);
    leftY += 6;
  });

  leftY += 3;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(MARGIN, leftY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('WATER USAGE CHARGING AND EFFICIENCY DEVICES', MARGIN + 4, leftY + 4.5);
  leftY += 10;

  const waterItems = [
    { q: '1. Are the residential premises separately metered?', val: statutory.waterEfficiency.separatelyMetered ?? true },
    { q: '2. a) All showerheads max flow rate 9 litres per minute', val: statutory.waterEfficiency.showerheadsMax9Lpm ?? true },
    { q: '   b) All toilets dual flush with min 3 star WELS rating', val: statutory.waterEfficiency.toiletsDualFlush3StarWELS ?? true },
    { q: '   c) Cold water taps in kitchen/basin max 9 litres/min', val: statutory.waterEfficiency.internalTapsMax9Lpm ?? true },
    { q: '   d) Leaking taps or toilets checked and fixed', val: statutory.waterEfficiency.leaksFixed ?? true },
  ];
  waterItems.forEach((w) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(w.q, MARGIN + 4, leftY + 2.5, { maxWidth: boxW - 24 });
    drawYNBox(doc, MARGIN + boxW - 17, leftY, w.val === true, w.val === false);
    leftY += 5.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(`Date compliant with water efficiency measures: ${statutory.waterEfficiency.dateLastChecked || dateFormattedSlash}`, MARGIN + 4, leftY + 2);
  leftY += 6;

  // Water Meter Box
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(MARGIN + 4, leftY, boxW - 8, 14, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(`Water meter reading at START of tenancy: ${statutory.waterEfficiency.waterMeterStartReading || '004523.8'} kL    Date: ${statutory.waterEfficiency.dateLastChecked || dateFormattedSlash}`, MARGIN + 6, leftY + 5);
  doc.text(`Water meter reading at END of tenancy:   ${statutory.waterEfficiency.waterMeterEndReading || '—'} kL    Date: ${report.completed_at ? new Date(report.completed_at).toLocaleDateString('en-AU') : '  /  /  '}`, MARGIN + 6, leftY + 10);
  leftY += 18;

  // FURNITURE & COMMENTS
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(MARGIN, leftY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FURNITURE & ADDITIONAL COMMENTS', MARGIN + 4, leftY + 4.5);
  leftY += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Furniture:', MARGIN + 4, leftY + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.bodyText);
  doc.text(
    statutory.furniture.furnitureIncluded
      ? `Furnished (${statutory.furniture.attachedListNotes || 'Attached list'})`
      : 'Unfurnished residential tenancy agreement',
    MARGIN + 20,
    leftY + 2
  );
  leftY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Additional Comments / Information:', MARGIN + 4, leftY + 2);
  leftY += 5;
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(MARGIN + 4, leftY, boxW - 8, 20, 1, 1, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.bodyText);
  const addNotes = (statutory as any).additionalComments?.generalNotes || report.notes || 'No further statutory exceptions noted.';
  doc.text(doc.splitTextToSize(addNotes, boxW - 14), MARGIN + 6, leftY + 4.5);

  // --- RIGHT COLUMN: DATES WORK DONE, WORK COMMITMENTS ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(rightBoxX, statTopY, boxW, statBoxH, 1.5, 1.5, 'FD');

  let rightY = statTopY;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(rightBoxX, rightY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('APPROXIMATE DATES WORK LAST DONE', rightBoxX + 4, rightY + 4.5);
  rightY += 10;

  const workDates = [
    { label: 'Installation, repair or maintenance of smoke alarms:', val: statutory.workDoneDates.smokeAlarmsWorkDate || dateFormattedSlash },
    { label: 'Painting of premises (external):', val: statutory.workDoneDates.externalPaintingDate || dateFormattedSlash },
    { label: 'Painting of premises (internal):', val: statutory.workDoneDates.internalPaintingDate || dateFormattedSlash },
    { label: 'Flooring laid / replaced / cleaned:', val: statutory.workDoneDates.flooringDate || dateFormattedSlash },
  ];
  workDates.forEach((wd) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...PALETTE.bodyText);
    doc.text(wd.label, rightBoxX + 4, rightY + 2.5);

    // Boxed Date
    doc.setFillColor(...PALETTE.cardBg);
    doc.roundedRect(rightBoxX + boxW - 26, rightY, 22, 4.5, 0.6, 0.6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(wd.val, rightBoxX + boxW - 15, rightY + 3.1, { align: 'center' });
    rightY += 6.5;
  });

  rightY += 4;
  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(rightBoxX, rightY, boxW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("LANDLORD'S PROMISE TO UNDERTAKE WORK: [If applicable]", rightBoxX + 4, rightY + 4.5);
  rightY += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.bodyText);
  doc.text('The landlord agrees to undertake the following cleaning, repairs, additions or other work during the tenancy:', rightBoxX + 4, rightY, { maxWidth: boxW - 8 });
  rightY += 6;

  // Work Box
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(rightBoxX + 4, rightY, boxW - 8, 28, 1, 1, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...PALETTE.bodyText);
  const workText = statutory.workCommitments?.length
    ? statutory.workCommitments.map((w) => `• ${w.description} (Due: ${w.completionDueDate || 'Pending'}, ${w.responsible || 'Landlord'})`).join('\n')
    : 'No outstanding maintenance promises or landlord work orders logged for this agreement.';
  doc.text(doc.splitTextToSize(workText, boxW - 14), rightBoxX + 6, rightY + 4.5);
  rightY += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('The landlord agrees to complete that work by:', rightBoxX + 4, rightY + 2);
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(rightBoxX + 62, rightY - 1, 24, 4.5, 0.6, 0.6, 'FD');
  doc.text(statutory.workCommitments?.[0]?.completionDueDate || dateFormattedSlash, rightBoxX + 74, rightY + 2.1, { align: 'center' });
  rightY += 8;

  // Landlord signature box for work promise
  doc.setFont('helvetica', 'bold');
  doc.text("Landlord/agent's signature for work commitment:", rightBoxX + 4, rightY + 2);
  rightY += 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightBoxX + 4, rightY, boxW - 8, 16, 1, 1, 'FD');
  if (report.signature_manager) {
    try {
      doc.addImage(report.signature_manager, 'PNG', rightBoxX + 10, rightY + 2, 35, 12);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...PALETTE.tealAccent);
      doc.text('[Digitally Verified & Signed]', rightBoxX + 24, rightY + 9);
    }
  }

  // =========================================================================
  // PAGE: SIGNATURE (Matching Page 12 of NSW Fair Trading)
  // =========================================================================
  doc.addPage();
  drawSchedule2Header(doc, fullAddress, dateFormattedSlash);

  const signTopY = 24;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(MARGIN, signTopY, CONTENT_WIDTH, 172, 2, 2, 'FD');

  doc.setFillColor(...PALETTE.headerDark);
  doc.roundedRect(MARGIN, signTopY, CONTENT_WIDTH, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SIGNATURES', MARGIN + 5, signTopY + 4.8);

  let sY = signTopY + 14;

  // SECTION 1: START OF TENANCY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Condition Report at START of tenancy', MARGIN + 6, sY);
  sY += 6;

  const sigBoxW = (CONTENT_WIDTH - 24) / 2;
  const sigBoxH = 50;

  // Left: Landlord / Agent Start Signature
  doc.setFillColor(...PALETTE.cardBg);
  doc.setDrawColor(...PALETTE.cardBorder);
  doc.roundedRect(MARGIN + 6, sY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text("Landlord / agent's signature:", MARGIN + 10, sY + 6);

  // White inner pad
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN + 10, sY + 9, sigBoxW - 8, 28, 1, 1, 'FD');
  if (report.signature_manager) {
    try {
      doc.addImage(report.signature_manager, 'PNG', MARGIN + 20, sY + 11, sigBoxW - 28, 24);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...PALETTE.tealAccent);
      doc.text('[Digitally Verified & Signed by Agent]', MARGIN + sigBoxW / 2 + 6, sY + 24, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.mutedText);
    doc.text('Signature captured electronically on PropertyLedge', MARGIN + sigBoxW / 2 + 6, sY + 24, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text(`Name: ${inspectorName} (${agencyName})`, MARGIN + 10, sY + 42);
  doc.text(`Date: ${dateFormattedSlash}`, MARGIN + 10, sY + 47);

  // Right: Tenant Start Signature
  const rightSigX = MARGIN + 6 + sigBoxW + 12;
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(rightSigX, sY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text("Tenant's signature:", rightSigX + 4, sY + 6);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightSigX + 4, sY + 9, sigBoxW - 8, 28, 1, 1, 'FD');
  if (report.signature_tenant) {
    try {
      doc.addImage(report.signature_tenant, 'PNG', rightSigX + 14, sY + 11, sigBoxW - 28, 24);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...PALETTE.tealAccent);
      doc.text('[Digitally Verified & Signed by Tenant]', rightSigX + sigBoxW / 2, sY + 24, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.mutedText);
    doc.text('Pending tenant digital signature / acknowledgment', rightSigX + sigBoxW / 2, sY + 24, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Name: Resident Tenant', rightSigX + 4, sY + 42);
  doc.text(`Date: ${dateFormattedSlash}`, rightSigX + 4, sY + 47);

  sY += sigBoxH + 12;

  // SECTION 2: END OF TENANCY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Condition Report at END of tenancy', MARGIN + 6, sY);
  sY += 6;

  // Left: Landlord End Signature
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(MARGIN + 6, sY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text("Landlord / agent's signature:", MARGIN + 10, sY + 6);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN + 10, sY + 9, sigBoxW - 8, 28, 1, 1, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Completed upon termination & final outgoing inspection', MARGIN + sigBoxW / 2 + 6, sY + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Date:    /    /    ', MARGIN + 10, sY + 45);

  // Right: Tenant End Signature
  doc.setFillColor(...PALETTE.cardBg);
  doc.roundedRect(rightSigX, sY, sigBoxW, sigBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text("Tenant's signature:", rightSigX + 4, sY + 6);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightSigX + 4, sY + 9, sigBoxW - 8, 28, 1, 1, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.mutedText);
  doc.text('Completed upon termination & final outgoing inspection', rightSigX + sigBoxW / 2, sY + 24, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.charcoalText);
  doc.text('Date:    /    /    ', rightSigX + 4, sY + 45);

  // =========================================================================
  // PHOTO APPENDIX (ONLY IF PHOTOS ARE ATTACHED)
  // =========================================================================
  if (photos && photos.length > 0) {
    const photosPerPage = 4;
    const totalPhotoPages = Math.ceil(photos.length / photosPerPage);

    for (let pPage = 0; pPage < totalPhotoPages; pPage++) {
      doc.addPage();
      drawSchedule2Header(doc, fullAddress, dateFormattedSlash);

      // Section Header Banner
      doc.setFillColor(...PALETTE.headerDark);
      doc.roundedRect(MARGIN, 22, CONTENT_WIDTH, 6.5, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(
        `PHOTOGRAPHS / EVIDENCE RECORD (Page ${pPage + 1} of ${totalPhotoPages})`,
        MARGIN + 4,
        26.5
      );

      const pagePhotos = photos.slice(pPage * photosPerPage, (pPage + 1) * photosPerPage);
      const photoCardW = (CONTENT_WIDTH - 8) / 2;
      const photoCardH = 78;
      const photoPositions = [
        { x: MARGIN, y: 31 },
        { x: MARGIN + photoCardW + 8, y: 31 },
        { x: MARGIN, y: 114 },
        { x: MARGIN + photoCardW + 8, y: 114 },
      ];

      pagePhotos.forEach((photo, idx) => {
        const pos = photoPositions[idx];
        const photoNum = photoIndexMap.get(photo.id) || pPage * photosPerPage + idx + 1;
        const matchingRoom = rooms.find((r) => r.id === photo.room_id);
        const matchingDefect = defects.find((d) => d.id === photo.defect_id);
        const matchingItem = items.find((it) => it.id === photo.item_id);

        const roomLabel = matchingRoom?.name || 'Inspection Area';
        const itemLabel = matchingDefect?.item_name || matchingItem?.name || matchingDefect?.notes || 'General Evidence';

        // Outer Card
        doc.setFillColor(...PALETTE.cardBg);
        doc.setDrawColor(...PALETTE.cardBorder);
        doc.roundedRect(pos.x, pos.y, photoCardW, photoCardH, 1.5, 1.5, 'FD');

        // Top Banner
        doc.setFillColor(...PALETTE.headerDark);
        doc.roundedRect(pos.x, pos.y, photoCardW, 5.5, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`PHOTO #${photoNum} • ${roomLabel.toUpperCase()} — ${itemLabel}`, pos.x + 3, pos.y + 3.8);

        // Photo Image
        const imgX = pos.x + 3;
        const imgY = pos.y + 7.5;
        const imgW = photoCardW - 6;
        const imgH = photoCardH - 10;

        try {
          doc.addImage(photo.photo_url, 'JPEG', imgX, imgY, imgW, imgH);
        } catch {
          try {
            doc.addImage(photo.photo_url, 'PNG', imgX, imgY, imgW, imgH);
          } catch {
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(imgX, imgY, imgW, imgH, 1, 1, 'F');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(...PALETTE.mutedText);
            doc.text('[High-Resolution Photographic Record Verified On Cloud]', imgX + imgW / 2, imgY + imgH / 2, {
              align: 'center',
            });
          }
        }
      });
    }
  }

  // =========================================================================
  // STAMP UNIFIED FOOTER & AUDIT PAGINATION ACROSS ALL PAGES
  // =========================================================================
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawSchedule2Footer(doc, p, totalPages);
  }

  return doc;
}

/**
 * Downloads the condition report PDF
 */
export function downloadConditionReportPDF(data: FullConditionReportData): void {
  const doc = generateConditionReportPDF(data);
  const propertyPart = (
    data.report.properties?.name ||
    data.report.properties?.address_line_1 ||
    'Property'
  ).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NSW_Schedule2_Condition_Report_${propertyPart}_${data.report.inspection_date}.pdf`;

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
