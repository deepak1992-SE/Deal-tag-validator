export interface MediaPlanRecord {
    dealName: string;
    deviceTargeted: string; // 'CTV', 'AOS', 'IOS', etc.
    adDuration?: number;
}

export interface AdTag {
    filename: string;
    tagName: string;
    vastUrl: string;
}

export type ValidationStatus = 'Valid' | 'Invalid' | 'Warning' | 'Info' | 'N/A';

export interface ValidationResult {
    dealName: string;
    tagName: string;
    filename: string;
    deviceTarget: string;
    deviceTypeParam: string;
    storeBundleStatus: string;

    // Statuses for individual checks
    dealMatchStatus: 'Found' | 'Not Found';
    tagNameMatchStatus: 'Match' | 'Mismatch' | 'Mismatch (Calculated)';
    deviceTypeStatus: ValidationStatus;
    storeBundleValidationStatus: ValidationStatus;
    filenameCheckStatus: 'Valid' | 'Warning' | 'N/A';
    durationStatus: ValidationStatus;

    summary: string;
}

export interface ParsedMediaPlan {
    [normalizedDealName: string]: MediaPlanRecord;
}
