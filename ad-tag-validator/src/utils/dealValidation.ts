import type { DealValidationResult } from '../types';

// Configuration — use Vite proxy in dev to avoid CORS
const API_BASE_URL = import.meta.env.DEV ? "/api/pubmatic" : "https://api.pubmatic.com";
const API_ENDPOINT = "/v3/pmp/deals/";

// Owner constants used across all 3 PubMatic APIs
const OWNER_ID = "164208";
const OWNER_TYPE_ID = "1";

/**
 * Converts an Excel serial date number to YYYY-MM-DD string.
 * Excel epoch is Dec 30, 1899 (due to Lotus 1-2-3 leap year bug).
 */
const excelSerialToDate = (serial: number): string => {
    const excelEpoch = Date.UTC(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch + serial * 86400000);
    return date.toISOString().split('T')[0];
};

/**
 * Converts a UTC ISO datetime string to a YYYY-MM-DD date in PST/PDT.
 * PubMatic's API returns UTC ("2025-12-05T05:12:00Z") but the UI and
 * Operations team always work in PST/PDT (America/Los_Angeles).
 * e.g. 2025-12-05T05:12:00Z UTC = 2025-12-04 21:12 PST → date "2025-12-04"
 */
const utcIsoToPstDate = (isoStr: string): string => {
    return new Date(isoStr).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    // en-CA locale produces YYYY-MM-DD format natively
};

export const normalizeDate = (dateObj: any): string | null => {
    if (!dateObj) return null;
    try {
        // Handle Excel serial date numbers (e.g. 45595 = 2024-12-04)
        const num = typeof dateObj === 'number' ? dateObj : Number(dateObj);
        if (!isNaN(num) && num > 30000 && num < 100000) {
            return excelSerialToDate(num);
        }

        if (typeof dateObj === 'string') {
            // API returns UTC ISO format: "2025-12-05T05:12:00Z"
            // Convert to PST date so it matches what the Ops team sees in the PubMatic UI
            if (dateObj.includes("T")) {
                return utcIsoToPstDate(dateObj);
            }
            if (dateObj.includes(" ")) {
                return dateObj.split(" ")[0];
            }
            return dateObj;
        }
        // If it's a JS Date object
        if (dateObj instanceof Date) {
            return dateObj.toISOString().split('T')[0];
        }
        return String(dateObj);
    } catch (e) {
        return String(dateObj);
    }
};

/**
 * API 1: Search for a deal by name and return the full deal item object.
 * GET /v3/pmp/deals?filters=name like *{dealName}*&filters=loggedInOwnerId eq 164208&filters=loggedInOwnerTypeId eq 1
 *
 * Response shape: { metaData: {...}, items: [ { id, name, flooreCPM, products, dsps, ... } ] }
 * The full item already contains all deal details — no separate deal-details API call is needed.
 */
export const fetchDealByName = async (dealName: string, authToken: string): Promise<any | null> => {
    const filters = `filters=name like *${dealName}*&filters=loggedInOwnerId eq ${OWNER_ID}&filters=loggedInOwnerTypeId eq ${OWNER_TYPE_ID}`;
    const url = `${API_BASE_URL}/v3/pmp/deals?${filters}`;
    let token = authToken.trim();
    if (!token.toLowerCase().startsWith("bearer ")) {
        token = `Bearer ${token}`;
    }

    console.log(`[DealQA API-1] Searching deal by name: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });

        console.log(`[DealQA API-1] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DealQA API-1] Error body:`, errorText);
            return null;
        }

        const data = await response.json();
        console.log(`[DealQA API-1] Raw response keys:`, Object.keys(data));

        // PubMatic API returns { metaData: {...}, items: [...] }
        const items: any[] = data?.items ?? [];
        console.log(`[DealQA API-1] Items found: ${items.length}`);

        if (items.length === 0) return null;

        // Return the full first item — it contains flooreCPM, products, dsps, dates, etc.
        return items[0];
    } catch (error) {
        console.error(`[DealQA API-1] Fetch failed:`, error);
        return null;
    }
};

/**
 * API 3: Fetch product inventory details (siteId, tagId) using a product ID.
 * GET /v1/inventory/products/{productId}?filters=loggedInOwnerId eq 164208&filters=loggedInOwnerTypeId eq 1
 */
export const fetchProductDetails = async (productId: string, authToken: string): Promise<any> => {
    const filters = `filters=loggedInOwnerId%20eq%20${OWNER_ID}&filters=loggedInOwnerTypeId%20eq%20${OWNER_TYPE_ID}`;
    const url = `${API_BASE_URL}/v1/inventory/products/${productId}?${filters}`;
    let token = authToken.trim();
    if (!token.toLowerCase().startsWith("bearer ")) {
        token = `Bearer ${token}`;
    }

    console.log(`[DealQA API-3] Fetching product: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });

        console.log(`[DealQA API-3] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DealQA API-3] Error body:`, errorText);
            return null;
        }

        const data = await response.json();
        console.log(`[DealQA API-3] Raw response keys:`, Object.keys(data));
        return data;
    } catch (error) {
        console.error(`[DealQA API-3] Fetch failed:`, error);
        return null;
    }
};

/**
 * Extracts product ID from an API 1 deal item.
 * API 1 response shape: { products: [{ id, name, uri }] }
 */
export const extractProductId = (apiData: any): string | null => {
    const products: any[] = apiData?.products ?? [];
    if (Array.isArray(products) && products.length > 0) {
        return String(products[0]?.id ?? "");
    }
    console.warn("[DealQA] No products array in API-1 response. Keys:", Object.keys(apiData));
    return null;
};

/**
 * Extracts siteId, siteName, tagId, tagName from an API 2 product response.
 * API 2 response shape: { sites: [{ id, name }], adTags: [{ id, name }] }
 */
export const extractInventoryInfo = (productData: any): { siteId: string; siteName: string; tagId: string; tagName: string } => {
    const empty = { siteId: "", siteName: "", tagId: "", tagName: "" };
    if (!productData) return empty;

    const sites: any[] = productData?.sites ?? [];
    const tags: any[] = productData?.adTags ?? [];

    const site = sites[0] ?? {};
    const tag = tags[0] ?? {};

    return {
        siteId: String(site?.id ?? ""),
        siteName: String(site?.name ?? ""),
        tagId: String(tag?.id ?? ""),
        tagName: String(tag?.name ?? ""),
    };
};

export const fetchDealDetails = async (dealId: string, authToken: string): Promise<any> => {
    const url = `${API_BASE_URL}${API_ENDPOINT}${dealId}`;
    let token = authToken.trim();
    if (!token.toLowerCase().startsWith("bearer ")) {
        token = `Bearer ${token}`;
    }

    console.log(`[DealQA API] Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });

        console.log(`[DealQA API] Response for deal ${dealId}: status=${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DealQA API] Error body:`, errorText);
            return null;
        }
        const data = await response.json();
        console.log(`[DealQA API] Deal ${dealId} response keys:`, Object.keys(data));
        return data;
    } catch (error) {
        console.error(`[DealQA API] Fetch failed for deal ${dealId}:`, error);
        return null;
    }
};

export const validateDeal = (excelRow: any, apiData: any): DealValidationResult => {
    const discrepancies: string[] = [];

    // Helper validation function
    const normalize = (val: any) => {
        if (val === null || val === undefined) return "";
        return String(val).trim();
    };

    // Configuration for checks
    // We'll capture specific values for the UI table while running checks
    const cpmExcel = normalize(excelRow["CPM (INR)"]);
    const cpmApi = normalize(apiData["flooreCPM"]);

    const impressionExcel = normalize(excelRow["Total Impressions"]);
    const impressionApi = normalize(apiData["impressionAvails"]);

    const budgetExcel = normalize(excelRow["Budget (INR)"]);
    const budgetApi = normalize(apiData["minSpend"]);

    // Capture raw + normalized date values for UI display
    const startDateExcelRaw = normalize(excelRow["Start Date (MM-DD-YY)"]);
    const startDateApiRaw = normalize(apiData["startDate"]);
    const startDateExcel = normalizeDate(startDateExcelRaw) ?? startDateExcelRaw;
    const startDateApi = normalizeDate(startDateApiRaw) ?? startDateApiRaw;

    const endDateExcelRaw = normalize(excelRow["End date (MM-DD-YY)"]);
    const endDateApiRaw = normalize(apiData["endDate"]);
    const endDateExcel = normalizeDate(endDateExcelRaw) ?? endDateExcelRaw;
    const endDateApi = normalizeDate(endDateApiRaw) ?? endDateApiRaw;

    // New fields: Buyer Seat ID, DSP, Deal Type, Deal Status, Frequency Cap
    const buyerSeatIdExcel = normalize(excelRow["Buyer Seat ID"]);
    // API returns dealDspBuyerMappings array — extract seatId from first entry
    const buyerSeatIdApi = apiData["dealDspBuyerMappings"]?.length > 0
        ? normalize(apiData["dealDspBuyerMappings"][0]["seatId"])
        : "";

    const dspExcel = normalize(excelRow["DSP"]);
    // API returns dsps array — extract name from first entry
    const dspApi = apiData["dsps"]?.length > 0
        ? normalize(apiData["dsps"][0]["name"])
        : "";

    const dealTypeExcel = normalize(excelRow["Deal Type"]);
    // API returns channelType object with name
    const dealTypeApi = normalize(apiData["channelType"]?.["name"]);

    // Deal status (API only — flag if not Active)
    const dealStatusApi = normalize(apiData["status"]?.["name"]);

    const freqCapExcel = normalize(excelRow["Frequency Cap"]);
    const freqCapApi = normalize(apiData["fcapLimit"]);

    const checks: Array<{ excelCol: string; apiField: string; label: string; isDate?: boolean; isNumeric?: boolean }> = [
        { excelCol: "Deal Name", apiField: "name", label: "Deal Name" },
        { excelCol: "CPM (INR)", apiField: "flooreCPM", label: "CPM", isNumeric: true },
        { excelCol: "Start Date (MM-DD-YY)", apiField: "startDate", label: "Start Date", isDate: true },
        { excelCol: "End date (MM-DD-YY)", apiField: "endDate", label: "End Date", isDate: true },
        { excelCol: "Budget (INR)", apiField: "minSpend", label: "Budget", isNumeric: true },
        { excelCol: "Total Impressions", apiField: "impressionAvails", label: "Impressions", isNumeric: true },
    ];

    checks.forEach(check => {
        let strExcel = normalize(excelRow[check.excelCol]);
        let strApi = normalize(apiData[check.apiField]);

        if (check.isDate) {
            strExcel = normalizeDate(strExcel) ?? strExcel;
            strApi = normalizeDate(strApi) ?? strApi;
            if (strExcel !== strApi) {
                discrepancies.push(`${check.label}: Expected '${strExcel}', Found '${strApi}'`);
            }
        } else if (check.isNumeric) {
            // Round to nearest integer before comparing (handles 1369707.5 vs 1369708 etc.)
            const numExcel = parseFloat(strExcel);
            const numApi = parseFloat(strApi);
            if (!isNaN(numExcel) && !isNaN(numApi)) {
                if (Math.round(numExcel) !== Math.round(numApi)) {
                    discrepancies.push(`${check.label}: Expected '${strExcel}', Found '${strApi}'`);
                }
            } else if (strExcel !== strApi) {
                discrepancies.push(`${check.label}: Expected '${strExcel}', Found '${strApi}'`);
            }
        } else {
            if (strExcel !== strApi) {
                discrepancies.push(`${check.label}: Expected '${strExcel}', Found '${strApi}'`);
            }
        }
    });

    // Additional checks using pre-extracted nested API fields
    // Buyer Seat ID (compare only if Excel has a value)
    if (buyerSeatIdExcel && buyerSeatIdApi && buyerSeatIdExcel !== buyerSeatIdApi) {
        discrepancies.push(`Buyer Seat ID: Expected '${buyerSeatIdExcel}', Found '${buyerSeatIdApi}'`);
    }

    // DSP (case-insensitive comparison)
    if (dspExcel && dspApi && dspExcel.toLowerCase() !== dspApi.toLowerCase()) {
        discrepancies.push(`DSP: Expected '${dspExcel}', Found '${dspApi}'`);
    }

    // Deal Type (case-insensitive comparison)
    if (dealTypeExcel && dealTypeApi && dealTypeExcel.toLowerCase() !== dealTypeApi.toLowerCase()) {
        discrepancies.push(`Deal Type: Expected '${dealTypeExcel}', Found '${dealTypeApi}'`);
    }

    // Deal Status — informational only, shown as WARN in UI, does NOT count as a discrepancy

    // Frequency Cap (numeric comparison)
    if (freqCapExcel && freqCapApi) {
        const fcExcel = parseFloat(freqCapExcel);
        const fcApi = parseFloat(freqCapApi);
        if (!isNaN(fcExcel) && !isNaN(fcApi)) {
            if (Math.round(fcExcel) !== Math.round(fcApi)) {
                discrepancies.push(`Frequency Cap: Expected '${freqCapExcel}', Found '${freqCapApi}'`);
            }
        } else if (freqCapExcel !== freqCapApi) {
            discrepancies.push(`Frequency Cap: Expected '${freqCapExcel}', Found '${freqCapApi}'`);
        }
    }

    const status = discrepancies.length > 0 ? 'FAIL' : 'PASS';

    return {
        dealId: "", // Will be set by caller
        dealName: normalize(excelRow["Deal Name"]),
        // Populate specific fields for UI
        cpmExcel,
        cpmApi,
        impressionExcel,
        impressionApi,
        budgetExcel,
        budgetApi,
        startDateExcel,
        startDateApi,
        endDateExcel,
        endDateApi,
        buyerSeatIdExcel,
        buyerSeatIdApi,
        dspExcel,
        dspApi,
        dealTypeExcel,
        dealTypeApi,
        dealStatusApi,
        freqCapExcel,
        freqCapApi,

        status,
        comments: discrepancies.join("; ")
    };
};
