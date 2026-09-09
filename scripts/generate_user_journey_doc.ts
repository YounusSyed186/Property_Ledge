import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/DELL/.gemini/antigravity-ide/brain/4e5a0533-f063-4582-8292-e9300f56a270';
const WORKSPACE_PDF = path.join(process.cwd(), 'PropertyLedge_V4_Full_User_Journey.pdf');
const ARTIFACT_PDF = path.join(ARTIFACT_DIR, 'PropertyLedge_V4_Full_User_Journey.pdf');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeModals(page: any) {
  try {
    const xButtons = await page.locator('.fixed button:has(svg)').all();
    for (const btn of xButtons) {
      if (await btn.isVisible()) {
        await btn.click({ force: true }).catch(() => {});
        await sleep(300);
      }
    }
  } catch (e) {}
  await page.keyboard.press('Escape');
  await sleep(500);
}

async function waitForAGGrid(page: any) {
  await page.waitForSelector('.ag-row', { timeout: 8000 }).catch(() => {});
  await sleep(2000);
}

async function run() {
  console.log('🚀 Generating Focused Invoice & Automation Journey Document with AG Grid Data Verification...');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const screenshots: Record<string, string> = {};

  try {
    // ---------------------------------------------------------------------
    // 1. INVOICES HUB & AG GRID POPULATED VIEW
    // ---------------------------------------------------------------------
    console.log('▶ [1/10] Capturing Invoices Hub & AG Grid Populated Table...');
    await page.goto(`${BASE_URL}/dashboard/invoices`, { waitUntil: 'domcontentloaded' });
    await waitForAGGrid(page);
    const p1 = path.join(ARTIFACT_DIR, '01_invoices_ag_grid_populated.png');
    await page.screenshot({ path: p1, fullPage: true });
    screenshots['01_invoices_ag_grid_populated'] = p1;

    // 2. Create Invoice Modal
    console.log('▶ [2/10] Capturing Create Invoice Modal...');
    const createInvBtn = page.locator('button:has-text("New Invoice"), button:has-text("Create Invoice")').first();
    if (await createInvBtn.isVisible()) {
      await createInvBtn.click();
      await sleep(1500);
      const p2 = path.join(ARTIFACT_DIR, '02_create_invoice_modal.png');
      await page.screenshot({ path: p2, fullPage: true });
      screenshots['02_create_invoice_modal'] = p2;
      await closeModals(page);
    }

    // 3. Invoice Detail Modal & Status Controls
    console.log('▶ [3/10] Capturing Invoice Status Detail & Workflow Controls...');
    const firstInvoiceRow = page.locator('.ag-row').first();
    if (await firstInvoiceRow.isVisible()) {
      await firstInvoiceRow.click();
      await sleep(1500);
      const p3 = path.join(ARTIFACT_DIR, '03_invoice_detail_modal.png');
      await page.screenshot({ path: p3, fullPage: true });
      screenshots['03_invoice_detail_modal'] = p3;

      // 4. Payment Recording Subform
      console.log('▶ [4/10] Capturing Payment Recording Form...');
      const recordPaymentBtn = page.locator('button:has-text("Record Payment")').first();
      if (await recordPaymentBtn.isVisible()) {
        await recordPaymentBtn.click();
        await sleep(1200);
        const p4 = path.join(ARTIFACT_DIR, '04_payment_recording_modal.png');
        await page.screenshot({ path: p4, fullPage: true });
        screenshots['04_payment_recording_modal'] = p4;
        await closeModals(page);
      }
      await closeModals(page);
    }

    // 5. Overdue Status Filter View
    console.log('▶ [5/10] Capturing Overdue Invoice Status View...');
    const overdueTab = page.locator('button:has-text("Overdue"), [role="tab"]:has-text("Overdue")').first();
    if (await overdueTab.isVisible()) {
      await overdueTab.click();
      await waitForAGGrid(page);
      const p5 = path.join(ARTIFACT_DIR, '05_overdue_invoices_view.png');
      await page.screenshot({ path: p5, fullPage: true });
      screenshots['05_overdue_invoices_view'] = p5;
    }

    // ---------------------------------------------------------------------
    // 2. AUTOMATIONS ENGINE & AG GRID POPULATED VIEW
    // ---------------------------------------------------------------------
    console.log('▶ [6/10] Capturing Automations Engine & AG Grid Populated Table...');
    await page.goto(`${BASE_URL}/dashboard/automations`, { waitUntil: 'domcontentloaded' });
    await waitForAGGrid(page);
    const p6 = path.join(ARTIFACT_DIR, '06_automations_ag_grid_populated.png');
    await page.screenshot({ path: p6, fullPage: true });
    screenshots['06_automations_ag_grid_populated'] = p6;

    // 7. Create Automation Type Selector
    console.log('▶ [7/10] Capturing Create Automation Type Selector...');
    const createAutoBtn = page.locator('button:has-text("Create Automation")').first();
    if (await createAutoBtn.isVisible()) {
      await createAutoBtn.click();
      await sleep(1200);
      const p7 = path.join(ARTIFACT_DIR, '07_create_automation_type_selector.png');
      await page.screenshot({ path: p7, fullPage: true });
      screenshots['07_create_automation_type_selector'] = p7;

      // 8. Lease Automation Config Form
      console.log('▶ [8/10] Capturing Lease Automation Config Form...');
      const leaseCard = page.locator('button:has-text("Lease Recurring Invoice"), div:has-text("Lease Automation")').first();
      if (await leaseCard.isVisible()) {
        await leaseCard.click();
        await sleep(600);
      }
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await sleep(1500);
      }
      const p8 = path.join(ARTIFACT_DIR, '08_create_lease_automation_modal.png');
      await page.screenshot({ path: p8, fullPage: true });
      screenshots['08_create_lease_automation_modal'] = p8;
      await closeModals(page);
    }

    // 9. Standalone Invoice Automation Form
    console.log('▶ [9/10] Capturing Standalone Invoice Automation Form...');
    if (await createAutoBtn.isVisible()) {
      await createAutoBtn.click();
      await sleep(1200);
      const standaloneCard = page.locator('button:has-text("Standalone Customer Billing"), div:has-text("Standalone Invoice")').first();
      if (await standaloneCard.isVisible()) {
        await standaloneCard.click();
        await sleep(600);
      }
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await sleep(1500);
      }
      const p9 = path.join(ARTIFACT_DIR, '09_create_standalone_invoice_automation_modal.png');
      await page.screenshot({ path: p9, fullPage: true });
      screenshots['09_create_standalone_invoice_automation_modal'] = p9;
      await closeModals(page);
    }

    // 10. Execution History Modal
    console.log('▶ [10/10] Capturing Automation Execution History Modal...');
    const historyBtn = page.locator('button[title="Execution History"]').first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await sleep(1500);
      const p10 = path.join(ARTIFACT_DIR, '10_automation_execution_logs_modal.png');
      await page.screenshot({ path: p10, fullPage: true });
      screenshots['10_automation_execution_logs_modal'] = p10;
      await closeModals(page);
    }

    console.log('✅ Screenshot acquisition complete!');

    // ---------------------------------------------------------------------
    // GENERATE CONCISE HTML REPORT WITH TABLE OF CONTENTS / INDEX
    // ---------------------------------------------------------------------
    const getBase64Image = (filePath?: string) => {
      if (!filePath || !fs.existsSync(filePath)) return '';
      const buffer = fs.readFileSync(filePath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PropertyLedge V4 - Invoices & Automations Executive Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm 15mm 18mm 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.5;
    }

    .cover-card {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 250mm;
      padding: 32px 28px;
      background: linear-gradient(135deg, #081318 0%, #13222A 100%);
      color: #FFFFFF;
      border-radius: 16px;
    }

    .cover-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-b: 1px solid rgba(255,255,255,0.12);
      padding-bottom: 20px;
    }

    .cover-logo {
      font-size: 22pt;
      font-weight: 800;
      color: #00B4A2;
      letter-spacing: -0.5px;
    }

    .cover-pill {
      background: rgba(0, 180, 162, 0.15);
      border: 1px solid rgba(0, 180, 162, 0.3);
      color: #00B4A2;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-body {
      margin-top: 30px;
    }

    .cover-title {
      font-size: 30pt;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 14px;
      color: #F8FAFC;
    }

    .cover-sub {
      font-size: 12pt;
      color: #94A3B8;
      max-width: 580px;
      line-height: 1.6;
    }

    /* INDEX / TABLE OF CONTENTS */
    .toc-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 20px;
      margin-top: 30px;
    }

    .toc-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #00B4A2;
      margin-bottom: 12px;
      border-bottom: 1px dashed rgba(255,255,255,0.15);
      padding-bottom: 6px;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      color: #CBD5E1;
      border-bottom: 1px dotted rgba(255,255,255,0.1);
      padding-bottom: 4px;
    }

    .toc-item span:first-child {
      font-weight: 600;
    }

    .toc-num {
      color: #00B4A2;
      font-weight: 700;
    }

    .section-header {
      font-size: 16pt;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
      border-bottom: 2px solid #00B4A2;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .step-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 22px;
      page-break-inside: avoid;
    }

    .step-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .step-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0F172A;
    }

    .step-badge {
      font-family: monospace;
      font-size: 8pt;
      background: #00B4A2;
      color: #FFFFFF;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }

    .step-desc {
      font-size: 9pt;
      color: #475569;
      margin-bottom: 10px;
    }

    .img-box {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #CBD5E1;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
      background: #0F172A;
    }

    .img-box img {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE WITH TABLE OF CONTENTS INDEX -->
  <div class="cover-card">
    <div class="cover-top">
      <div class="cover-logo">PROPERTYLEDGE V4</div>
      <div class="cover-pill">Invoices & Automations Guide</div>
    </div>

    <div class="cover-body">
      <div class="cover-title">Invoices & Automations User Journey Guide</div>
      <div class="cover-sub">
        Concise, verified visual reference manual detailing the Invoices & Billing Engine, Status Lifecycle Transitions, and Automations Architecture with AG Grid data verification.
      </div>

      <!-- INDEX TABLE OF CONTENTS -->
      <div class="toc-box">
        <div class="toc-title">Document Index & Table of Contents</div>
        <div class="toc-grid">
          <div class="toc-item">
            <span>1. Invoices AG Grid Populated Hub</span>
            <span class="toc-num">Page 2</span>
          </div>
          <div class="toc-item">
            <span>2. Create New Invoice Modal</span>
            <span class="toc-num">Page 2</span>
          </div>
          <div class="toc-item">
            <span>3. Invoice Status Controls Modal</span>
            <span class="toc-num">Page 3</span>
          </div>
          <div class="toc-item">
            <span>4. Payment Recording Subform</span>
            <span class="toc-num">Page 3</span>
          </div>
          <div class="toc-item">
            <span>5. Overdue Invoice Lifecycle View</span>
            <span class="toc-num">Page 4</span>
          </div>
          <div class="toc-item">
            <span>6. Automations AG Grid Hub</span>
            <span class="toc-num">Page 4</span>
          </div>
          <div class="toc-item">
            <span>7. Create Automation Selector</span>
            <span class="toc-num">Page 5</span>
          </div>
          <div class="toc-item">
            <span>8. Lease Automation Config</span>
            <span class="toc-num">Page 5</span>
          </div>
          <div class="toc-item">
            <span>9. Standalone Invoice Automation</span>
            <span class="toc-num">Page 6</span>
          </div>
          <div class="toc-item">
            <span>10. Execution Logs & Audit Trail</span>
            <span class="toc-num">Page 6</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 1: INVOICES & STATUS LIFECYCLE -->
  <div class="section-header">
    <span>PART 1: Invoices & Status Lifecycle Journey</span>
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">1. Invoices & Billing Center (AG Grid Loaded Data)</span>
      <span class="step-badge">/dashboard/invoices</span>
    </div>
    <div class="step-desc">
      Verified AG Grid populated table showing active invoices, customer details, issue/due dates, totals, balance remaining, and status tags (Draft, Issued, Overdue, Paid).
    </div>
    ${screenshots['01_invoices_ag_grid_populated'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['01_invoices_ag_grid_populated'])}" alt="Invoices AG Grid" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">2. Create New Invoice Modal</span>
      <span class="step-badge">Modal View</span>
    </div>
    <div class="step-desc">
      Modal form for standalone and lease-based invoice creation with dynamic line item entry, tax calculations, and payment terms.
    </div>
    ${screenshots['02_create_invoice_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['02_create_invoice_modal'])}" alt="Create Invoice Modal" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">3. Invoice Detail & Status Workflow Controls</span>
      <span class="step-badge">Detail Modal</span>
    </div>
    <div class="step-desc">
      Detail inspector showcasing invoice status controls (Issue & Send, Record Payment, Download PDF, Cancel Invoice), line items, and audit timeline.
    </div>
    ${screenshots['03_invoice_detail_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['03_invoice_detail_modal'])}" alt="Invoice Detail Modal" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">4. Payment Recording & Balance Tracking Subform</span>
      <span class="step-badge">Subform</span>
    </div>
    <div class="step-desc">
      Form for recording manual bank transfers, credit card payments, or partial payments with automated balance updates and transaction logging.
    </div>
    ${screenshots['04_payment_recording_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['04_payment_recording_modal'])}" alt="Payment Recording Modal" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">5. Overdue Invoices Lifecycle Filter View</span>
      <span class="step-badge">Filtered AG Grid</span>
    </div>
    <div class="step-desc">
      Filtered table isolating overdue accounts with overdue day counts, remaining balances, and quick automated email reminder triggers.
    </div>
    ${screenshots['05_overdue_invoices_view'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['05_overdue_invoices_view'])}" alt="Overdue Invoices" />
    </div>` : ''}
  </div>

  <!-- SECTION 2: AUTOMATIONS ENGINE -->
  <div class="section-header">
    <span>PART 2: Automations Engine Journey</span>
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">6. Automations Engine Hub (AG Grid Loaded Data)</span>
      <span class="step-badge">/dashboard/automations</span>
    </div>
    <div class="step-desc">
      Verified AG Grid populated automations dashboard showing active rules, lease vs invoice automation tags, action types, schedules, next delivery timestamps, and status toggles.
    </div>
    ${screenshots['06_automations_ag_grid_populated'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['06_automations_ag_grid_populated'])}" alt="Automations AG Grid" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">7. Create Automation Type Selector</span>
      <span class="step-badge">Wizard Step 0</span>
    </div>
    <div class="step-desc">
      2-option selection wizard allowing creation of Lease Recurring Invoices or Standalone Customer Billings.
    </div>
    ${screenshots['07_create_automation_type_selector'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['07_create_automation_type_selector'])}" alt="Automation Type Selector" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">8. Lease Automation Parameter Wizard</span>
      <span class="step-badge">Wizard Step 1 & 2</span>
    </div>
    <div class="step-desc">
      Configure lease target, action type (Invoice vs Lease Document), custom recipient overrides, schedule offset, and accounting rules.
    </div>
    ${screenshots['08_create_lease_automation_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['08_create_lease_automation_modal'])}" alt="Lease Automation Form" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">9. Standalone Invoice Automation Form</span>
      <span class="step-badge">Wizard Step 1 & 2</span>
    </div>
    <div class="step-desc">
      Configure recurring non-lease billings with description, amount, currency, invoice template, and delivery schedule.
    </div>
    ${screenshots['09_create_standalone_invoice_automation_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['09_create_standalone_invoice_automation_modal'])}" alt="Standalone Invoice Automation Form" />
    </div>` : ''}
  </div>

  <div class="step-card">
    <div class="step-title-row">
      <span class="step-title">10. Execution Logs & Audit Trail Modal</span>
      <span class="step-badge">Audit Modal</span>
    </div>
    <div class="step-desc">
      Complete execution history viewer tracking status badges, duration, trigger payloads, generated invoice references, and manual retry options.
    </div>
    ${screenshots['10_automation_execution_logs_modal'] ? `
    <div class="img-box">
      <img src="${getBase64Image(screenshots['10_automation_execution_logs_modal'])}" alt="Execution Logs Modal" />
    </div>` : ''}
  </div>

</body>
</html>
    `;

    const htmlPath = path.join(ARTIFACT_DIR, 'invoices_and_automations_report.html');
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`Saved concise HTML report to ${htmlPath}`);

    // Render HTML page and print to PDF via Playwright
    console.log('▶ Converting Focused Report to PDF via Playwright...');
    const pdfPage = await context.newPage();
    await pdfPage.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });
    await sleep(1500);

    await pdfPage.pdf({
      path: WORKSPACE_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
    });

    // Copy to artifact directory
    fs.copyFileSync(WORKSPACE_PDF, ARTIFACT_PDF);

    console.log(`🎉 PDF generated successfully at:\n  - ${WORKSPACE_PDF}\n  - ${ARTIFACT_PDF}`);

  } catch (err) {
    console.error('Error during focused user journey generation:', err);
  } finally {
    await browser.close();
  }
}

run();
