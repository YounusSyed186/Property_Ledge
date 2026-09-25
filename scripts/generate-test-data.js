const fs = require('fs');
const path = require('path');

const samplePdf = path.join(process.cwd(), 'tests/fixtures/receipt.pdf');
const pdfBuffer = fs.readFileSync(samplePdf);

const directories = ['test-data', 'test data'];

const files = [
  '1. Income Statement (including maintenance expense)/Income Statement.pdf',
  '2. Strata Bills/January.pdf',
  '2. Strata Bills/April.pdf',
  '2. Strata Bills/October Strata Levy $850.pdf',
  '3. Council Bills/April $476.pdf',
  '3. Council Bills/August $477.pdf',
  '3. Council Bills/November Rates $476.50.pdf',
  '4. Water Bills/January $180.pdf',
  '4. Water Bills/April $192.50.pdf',
  '4. Water Bills/July Water Usage $145.20.pdf',
  '5. Other Expense/Bunnings downlight repairs $158.pdf',
  '5. Other Expense/Bunnings Maintenance Tool $69.pdf',
  '5. Other Expense/Bunnings Maintenance Tool ozito $92.pdf',
  '5. Other Expense/Plumber hot water valve repair $340.pdf',
  '5. Other Expense/Bunnings paint supplies $84.20.pdf',
  '5. Other Expense/Bunnings smoke detector replacement.pdf',
  '6. Depreciation Report/depreciation.pdf',
  '7. Interest Statement/interest.pdf'
];

for (const dir of directories) {
  const baseDir = path.join(process.cwd(), dir);
  if (fs.existsSync(baseDir)) {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
  for (const rel of files) {
    const fullPath = path.join(baseDir, rel);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, pdfBuffer);
  }
}

console.log('Dummy test data created with exact filenames and dollar amounts.');
