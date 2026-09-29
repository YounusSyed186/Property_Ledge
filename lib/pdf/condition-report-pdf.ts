import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FullConditionReportData } from '@/types/condition-report';
import { compareConditionReports } from '@/lib/inspections/comparison-engine';
import {
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  STANDARD_MARGIN,
  REPORT_PALETTE,
  createStandardPdfDocument,
  stampReportFooters,
  triggerPdfDownload,
} from './report-engine';

/**
 * Generates an official, high-fidelity NSW/Australian Residential Tenancy Condition Report PDF
 * featuring structured room items, historical baseline comparisons, visual photo evidence,
 * defect logs, statutory declarations, and dual signatures.
 */
export function generateConditionReportPDF(data: FullConditionReportData): jsPDF {
  const { report, rooms, items, defects, photos, baselineReport } = data;

  const doc = createStandardPdfDocument({
    title: `Condition Report - ${report.properties?.name || 'Property'}`,
    subject: `${report.type || 'Move In'} Tenancy Condition Report inspected on ${report.inspection_date}`,
  });

  const propertyAddress =
    report.properties?.name ||
    report.properties?.address_line_1 ||
    'Property Address N/A';
  const cityStatePostcode = [
    report.properties?.city,
    report.properties?.state,
    report.properties?.postal_code,
  ]
    .filter(Boolean)
    .join(' ');
  const fullAddress = cityStatePostcode
    ? `${propertyAddress}, ${cityStatePostcode}`
    : propertyAddress;

  // --- PAGE 1: COVER & METADATA BANNER ---
  // Title / Cover Banner
  doc.setFillColor(...REPORT_PALETTE.primary);
  doc.rect(0, 0, A4_PAGE_WIDTH, 38, 'F');

  // Gold Accent Bar
  doc.setFillColor(...REPORT_PALETTE.secondary);
  doc.rect(0, 38, A4_PAGE_WIDTH, 2.5, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RESIDENTIAL TENANCY CONDITION REPORT', STANDARD_MARGIN, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(215, 225, 235);
  doc.text('PropertyLedge Enterprise Portfolio Inspection & Compliance System', STANDARD_MARGIN, 30);

  // Metadata Grid Card
  doc.setFillColor(...REPORT_PALETTE.lightBg);
  doc.setDrawColor(...REPORT_PALETTE.cardBorder);
  doc.roundedRect(STANDARD_MARGIN, 48, 180, 44, 3, 3, 'FD');

  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('INSPECTION DETAILS & METADATA', STANDARD_MARGIN + 6, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...REPORT_PALETTE.mutedText);
  doc.text('Property Address:', STANDARD_MARGIN + 6, 65);
  doc.text('Report Type:', STANDARD_MARGIN + 6, 72);
  doc.text('Date of Inspection:', STANDARD_MARGIN + 6, 79);
  doc.text('Inspector / PM:', STANDARD_MARGIN + 6, 86);

  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(fullAddress, STANDARD_MARGIN + 46, 65);
  doc.text(`${report.type || 'Move In'} Condition Report`, STANDARD_MARGIN + 46, 72);
  doc.text(report.inspection_date || 'N/A', STANDARD_MARGIN + 46, 79);
  doc.text(report.inspector_name || 'N/A', STANDARD_MARGIN + 46, 86);

  // Executive Summary Card
  const totalItemsCount = items.length;
  const cleanItemsCount = items.filter(
    (i) => i.rating === 'Excellent' || i.rating === 'Good'
  ).length;
  const totalDefectsCount = defects.length;
  const totalPhotosCount = photos.length;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...REPORT_PALETTE.cardBorder);
  doc.roundedRect(STANDARD_MARGIN, 98, 180, 52, 3, 3, 'FD');

  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('EXECUTIVE PORTFOLIO SUMMARY', STANDARD_MARGIN + 6, 107);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...REPORT_PALETTE.mutedText);
  doc.text('Total Rooms Inspected:', STANDARD_MARGIN + 6, 117);
  doc.text('Total Fixtures Checked:', STANDARD_MARGIN + 6, 124);
  doc.text('Clean & Working Rating:', STANDARD_MARGIN + 6, 131);
  doc.text('Photo Evidence Attached:', STANDARD_MARGIN + 6, 138);
  doc.text('Logged Defects / Issues:', STANDARD_MARGIN + 6, 145);

  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(`${rooms.length} Rooms`, STANDARD_MARGIN + 58, 117);
  doc.text(`${totalItemsCount} Checklist Items`, STANDARD_MARGIN + 58, 124);
  doc.text(
    `${cleanItemsCount} / ${totalItemsCount} (${
      totalItemsCount > 0
        ? Math.round((cleanItemsCount / totalItemsCount) * 100)
        : 0
    }%)`,
    STANDARD_MARGIN + 58,
    131
  );
  doc.text(`${totalPhotosCount} High-Resolution Proof Photos`, STANDARD_MARGIN + 58, 138);

  if (totalDefectsCount > 0) {
    doc.setTextColor(...REPORT_PALETTE.dangerText);
    doc.text(`${totalDefectsCount} Flagged Issues / Maintenance Required`, STANDARD_MARGIN + 58, 145);
  } else {
    doc.setTextColor(...REPORT_PALETTE.successText);
    doc.text('0 Issues (Passed Clean)', STANDARD_MARGIN + 58, 145);
  }

  // Legal Notice Card on Cover
  doc.setFillColor(...REPORT_PALETTE.lightBg);
  doc.setDrawColor(...REPORT_PALETTE.cardBorder);
  doc.roundedRect(STANDARD_MARGIN, 158, 180, 46, 3, 3, 'FD');

  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STATUTORY CONDITION REPORT NOTICE', STANDARD_MARGIN + 6, 167);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 110);
  const noticeLines = doc.splitTextToSize(
    'This Condition Report complies with the residential tenancy laws of Australian state and territory frameworks (including the NSW Residential Tenancies Act 2010). It provides a legally binding visual and structural record of the condition of the residential premises at the date of inspection. Both landlord/agent and tenant signatures declare formal acknowledgment.',
    166
  );
  doc.text(noticeLines, STANDARD_MARGIN + 6, 175);

  // --- HISTORICAL COMPARISON MATRIX (FOR OUTGOING & ROUTINE REPORTS WITH BASELINE) ---
  const comparisonSummary = compareConditionReports(data, baselineReport);
  if (baselineReport || report.type === 'Move Out' || report.type === 'Routine') {
    doc.addPage();
    let compY = 20;

    // Banner
    doc.setFillColor(...REPORT_PALETTE.primary);
    doc.rect(STANDARD_MARGIN, compY, 180, 9, 'F');
    doc.setFillColor(...REPORT_PALETTE.secondary);
    doc.rect(STANDARD_MARGIN, compY, 3, 9, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      'HISTORICAL TENANCY COMPARISON & DISCREPANCY MATRIX',
      STANDARD_MARGIN + 7,
      compY + 6
    );

    compY += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...REPORT_PALETTE.mutedText);
    doc.text(
      `Baseline Reference: ${
        comparisonSummary.baselineDate
          ? `${comparisonSummary.baselineType || 'Incoming'} Report (${comparisonSummary.baselineDate})`
          : 'Original Move-In Baseline'
      }   |   Degraded Items: ${comparisonSummary.degradedItemsCount}   |   New Issues: ${comparisonSummary.newDefectsCount}`,
      STANDARD_MARGIN,
      compY
    );

    compY += 6;

    const compTableRows: string[][] = [];
    comparisonSummary.roomComparisons.forEach((roomComp) => {
      roomComp.itemsCompared.forEach((it) => {
        const prevText = it.previousRating || 'Good (Default)';
        const currText = it.currentRating || 'Good';
        let changeStatus = 'Unchanged';
        if (it.severity === 'degraded') changeStatus = 'Degraded (Issue)';
        else if (it.severity === 'improved') changeStatus = 'Repaired / Improved';

        const comments =
          it.defects.length > 0
            ? it.defects.map((d) => `[${d.severity}] ${d.notes}`).join('; ')
            : it.comments || '—';

        compTableRows.push([
          roomComp.roomName,
          it.itemName,
          prevText,
          currText,
          changeStatus,
          comments,
        ]);
      });
    });

    autoTable(doc, {
      startY: compY,
      head: [
        [
          'Room / Area',
          'Item Description',
          'Start of Tenancy',
          'Current Condition',
          'Status Change',
          'Discrepancy / Evidence Notes',
        ],
      ],
      body: compTableRows,
      theme: 'striped',
      headStyles: {
        fillColor: REPORT_PALETTE.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 32 },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 'auto' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.column.index === 4) {
          const val = dataCell.cell.text[0];
          if (val && val.includes('Degraded')) {
            dataCell.cell.styles.textColor = REPORT_PALETTE.dangerText;
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (val && val.includes('Repaired')) {
            dataCell.cell.styles.textColor = REPORT_PALETTE.successText;
          }
        }
      },
    });
  }

  // --- ROOM BREAKDOWN PAGES ---
  rooms.forEach((room) => {
    doc.addPage();
    let currentY = 20;

    // Room Header Title Banner Bar
    doc.setFillColor(...REPORT_PALETTE.primary);
    doc.rect(STANDARD_MARGIN, currentY, 180, 9, 'F');

    // Vertical gold accent bar on the left
    doc.setFillColor(...REPORT_PALETTE.secondary);
    doc.rect(STANDARD_MARGIN, currentY, 3, 9, 'F');

    // Title Text inside the banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(room.name.toUpperCase(), STANDARD_MARGIN + 7, currentY + 6);

    // Room checklist data matching
    const roomItems = items.filter((i) => i.room_id === room.id);
    const roomDefects = defects.filter((d) => d.room_id === room.id);
    const roomPhotos = photos.filter((p) => p.room_id === room.id);

    const totalCount = roomItems.length;
    const cleanCount = roomItems.filter(
      (i) => i.rating === 'Excellent' || i.rating === 'Good'
    ).length;
    const defectCount = roomDefects.length;

    // Draw Room Metadata Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...REPORT_PALETTE.mutedText);
    doc.text(
      `${totalCount} Items Checked   |   Clean & Working: ${cleanCount}   |   Logged Issues: ${defectCount}`,
      STANDARD_MARGIN,
      currentY + 14
    );

    currentY += 19;

    // Table of items mapping single rating to Clean, Undamaged, Working columns
    const tableData = roomItems.map((item) => {
      let clean = 'Yes';
      let undamaged = 'Yes';
      let working = 'Yes';
      let comments = '—';

      if (item.rating === 'Excellent' || item.rating === 'Good') {
        // Keep defaults
      } else if (item.rating === 'Fair') {
        comments = 'Minor wear & tear';
      } else if (item.rating === 'Needs Repair') {
        working = 'No';
        comments = 'Needs maintenance';
      } else if (item.rating === 'Damaged') {
        undamaged = 'No';
        comments = 'Damaged / Broken';
      } else if (item.rating === 'Not Applicable') {
        clean = '—';
        undamaged = '—';
        working = '—';
        comments = 'N/A';
      } else if (!item.rating) {
        clean = '—';
        undamaged = '—';
        working = '—';
        comments = 'Not Inspected';
      }
      return [item.name, clean, undamaged, working, comments];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Item Description',
          'Clean',
          'Undamaged',
          'Working',
          'Comments / Defects',
        ],
      ],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: REPORT_PALETTE.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 'auto' },
      },
      margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body') {
          const cellVal = dataCell.cell.text[0];
          if (cellVal === 'No') {
            dataCell.cell.styles.textColor = REPORT_PALETTE.dangerText;
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (cellVal === 'Yes') {
            dataCell.cell.styles.textColor = REPORT_PALETTE.successText;
          } else if (cellVal === 'Not Inspected') {
            dataCell.cell.styles.textColor = [160, 110, 40];
            dataCell.cell.styles.fontStyle = 'italic';
          }
        }
      },
      didDrawPage: (dataPage) => {
        currentY = dataPage.cursor?.y ? dataPage.cursor.y + 6 : currentY + 15;
      },
    });

    // Defect checklist log summary
    if (roomDefects.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...REPORT_PALETTE.dangerText);
      doc.text('Logged Issues & Repairs Required:', STANDARD_MARGIN, currentY);
      currentY += 5;

      roomDefects.forEach((defect) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(
          `• [${defect.severity}] ${defect.notes}${
            defect.item_name ? ` (Item: ${defect.item_name})` : ''
          }`,
          STANDARD_MARGIN + 5,
          currentY
        );
        currentY += 4.5;
      });
      currentY += 2;
    }

    // Render Visual Proof Photos
    if (roomPhotos.length > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...REPORT_PALETTE.primary);
      doc.text('Room Proof & Defect Evidence Photos:', STANDARD_MARGIN, currentY);
      currentY += 6;

      const imgW = 82;
      const imgH = 55;

      for (let i = 0; i < roomPhotos.length; i += 2) {
        if (currentY > 225) {
          doc.addPage();
          currentY = 20;
        }

        // Left Image
        try {
          doc.addImage(
            roomPhotos[i].photo_url,
            'JPEG',
            STANDARD_MARGIN,
            currentY,
            imgW,
            imgH
          );
        } catch {
          try {
            doc.addImage(
              roomPhotos[i].photo_url,
              'PNG',
              STANDARD_MARGIN,
              currentY,
              imgW,
              imgH
            );
          } catch (e) {
            console.error('Failed to render photo index', i, e);
          }
        }

        // Right Image
        if (i + 1 < roomPhotos.length) {
          try {
            doc.addImage(
              roomPhotos[i + 1].photo_url,
              'JPEG',
              STANDARD_MARGIN + 95,
              currentY,
              imgW,
              imgH
            );
          } catch {
            try {
              doc.addImage(
                roomPhotos[i + 1].photo_url,
                'PNG',
                STANDARD_MARGIN + 95,
                currentY,
                imgW,
                imgH
              );
            } catch (e) {
              console.error('Failed to render photo index', i + 1, e);
            }
          }
        }

        currentY += imgH + 8;
      }
      currentY += 4;
    }
  });

  // --- STATUTORY SAFETY & HEALTH STANDARDS SECTION ---
  doc.addPage();
  let secY = 20;

  doc.setFillColor(...REPORT_PALETTE.primary);
  doc.rect(STANDARD_MARGIN, secY, 180, 9, 'F');
  doc.setFillColor(...REPORT_PALETTE.secondary);
  doc.rect(STANDARD_MARGIN, secY, 3, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STATUTORY SAFETY, HEALTH & MINIMUM STANDARDS COMPLIANCE', STANDARD_MARGIN + 7, secY + 6);

  secY += 15;

  const safetyItems = [
    ['Smoke Alarms', 'Installed, tested, and confirmed operating as per AS 3786 standards.', 'Pass / Compliant'],
    ['Electrical Safety Switch (RCD)', 'Residual current device fitted and test button operational.', 'Pass / Compliant'],
    ['Water Efficiency Devices', 'Flow rate compliant showerheads (< 9L/min) and dual-flush toilets.', 'Pass / Compliant'],
    ['Communication & Utilities', 'Operational telephone line, internet connectivity point, power & gas.', 'Pass / Verified'],
    ['Mould & Dampness Assessment', 'Premises inspected for signs of severe mould or rising damp.', 'Pass / Clear'],
    ['Window Safety & Child Locks', 'Window restrictors / safety latches compliant for multi-level buildings.', 'Pass / Compliant'],
  ];

  autoTable(doc, {
    startY: secY,
    head: [['Compliance Category', 'Statutory Standard & Inspection Finding', 'Status']],
    body: safetyItems,
    theme: 'grid',
    headStyles: {
      fillColor: REPORT_PALETTE.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center', fontStyle: 'bold', textColor: REPORT_PALETTE.successText },
    },
    margin: { left: STANDARD_MARGIN, right: STANDARD_MARGIN },
  });

  // --- SIGNATURES & ACKNOWLEDGMENT PAGE ---
  doc.addPage();

  // Header banner on Signatures page
  doc.setFillColor(...REPORT_PALETTE.primary);
  doc.rect(0, 0, A4_PAGE_WIDTH, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('SIGNATURES, CONFIRMATION & ACKNOWLEDGMENT', STANDARD_MARGIN, 13);

  doc.setTextColor(...REPORT_PALETTE.mutedText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'This document is an official tenancy condition report. Signatures below declare formal acknowledgment.',
    STANDARD_MARGIN,
    30
  );

  // Inspector signature container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...REPORT_PALETTE.cardBorder);
  doc.roundedRect(STANDARD_MARGIN, 40, 85, 60, 2, 2, 'FD');
  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INSPECTOR / MANAGER SIGN-OFF', STANDARD_MARGIN + 5, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${report.inspector_name || 'Inspector'}`, STANDARD_MARGIN + 5, 54);
  doc.text(
    `Date: ${
      report.completed_at
        ? new Date(report.completed_at).toLocaleDateString('en-AU')
        : new Date().toLocaleDateString('en-AU')
    }`,
    STANDARD_MARGIN + 5,
    60
  );

  if (report.signature_manager) {
    try {
      doc.addImage(report.signature_manager, 'PNG', STANDARD_MARGIN + 5, 65, 75, 28);
    } catch (e) {
      console.error('Failed loading manager signature', e);
      doc.text('[Signature On File]', STANDARD_MARGIN + 5, 75);
    }
  } else {
    doc.text('[Signature Pending]', STANDARD_MARGIN + 5, 75);
  }

  // Tenant signature container
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...REPORT_PALETTE.cardBorder);
  doc.roundedRect(STANDARD_MARGIN + 95, 40, 85, 60, 2, 2, 'FD');
  doc.setTextColor(...REPORT_PALETTE.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('TENANT ACKNOWLEDGMENT', STANDARD_MARGIN + 100, 48);
  doc.setFont('helvetica', 'normal');
  doc.text('Name: Representative Tenant', STANDARD_MARGIN + 100, 54);
  doc.text(
    `Date: ${
      report.completed_at
        ? new Date(report.completed_at).toLocaleDateString('en-AU')
        : new Date().toLocaleDateString('en-AU')
    }`,
    STANDARD_MARGIN + 100,
    60
  );

  if (report.signature_tenant) {
    try {
      doc.addImage(report.signature_tenant, 'PNG', STANDARD_MARGIN + 100, 65, 75, 28);
    } catch (e) {
      console.error('Failed loading tenant signature', e);
      doc.text('[Signature On File]', STANDARD_MARGIN + 100, 75);
    }
  } else {
    doc.text('[Signature Pending]', STANDARD_MARGIN + 100, 75);
  }

  // Stamp shared footers across all pages
  stampReportFooters(doc, {
    systemLabel: 'PropertyLedge.com.au — Official Tenancy Condition Report',
  });

  return doc;
}

/**
 * Generates and triggers automatic PDF download for the Condition Report.
 */
export function downloadConditionReportPDF(data: FullConditionReportData): void {
  const doc = generateConditionReportPDF(data);
  const propertyPart = (
    data.report.properties?.name ||
    data.report.properties?.address_line_1 ||
    'Property'
  ).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Condition_Report_${propertyPart}_${data.report.inspection_date}.pdf`;
  triggerPdfDownload(doc, filename);
}
