import * as XLSX from 'xlsx';
import fs from 'fs';

const files = [
    '/Users/deepakskumar/Desktop/Claude-project/Deal-tag-validation/TRESemme_31_App_Feb26.xlsx',
    '/Users/deepakskumar/Desktop/Claude-project/Deal-tag-validation/TajMahal Jan26.xlsx'
];

function findHeaderRow(data) {
    for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        const rowStr = JSON.stringify(row).toLowerCase();
        if ((rowStr.includes('deal name') || rowStr.includes('deal id')) &&
            rowStr.includes('device targeted')) {
            return i;
        }
    }
    return -1;
}

function findColumnIndex(headerRow, possibleNames) {
    if (!headerRow) return -1;
    return headerRow.findIndex(cell => {
        if (!cell) return false;
        const cellStr = String(cell).toLowerCase().trim();
        return possibleNames.some(name => cellStr === name.toLowerCase());
    });
}

files.forEach(file => {
    console.log(`\n--- Analyzing ${file} ---`);
    if (!fs.existsSync(file)) {
        console.log(`File NOT found: ${file}`);
        return;
    }
    const buf = fs.readFileSync(file);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Read as array of arrays
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const headerRowIndex = findHeaderRow(data);
    console.log(`Header Row Index: ${headerRowIndex}`);

    if (headerRowIndex === -1) {
        console.log("Could not find header row.");
        return;
    }

    const header = data[headerRowIndex];
    console.log("Header Row:", header);

    const dealNameIdx = findColumnIndex(header, ['Deal Name', 'deal name', 'DealName']);
    const dealIdIdx = findColumnIndex(header, ['Deal ID', 'deal id']);
    const deviceTargetIdx = findColumnIndex(header, ['Device targeted', 'device targeted', 'DeviceTargeted']);
    const durationIdx = findColumnIndex(header, ['Ad duration(sec)', 'ad duration']);

    console.log(`Indices - DealName: ${dealNameIdx}, DealID: ${dealIdIdx}, DeviceTarget: ${deviceTargetIdx}, Duration: ${durationIdx}`);

    console.log("Extracted Data (First 5 records):");
    let count = 0;
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        if (count >= 5) break;
        const row = data[i];

        let dealName = dealNameIdx !== -1 ? row[dealNameIdx] : undefined;
        if (!dealName && dealIdIdx !== -1) {
            dealName = row[dealIdIdx];
        }

        const deviceTarget = deviceTargetIdx !== -1 ? row[deviceTargetIdx] : undefined;
        const duration = durationIdx !== -1 ? row[durationIdx] : undefined;

        if (dealName) {
            console.log(`Row ${i}: Deal="${dealName}", Device="${deviceTarget}", Duration="${duration}"`);
            count++;
        }
    }
});
