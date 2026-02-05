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
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

                const plan: ParsedMediaPlan = {};

                json.forEach((row) => {
                    const dealName = row['Deal Name'] || row['deal name'] || row['DealName'];
                    const deviceTarget = row['Device targeted'] || row['device targeted'] || row['DeviceTargeted'];

                    if (dealName) {
                        plan[String(dealName).trim()] = {
                            dealName: String(dealName).trim(),
                            deviceTargeted: String(deviceTarget).trim(),
                        };
                    }
                });

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
