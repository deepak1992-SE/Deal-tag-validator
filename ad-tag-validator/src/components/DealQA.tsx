import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchDealByName, fetchProductDetails, extractProductId, extractInventoryInfo, validateDeal } from '../utils/dealValidation';
import type { DealValidationResult } from '../types';
import { Upload, FileText, Play, Download, AlertCircle, CheckCircle, XCircle, Shield, Loader2, SkipForward, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

// ─── Row type includes WARN for Deal Status ───────────────────────────────────
type RowResult = 'PASS' | 'FAIL' | 'WARN' | 'N/A';

const getComparisonRows = (res: DealValidationResult) => {
    const rows: Array<{ param: string; yourSheet: string; api: string; caseInsensitive?: boolean; isDate?: boolean; isStatus?: boolean }> = [
        { param: 'Start Date', yourSheet: res.startDateExcel || '-', api: res.startDateApi || '-', isDate: true },
        { param: 'End Date',   yourSheet: res.endDateExcel   || '-', api: res.endDateApi   || '-', isDate: true },
        { param: 'CPM',        yourSheet: res.cpmExcel        || '-', api: res.cpmApi        || '-' },
        { param: 'Budget',     yourSheet: res.budgetExcel     || '-', api: res.budgetApi     || '-' },
        { param: 'Impressions',yourSheet: res.impressionExcel || '-', api: res.impressionApi || '-' },
        { param: 'Buyer Seat ID', yourSheet: res.buyerSeatIdExcel || '-', api: res.buyerSeatIdApi || '-' },
        { param: 'DSP',        yourSheet: res.dspExcel        || '-', api: res.dspApi        || '-', caseInsensitive: true },
        { param: 'Deal Type',  yourSheet: res.dealTypeExcel   || '-', api: res.dealTypeApi   || '-', caseInsensitive: true },
        { param: 'Deal Status',yourSheet: '-',                         api: res.dealStatusApi || '-', isStatus: true },
        { param: 'Frequency Cap', yourSheet: res.freqCapExcel || '-', api: res.freqCapApi   || '-' },
    ];
    return rows;
};

const getRowResult = (
    yourSheet: string,
    api: string,
    _param?: string,
    caseInsensitive?: boolean,
    isStatus?: boolean
): RowResult => {
    if (yourSheet === '-' && api === '-') return 'N/A';
    // Deal Status is informational — WARN if not Active, never FAIL
    if (isStatus) {
        if (api === '-') return 'N/A';
        return api.toLowerCase() === 'active' ? 'PASS' : 'WARN';
    }
    if (yourSheet === '-' || api === '-') return 'N/A';
    if (caseInsensitive) {
        return yourSheet.toLowerCase() === api.toLowerCase() ? 'PASS' : 'FAIL';
    }
    return yourSheet === api ? 'PASS' : 'FAIL';
};

// Count real mismatches (excluding N/A and WARN rows)
const getMismatchCount = (res: DealValidationResult): number => {
    return getComparisonRows(res).filter(row =>
        getRowResult(row.yourSheet, row.api, undefined, row.caseInsensitive, row.isStatus) === 'FAIL'
    ).length;
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { icon: React.ReactNode; classes: string }> = {
        PASS:    { icon: <CheckCircle className="w-3.5 h-3.5" />,    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        FAIL:    { icon: <XCircle className="w-3.5 h-3.5" />,        classes: 'bg-red-50 text-red-700 border-red-200' },
        ERROR:   { icon: <AlertCircle className="w-3.5 h-3.5" />,    classes: 'bg-gray-50 text-gray-600 border-gray-200' },
        SKIPPED: { icon: <SkipForward className="w-3.5 h-3.5" />,    classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    };
    const c = config[status] || config.ERROR;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.classes}`}>
            {c.icon} {status}
        </span>
    );
};

// ─── Single deal card ─────────────────────────────────────────────────────────
const DealCard: React.FC<{ res: DealValidationResult; defaultExpanded: boolean }> = ({ res, defaultExpanded }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const allRows = getComparisonRows(res);
    const mismatchCount = getMismatchCount(res);
    const visibleRows = allRows.filter(row =>
        getRowResult(row.yourSheet, row.api, undefined, row.caseInsensitive, row.isStatus) !== 'N/A'
    );

    const isSkipOrError = res.status === 'SKIPPED' || res.status === 'ERROR';

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${
            res.status === 'PASS'    ? 'border-emerald-200/80' :
            res.status === 'FAIL'   ? 'border-red-200/80' :
            res.status === 'ERROR'  ? 'border-gray-200' :
            'border-amber-200/80'
        }`}>
            {/* Card Header */}
            <div
                className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                    res.status === 'PASS'   ? 'bg-emerald-50/40 hover:bg-emerald-50/70' :
                    res.status === 'FAIL'   ? 'bg-red-50/40 hover:bg-red-50/70' :
                    res.status === 'ERROR'  ? 'bg-gray-50/40 hover:bg-gray-50/70' :
                    'bg-amber-50/40 hover:bg-amber-50/70'
                }`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <StatusBadge status={res.status} />
                    <div>
                        <div className="flex items-center gap-2.5">
                            <p className="text-sm font-semibold text-gray-900">{res.dealId}</p>
                            {/* #1 — Mismatch count badge */}
                            {mismatchCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                                    <XCircle className="w-2.5 h-2.5" />
                                    {mismatchCount} mismatch{mismatchCount > 1 ? 'es' : ''}
                                </span>
                            )}
                        </div>
                        {/* Meta ID + Product ID (no auto-generated name) — #5 */}
                        <div className="flex flex-wrap gap-x-4 mt-0.5">
                            {res.pubMaticDealId && (
                                <p className="text-[11px] text-gray-400 font-mono">Meta ID: {res.pubMaticDealId}</p>
                            )}
                            {res.productId && (
                                <p className="text-[11px] text-gray-400 font-mono">Product ID: {res.productId}</p>
                            )}
                        </div>
                        {/* Site + Tag */}
                        {(res.siteId || res.tagId) && (
                            <div className="flex flex-wrap gap-x-4 mt-0.5">
                                {res.siteId && (
                                    <p className="text-[11px] text-indigo-500 font-mono">
                                        Site: {res.siteName ? `${res.siteName} (${res.siteId})` : res.siteId}
                                    </p>
                                )}
                                {res.tagId && (
                                    <p className="text-[11px] text-indigo-500 font-mono">
                                        Tag: {res.tagName ? `${res.tagName} (${res.tagId})` : res.tagId}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isSkipOrError && (
                        <span className="text-xs text-gray-500 max-w-[300px] truncate" title={res.comments}>{res.comments}</span>
                    )}
                    {!isSkipOrError && (
                        <span className="text-gray-400 transition-transform duration-200">
                            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </span>
                    )}
                </div>
            </div>

            {/* Comparison Table + Additional Info */}
            {expanded && !isSkipOrError && (
                <div className="animate-fade-in">
                    {/* Comparison table */}
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/80 border-t border-gray-100">
                                <th className="px-5 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[160px]">Parameter</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Your Sheet</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">API</th>
                                <th className="px-5 py-2.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-[110px]">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleRows.map((row, i) => {
                                const result = getRowResult(row.yourSheet, row.api, undefined, row.caseInsensitive, row.isStatus);
                                const sheetDisplay = row.isDate && row.yourSheet !== '-'
                                    ? <>{row.yourSheet} <span className="text-[10px] text-gray-400 font-sans">PST</span></>
                                    : row.yourSheet;
                                const apiDisplay = row.isDate && row.api !== '-'
                                    ? <>{row.api} <span className="text-[10px] text-gray-400 font-sans">PST</span></>
                                    : row.api;

                                return (
                                    <tr key={i} className={`transition-colors ${
                                        result === 'FAIL' ? 'bg-red-50/30' :
                                        result === 'WARN' ? 'bg-amber-50/20' :
                                        'hover:bg-gray-50/50'
                                    }`}>
                                        <td className="px-5 py-2.5 text-xs font-semibold text-gray-600">{row.param}</td>
                                        <td className="px-5 py-2.5 text-sm text-gray-900 font-mono">{sheetDisplay}</td>
                                        <td className="px-5 py-2.5 text-sm text-gray-900 font-mono">{apiDisplay}</td>
                                        <td className="px-5 py-2.5 text-center">
                                            {result === 'PASS' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    <CheckCircle className="w-3 h-3" /> Match
                                                </span>
                                            )}
                                            {result === 'FAIL' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                                                    <XCircle className="w-3 h-3" /> Mismatch
                                                </span>
                                            )}
                                            {result === 'WARN' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                                    <AlertTriangle className="w-3 h-3" /> Warning
                                                </span>
                                            )}
                                            {result === 'N/A' && (
                                                <span className="text-[10px] text-gray-300 font-medium">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Additional Info section */}
                    {(res.buyerName || res.auctionType || res.priority || res.lastModified ||
                      res.dealCategory || res.inventoryPlatform || res.adType || res.vastVersion) && (
                        <div className="border-t border-gray-100 bg-blue-50/20 px-5 py-4">
                            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-3">
                                Additional Info — from API
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                                {res.buyerName && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Buyer Name</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.buyerName}</p>
                                    </div>
                                )}
                                {res.auctionType && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Auction Type</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.auctionType}</p>
                                    </div>
                                )}
                                {res.priority && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Priority</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.priority}</p>
                                    </div>
                                )}
                                {res.dealCategory && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Deal Category</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.dealCategory}</p>
                                    </div>
                                )}
                                {res.inventoryPlatform && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Inventory Platform</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.inventoryPlatform}</p>
                                    </div>
                                )}
                                {res.adType && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ad Type</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.adType}</p>
                                    </div>
                                )}
                                {res.vastVersion && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">VAST Version</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.vastVersion}</p>
                                    </div>
                                )}
                                {res.lastModified && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Last Modified</p>
                                        <p className="text-xs text-gray-800 font-medium mt-0.5">{res.lastModified} <span className="text-gray-400">PST</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const DealQA: React.FC = () => {
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [tokenFile, setTokenFile] = useState<File | null>(null);
    const [token, setToken] = useState<string>("");
    const [results, setResults] = useState<DealValidationResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setExcelFile(e.target.files[0]);
        }
    };

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setTokenFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                if (text) setToken(text.trim());
            };
            reader.readAsText(file);
        }
    };

    const processExcelAndValidate = async () => {
        if (!excelFile || !token) {
            alert("Please upload both Excel file and Token file.");
            return;
        }

        setIsProcessing(true);
        setResults([]);
        setProgress(0);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                let headerRowIdx = -1;

                console.log(`[DealQA] Sheet: "${sheetName}", Total raw rows: ${rawRows.length}`);
                for (let i = 0; i < Math.min(10, rawRows.length); i++) {
                    console.log(`[DealQA] Row ${i}:`, JSON.stringify(rawRows[i]));
                }

                for (let i = 0; i < Math.min(20, rawRows.length); i++) {
                    const rowStr = JSON.stringify(rawRows[i]).toLowerCase();
                    if (rowStr.includes("deal name") || rowStr.includes("deal id")) {
                        headerRowIdx = i;
                        console.log(`[DealQA] Found deal header at row ${i}`);
                        break;
                    }
                }

                if (headerRowIdx === -1) {
                    console.error("[DealQA] 'Deal Name' column NOT found in first 20 rows.");
                    alert("Could not find a 'Deal Name' column in the Excel file. Please ensure the sheet has a 'Deal Name' column.");
                    setIsProcessing(false);
                    return;
                }

                const headerRow = rawRows[headerRowIdx].map((h: any) => String(h ?? "").trim());
                const finalWorksheet: Record<string, any>[] = [];
                for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
                    const dataRow = rawRows[r];
                    if (!dataRow || dataRow.every((cell: any) => cell === null || cell === undefined || cell === "")) continue;
                    const obj: Record<string, any> = {};
                    headerRow.forEach((colName: string, idx: number) => {
                        if (colName) {
                            obj[colName] = dataRow[idx] !== undefined ? dataRow[idx] : "";
                        }
                    });
                    finalWorksheet.push(obj);
                }

                console.log(`[DealQA] Parsed ${finalWorksheet.length} data rows after header row ${headerRowIdx}`);
                if (finalWorksheet.length > 0) {
                    console.log(`[DealQA] Column names:`, Object.keys(finalWorksheet[0]));
                    console.log(`[DealQA] First data row:`, JSON.stringify(finalWorksheet[0]));
                }

                const validationResults: DealValidationResult[] = [];
                const totalRows = finalWorksheet.length;

                for (let i = 0; i < totalRows; i++) {
                    const row: any = finalWorksheet[i];

                    const normalizedRow: Record<string, any> = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.trim().toLowerCase()] = row[key];
                    });

                    const getValue = (colName: string) => normalizedRow[colName.toLowerCase()];

                    const dealName = String(getValue("Deal Name") || getValue("Deal ID") || "").trim();

                    console.log(`[DealQA] Row ${i}: Deal Name="${dealName}", All keys:`, Object.keys(normalizedRow));

                    if (!dealName) {
                        validationResults.push({
                            dealId: "Unknown",
                            dealName: "",
                            status: 'SKIPPED',
                            comments: "Empty 'Deal Name' value"
                        });
                        setProgress(Math.round(((i + 1) / totalRows) * 100));
                        continue;
                    }

                    try {
                        // ── Step 1: API 1 — Search by Deal Name → returns full deal object ──
                        setProgress(Math.round(((i * 2 + 1) / (totalRows * 2)) * 100));
                        const dealItem = await fetchDealByName(dealName, token);

                        if (!dealItem || !dealItem.id) {
                            validationResults.push({
                                dealId: dealName,
                                dealName,
                                status: 'ERROR',
                                comments: `Deal not found via API for name: "${dealName}"`
                            });
                            setProgress(Math.round(((i + 1) / totalRows) * 100));
                            continue;
                        }

                        const metaId = String(dealItem.id);
                        const productId = extractProductId(dealItem);
                        console.log(`[DealQA] Row ${i}: Meta ID=${metaId}, Product ID=${productId}`);

                        // ── Step 2: Fetch Product Inventory (Site, Tag + additional info) ─
                        setProgress(Math.round(((i * 2 + 2) / (totalRows * 2)) * 100));
                        let siteId = "", siteName = "", tagId = "", tagName = "";
                        let productData: any = null;

                        if (productId) {
                            productData = await fetchProductDetails(productId, token);
                            const inv = extractInventoryInfo(productData);
                            siteId = inv.siteId;
                            siteName = inv.siteName;
                            tagId = inv.tagId;
                            tagName = inv.tagName;
                            console.log(`[DealQA] Row ${i}: Site=${siteName}(${siteId}), Tag=${tagName}(${tagId})`);
                        } else {
                            console.warn(`[DealQA] Row ${i}: No product ID in deal — skipping inventory lookup`);
                        }

                        // ── Validate: compare Your Sheet vs API 1 deal data ───────────────
                        const validationRow = {
                            "Deal Name":              getValue("Deal Name"),
                            "CPM (INR)":              getValue("CPM (INR)"),
                            "Start Date (MM-DD-YY)":  getValue("Start Date (MM-DD-YY)"),
                            "End date (MM-DD-YY)":    getValue("End date (MM-DD-YY)"),
                            "Budget (INR)":           getValue("Budget (INR)"),
                            "Total Impressions":      getValue("Total Impressions"),
                            "Buyer Seat ID":          getValue("Buyer Seat ID"),
                            "DSP":                    getValue("DSP"),
                            "Deal Type":              getValue("Deal Type"),
                            "Frequency Cap":          getValue("Frequency Cap"),
                            "Deal ID":                dealName
                        };

                        // ── Additional info from API 1 (deal object) ────────────────────
                        const buyerName        = dealItem?.buyers?.[0]?.name ?? "";
                        const auctionType      = dealItem?.auctionType?.name ?? "";
                        const priority         = dealItem?.priority != null ? String(dealItem.priority) : "";
                        const lastModified     = dealItem?.modificationTime
                            ? new Date(dealItem.modificationTime).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
                            : "";
                        const dealCategory     = dealItem?.dealCategory?.name ?? "";

                        // ── Additional info from product API (reuse productData from Step 2) ─
                        const inventoryPlatform = productData?.platforms?.[0]?.name ?? "";
                        const adType            = productData?.adTypes?.[0]?.name ?? "";
                        const vastVersion       = productData?.vastVersions?.[0]?.name ?? "";

                        const result = validateDeal(validationRow, dealItem);
                        result.dealId           = dealName;
                        result.pubMaticDealId   = metaId;
                        result.productId        = productId  ?? undefined;
                        result.siteId           = siteId     || undefined;
                        result.siteName         = siteName   || undefined;
                        result.tagId            = tagId      || undefined;
                        result.tagName          = tagName    || undefined;
                        result.buyerName        = buyerName  || undefined;
                        result.auctionType      = auctionType || undefined;
                        result.priority         = priority   || undefined;
                        result.lastModified     = lastModified || undefined;
                        result.dealCategory     = dealCategory || undefined;
                        result.inventoryPlatform = inventoryPlatform || undefined;
                        result.adType           = adType     || undefined;
                        result.vastVersion      = vastVersion || undefined;

                        validationResults.push(result);
                    } catch (err) {
                        validationResults.push({
                            dealId: dealName,
                            dealName,
                            status: 'ERROR',
                            comments: "Exception during validation"
                        });
                    }

                    setProgress(Math.round(((i + 1) / totalRows) * 100));
                }

                setResults(validationResults);
                setIsProcessing(false);
            };
            reader.readAsBinaryString(excelFile);
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            alert("Error processing file.");
        }
    };

    const exportResults = () => {
        if (results.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Deal QA Results");
        XLSX.writeFile(wb, "Deal_QA_Report.xlsx");
    };

    const passCount  = results.filter(r => r.status === 'PASS').length;
    const failCount  = results.filter(r => r.status === 'FAIL').length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    const skipCount  = results.filter(r => r.status === 'SKIPPED').length;
    const passRate   = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200/80">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-5">Deal QA Configuration</h3>

                <div className="grid md:grid-cols-2 gap-5">
                    {/* Token Upload */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">1. Auth Token (.txt)</label>
                        <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 group cursor-pointer ${
                            tokenFile
                                ? 'border-emerald-300 bg-emerald-50/30'
                                : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-brand-blue/40 hover:bg-brand-light/20'
                        }`}>
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleTokenChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-105">
                                <div className={`p-3 rounded-xl shadow-sm ${
                                    tokenFile ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 shadow-gray-100'
                                }`}>
                                    {tokenFile ? <CheckCircle className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        {tokenFile ? tokenFile.name : "Click to upload token.txt"}
                                    </p>
                                    {tokenFile && <p className="text-xs text-emerald-600 mt-1 font-medium">Token Loaded</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deal Sheet Upload */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">2. Deal Sheet (.xlsx)</label>
                        <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 group cursor-pointer ${
                            excelFile
                                ? 'border-blue-300 bg-blue-50/30'
                                : 'border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-brand-blue/40 hover:bg-brand-light/20'
                        }`}>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleExcelChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-105">
                                <div className={`p-3 rounded-xl shadow-sm ${
                                    excelFile ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 shadow-gray-100'
                                }`}>
                                    {excelFile ? <CheckCircle className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        {excelFile ? excelFile.name : "Click to upload Excel"}
                                    </p>
                                    {excelFile && <p className="text-xs text-blue-600 mt-1 font-medium">File Ready</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions & Progress */}
                <div className="mt-6">
                    {isProcessing && (
                        <div className="mb-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-gray-500">Fetching deal details &amp; inventory...</span>
                                <span className="text-xs font-bold text-brand-blue font-mono">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-blue to-brand-navy rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            onClick={processExcelAndValidate}
                            disabled={!excelFile || !token || isProcessing}
                            className={`flex items-center gap-2.5 px-7 py-3 rounded-xl font-semibold text-white shadow-sm transition-all duration-200 text-sm
                                ${!excelFile || !token || isProcessing
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-brand-blue to-brand-navy hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            {isProcessing
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                : <><Play className="w-4 h-4" /> Run Validation</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {results.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
                    <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-bold text-gray-900 font-mono mt-1">{results.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200/60 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Passed</p>
                        <p className="text-2xl font-bold text-emerald-600 font-mono mt-1">{passCount}</p>
                        <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${passRate}%` }} />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-red-200/60 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Failed</p>
                        <p className="text-2xl font-bold text-red-600 font-mono mt-1">{failCount}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200/60 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Errors</p>
                        <p className="text-2xl font-bold text-gray-600 font-mono mt-1">{errorCount}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200/60 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Skipped</p>
                        <p className="text-2xl font-bold text-amber-600 font-mono mt-1">{skipCount}</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-brand-blue" />
                            Validation Results
                            <span className="text-xs text-gray-400 font-mono font-normal ml-2">{results.length} deals</span>
                        </h3>
                        <button
                            onClick={exportResults}
                            className="flex items-center gap-2 text-xs font-semibold text-brand-blue hover:text-brand-navy bg-brand-light/50 hover:bg-brand-light px-3 py-1.5 rounded-lg transition-all"
                        >
                            <Download className="w-3.5 h-3.5" /> Export Excel
                        </button>
                    </div>

                    <div className="space-y-4">
                        {results.map((res, idx) => (
                            <DealCard key={idx} res={res} defaultExpanded={results.length <= 5} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
