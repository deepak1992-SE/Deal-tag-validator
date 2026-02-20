export interface MediaPlanRecord {
    dealName: string;
    deviceTargeted: string; // 'CTV', 'AOS', 'IOS', etc.
    adDuration?: number;
    format?: string; // e.g. 'Display', 'Video' — Rule 3: CTV+Display is invalid
}

export interface AdTag {
    url: string;
    parameters: Record<string, string>;
    lineNumber: number;
    originalString: string;
}

export type ValidationStatus = 'Valid' | 'Invalid' | 'Warning' | 'Info' | 'N/A';

export interface ValidationResult {
    dealName: string;
    tagName: string;
    filename: string;
    deviceTarget: string;
    deviceTypeParam: string;
    storeBundleStatus: string;

    dealMatchStatus: 'Found' | 'Not Found';
    tagNameMatchStatus: 'Match' | 'Mismatch' | 'Mismatch (Calculated)';
    deviceTypeStatus: ValidationStatus;
    storeBundleValidationStatus: ValidationStatus;
    filenameCheckStatus: 'Valid' | 'Warning' | 'N/A';
    durationStatus: ValidationStatus;

    isDuplicateTagName?: boolean; // true if another tag with the same name exists

    // Rule 3: Format check (CTV + Display is invalid)
    format?: string;
    formatCheckStatus?: 'Pass' | 'Fail' | 'N/A';

    // Rule 4: Publisher macro verification
    publisherId?: string;
    macroCheckStatus?: 'Pass' | 'Fail' | 'N/A';
    missingMacros?: string[];

    summary: string;
    errors?: string[]; // Optional compatibility
}

export interface ParsedMediaPlan {
    [normalizedDealName: string]: MediaPlanRecord;
}

export interface DealValidationResult {
    dealId: string;
    dealName: string;
    pubMaticDealId?: string;

    // Detailed comparison fields
    cpmExcel?: string;
    cpmApi?: string;

    impressionExcel?: string;
    impressionApi?: string;

    budgetExcel?: string;
    budgetApi?: string;

    startDateExcel?: string;
    startDateApi?: string;

    endDateExcel?: string;
    endDateApi?: string;

    buyerSeatIdExcel?: string;
    buyerSeatIdApi?: string;

    dspExcel?: string;
    dspApi?: string;

    dealTypeExcel?: string;
    dealTypeApi?: string;

    dealStatusApi?: string;

    freqCapExcel?: string;
    freqCapApi?: string;

    status: 'PASS' | 'FAIL' | 'SKIPPED' | 'ERROR';
    comments: string;
}

export interface DealDetail {
    [key: string]: any;
}
