import * as XLSX from 'xlsx';
import type { AdTag, ParsedMediaPlan } from '../types';

/**
 * Parses the Media Plan Excel/CSV file.
 * Returns a map of DealName -> MediaPlanRecord.
 */
export const parseMediaPlan = async (file: File): Promise<ParsedMediaPlan> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0]; // Assume first sheet
                const worksheet = workbook.Sheets[sheetName];

                // Read all data as arrays of values to find the header row
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

                // Find header row: look for row containing "Deal Name" or "Deal ID" AND "Device targeted"
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(20, rawData.length); i++) {
                    const row = rawData[i];
                    const rowStr = JSON.stringify(row).toLowerCase();
                    if ((rowStr.includes('deal name') || rowStr.includes('deal id')) &&
                        (rowStr.includes('device targeted') || rowStr.includes('devicetargeted'))) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    throw new Error("Could not find valid header row (must contain 'Deal Name'/'Deal ID' and 'Device targeted')");
                }

                const headerRow = rawData[headerRowIndex];
                const dealNameIdx = headerRow.findIndex((cell: any) => {
                    const s = String(cell).toLowerCase().trim();
                    return s === 'deal name' || s === 'dealname';
                });
                const dealIdIdx = headerRow.findIndex((cell: any) => {
                    const s = String(cell).toLowerCase().trim();
                    return s === 'deal id' || s === 'dealid';
                });
                const deviceTargetIdx = headerRow.findIndex((cell: any) => {
                    const s = String(cell).toLowerCase().trim();
                    return s === 'device targeted' || s === 'devicetargeted';
                });
                const durationIdx = headerRow.findIndex((cell: any) => {
                    const s = String(cell).toLowerCase().trim();
                    return s === 'ad duration(sec)' || s === 'ad duration';
                });
                const formatIdx = headerRow.findIndex((cell: any) => {
                    return String(cell).toLowerCase().trim() === 'format';
                });

                const plan: ParsedMediaPlan = {};

                // Iterate over rows after the header
                for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    let dealName = dealNameIdx !== -1 ? row[dealNameIdx] : undefined;
                    // Fallback to Deal ID if Deal Name is missing/empty
                    if ((!dealName || String(dealName).trim() === '') && dealIdIdx !== -1) {
                        dealName = row[dealIdIdx];
                    }

                    const deviceTarget = deviceTargetIdx !== -1 ? row[deviceTargetIdx] : undefined;
                    const durationVal = durationIdx !== -1 ? row[durationIdx] : undefined;

                    if (dealName) {
                        const cleanDealName = String(dealName).trim();
                        // Only add if we have a valid deal name
                        if (cleanDealName) {
                            const formatVal = formatIdx !== -1 ? row[formatIdx] : undefined;
                            plan[cleanDealName] = {
                                dealName: cleanDealName,
                                deviceTargeted: deviceTarget ? String(deviceTarget).trim() : "",
                                adDuration: durationVal ? Number(durationVal) : undefined,
                                format: formatVal ? String(formatVal).trim() : undefined,
                            };
                        }
                    }
                }

                resolve(plan);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};

/**
 * Parses an Ad Tag Text file.
 * logic:
 * - Splits content by dashed lines "----"
 * - For each block:
 *    - Finds first non-empty line as Tag Name
 *    - Finds VAST URL
 */
export const parseAdTagFile = async (file: File): Promise<AdTag[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const entries: AdTag[] = [];

                // Split by dashed separator line
                // The separator in the file is significantly long.
                // using regex /-{5,}/ matches 5 or more dashes.
                const blocks = text.split(/-{5,}/);

                blocks.forEach(block => {
                    if (!block.trim()) return;

                    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length === 0) return;

                    const tagName = lines[0]; // First line is tag name

                    // Find URL
                    const content = block.replace(/\s+/g, ' ');
                    const tokens = content.split(' ');
                    const vastUrl = tokens.find(t => t.startsWith('https://'));

                    if (tagName && vastUrl) {
                        entries.push({
                            filename: file.name,
                            tagName,
                            vastUrl
                        });
                    } else if (tagName && !vastUrl) {
                        // TC-05 fix: tag name exists but URL is missing/malformed
                        // Instead of silently dropping, add an entry so validation can flag it
                        entries.push({
                            filename: file.name,
                            tagName,
                            vastUrl: '__MISSING_URL__'
                        });
                    }
                });

                // Fallback for files without separators (single tag files)
                if (entries.length === 0 && text.trim().length > 0) {
                    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                    const tagName = lines.length > 0 ? lines[0] : "Unknown";
                    const content = text.replace(/\s+/g, ' ');
                    const tokens = content.split(' ');
                    const vastUrl = tokens.find(t => t.startsWith('https://')) || "Missing";

                    entries.push({
                        filename: file.name,
                        tagName,
                        vastUrl
                    });
                }

                resolve(entries);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};
