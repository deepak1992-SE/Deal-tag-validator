import type { AdTag, MediaPlanRecord, ParsedMediaPlan, ValidationResult, ValidationStatus } from '../types';
import { checkMacros } from './macroData';

/**
 * Normalizes a string for comparison (trim).
 */
const normalize = (s: string) => s.trim();

/**
 * Tries to find a matching deal in the Media Plan.
 */
const findDealMatch = (tagName: string, plan: ParsedMediaPlan): { dealName: string, record: MediaPlanRecord | undefined } => {
    const cleanTagName = normalize(tagName);

    // 1. Direct match
    if (plan[cleanTagName]) {
        return { dealName: cleanTagName, record: plan[cleanTagName] };
    }

    // 2. Suffix stripping
    const suffixes = ['_IOS', '_AOS', '_CTV', '_AOS+IOS', '_IOS+AOS', '_Mobile', '_Desktop'];

    for (const suffix of suffixes) {
        if (cleanTagName.endsWith(suffix)) {
            const baseName = cleanTagName.slice(0, -suffix.length);
            if (plan[baseName]) {
                return { dealName: baseName, record: plan[baseName] };
            }
        }
    }

    return { dealName: "Unknown", record: undefined };
};

/**
 * Checks VAST URL parameters.
 */
const checkVastParams = (url: string) => {
    const lowerUrl = url.toLowerCase();
    const hasDeviceType3 = lowerUrl.includes('devicetype=3') || lowerUrl.includes('devicetype%3d3');
    const hasStoreUrl = lowerUrl.includes('storeurl') || lowerUrl.includes('store_url');
    const hasBundle = lowerUrl.includes('bundle');

    return { hasDeviceType3, hasStoreUrl, hasBundle };
};

export const validateAdTag = (tag: AdTag, plan: ParsedMediaPlan): ValidationResult => {
    const { tagName, vastUrl, filename } = tag;

    // Step 1: Match
    const { record } = findDealMatch(tagName, plan);
    const dealMatchStatus = record ? 'Found' : 'Not Found';
    const matchedDealName = record ? record.dealName : "No Match Found";
    const deviceTarget = record ? record.deviceTargeted : "N/A";

    // Step 2: Logical Checks
    let tagNameMatchStatus: 'Match' | 'Mismatch' | 'Mismatch (Calculated)' = 'Match';
    let deviceTypeStatus: ValidationStatus = 'Valid';
    let storeBundleValidationStatus: ValidationStatus = 'Valid';
    let filenameCheckStatus: 'Valid' | 'Warning' | 'N/A' = 'N/A';
    let summaryParts: string[] = [];

    // Check VAST Params early to use in Logic
    const { hasDeviceType3, hasStoreUrl, hasBundle } = checkVastParams(vastUrl);
    const deviceTypeParamValue = hasDeviceType3 ? '3' : 'Missing / Invalid';

    // Check 1: Name Consistency
    if (!record) {
        tagNameMatchStatus = 'Mismatch';
        summaryParts.push("Deal not found in Media Plan.");
    } else {
        const deviceTargetUpper = deviceTarget.toUpperCase();
        const isCTV = deviceTargetUpper.includes('CTV');
        const isMobile = deviceTargetUpper.includes('AOS') || deviceTargetUpper.includes('IOS') || deviceTargetUpper.includes('MOBILE');

        const tagUpper = tagName.toUpperCase();
        const filenameUpper = filename.toUpperCase();

        // Tag Name Suffix Check
        if (isCTV) {
            if (tagUpper.includes('_AOS') || tagUpper.includes('_IOS')) {
                tagNameMatchStatus = 'Mismatch';
                summaryParts.push("CTV Deal has Mobile suffix in Tag Name.");
            }
        }

        // Filename Consistency Check
        if (filenameUpper.includes('CTV')) {
            if (!isCTV) {
                filenameCheckStatus = 'Warning';
                if (!hasDeviceType3) {
                    summaryParts.push("Filename implies CTV but matched Deal is not CTV. Also the tag in the txt file looks to be mobile tag because it does not have devicetype=3.");
                } else {
                    summaryParts.push("Filename implies CTV and Tag has devicetype=3, but matched Deal is not CTV.");
                }
            } else {
                filenameCheckStatus = 'Valid';
            }
        } else if (filenameUpper.includes('MOBILE') || filenameUpper.includes('AOS') || filenameUpper.includes('IOS')) {
            if (!isMobile) {
                // Soft warning
                if (isCTV) {
                    filenameCheckStatus = 'Warning';
                    summaryParts.push("Filename implies Mobile but matched Deal is CTV.");
                }
            } else {
                filenameCheckStatus = 'Valid';
            }
        }
    }

    // Check 2: VAST Parameter 'devicetype'
    // (Variables already calculated above)

    if (record) {
        const deviceTargetUpper = deviceTarget.toUpperCase();
        const isCTV = deviceTargetUpper.includes('CTV');
        const isMobile = deviceTargetUpper.includes('AOS') || deviceTargetUpper.includes('IOS') || deviceTargetUpper.includes('MOBILE');

        if (isCTV) {
            if (!hasDeviceType3) {
                deviceTypeStatus = 'Invalid';
                summaryParts.push("CTV Deal missing devicetype=3.");
            }
        } else if (isMobile) {
            if (hasDeviceType3) {
                // Check if we already have the specific matching warning from filename check
                const specificWarning = "Filename implies CTV but matched Deal is not CTV. Also the tag in the txt file looks to be mobile tag because it does not have devicetype=3.";
                const simplerWarning = "Filename implies CTV but matched Deal is not CTV.";

                const hasSpecificWarning = summaryParts.includes(specificWarning);
                const hasSimplerWarning = summaryParts.includes(simplerWarning);

                // Only add this generic error if we haven't already covered it with the more specific filename mismatch warning
                if (!hasSpecificWarning && !hasSimplerWarning) {
                    deviceTypeStatus = 'Invalid';
                    summaryParts.push("Mobile Deal has devicetype=3.");
                } else if (hasSimplerWarning) {
                    // If we have the simpler filename warning, upgrade it to the specific one if appropriate, or just leave it.
                    // In this case, hasDeviceType3 is TRUE, so the tag *looks* like CTV.
                    // The user's requested message was: "...because it does not have devicetype=3" which implies the OPPOSITE case (tag looking mobile).

                    // Let's re-read the user request carefully:
                    // "Filename implies CTV but matched Deal is not CTV. also the tag in the txt file looks to be mobile tag because it does not have devicetype=3"

                    // This implies: Filename=CTV (Target=Mobile), Tag has NO devicetype=3.

                    // Current block is: isMobile=TRUE, hasDeviceType3=TRUE.
                    // So here the tag DOES have devicetype=3. It looks like CTV.
                    // The user's message applies when hasDeviceType3 is FALSE.

                    // So for THIS block (hasDeviceType3=true), it is indeed an invalid mobile deal (param shouldn't be there).
                    deviceTypeStatus = 'Invalid';
                    summaryParts.push("Mobile Deal has devicetype=3.");
                } else {
                    deviceTypeStatus = 'Invalid';
                    summaryParts.push("Mobile Deal has devicetype=3.");
                }
            }
        }
    }

    // Check 3: StoreURL & Bundle
    let storeBundleStatusText = "Normal";

    if (record) {
        const deviceTargetUpper = deviceTarget.toUpperCase();
        const isCTV = deviceTargetUpper.includes('CTV');
        const isMobile = deviceTargetUpper.includes('AOS') || deviceTargetUpper.includes('IOS') || deviceTargetUpper.includes('MOBILE');

        if (isCTV) {
            // Rule: CTV requires BOTH storeurl AND bundle
            if (hasStoreUrl && hasBundle) {
                storeBundleStatusText = "Both Params Present";
                storeBundleValidationStatus = 'Valid';
            } else {
                storeBundleValidationStatus = 'Invalid';
                // Determine what is missing
                if (!hasStoreUrl && !hasBundle) {
                    storeBundleStatusText = "Both Missing";
                    summaryParts.push("CTV Deal missing both StoreURL and Bundle.");
                } else if (!hasStoreUrl) {
                    storeBundleStatusText = "Bundle present, StoreURL missing";
                    summaryParts.push("CTV Deal missing StoreURL.");
                } else {
                    storeBundleStatusText = "StoreURL present, Bundle missing";
                    summaryParts.push("CTV Deal missing Bundle.");
                }
            }
        } else if (isMobile) {
            // Rule: Mobile requires StoreURL. Bundle is usually optional or good to have.
            // User said: "Mobile tag store URL is required"
            // We interpret this as: Must have StoreURL. Bundle state doesn't cause failure?
            // "just to clarity for Mobile tag store URL is required and for CTV both store URL and Bundle are required" -- this usually implies Bundle is NOT required for Mobile, or at least lack of it is fine.

            if (hasStoreUrl) {
                storeBundleValidationStatus = 'Valid';
                if (hasBundle) {
                    storeBundleStatusText = "Both Params Present";
                } else {
                    storeBundleStatusText = "StoreURL present, Bundle missing";
                    summaryParts.push("StoreURL present (Valid).");
                }
            } else {
                storeBundleValidationStatus = 'Invalid';
                storeBundleStatusText = hasBundle ? "Bundle present, StoreURL missing" : "Both Missing";
                summaryParts.push("Mobile Deal missing StoreURL.");
            }
        } else {
            // Fallback for other deal types (Desktop?)
            if (!hasStoreUrl && !hasBundle) {
                storeBundleStatusText = "Both Missing";
            } else if (hasStoreUrl && hasBundle) {
                storeBundleStatusText = "Both Params Present";
            } else {
                storeBundleStatusText = hasStoreUrl ? "StoreURL present, Bundle missing" : "Bundle present, StoreURL missing";
            }
        }
    } else {
        // No record match logic (keeps existing behavior if needed, or simplified)
        if (hasStoreUrl && !hasBundle) {
            storeBundleStatusText = "StoreURL present, Bundle missing";
        } else if (hasStoreUrl && hasBundle) {
            storeBundleStatusText = "Both Params Present";
        } else if (!hasStoreUrl && !hasBundle) {
            storeBundleStatusText = "Both Missing";
        } else {
            storeBundleStatusText = "Bundle present, StoreURL missing";
        }
    }

    // Check 4: Format (Rule 3 — CTV + Display is invalid)
    let formatCheckStatus: 'Pass' | 'Fail' | 'N/A' = 'N/A';
    if (record) {
        const deviceTargetUpper = deviceTarget.toUpperCase();
        const isCTV = deviceTargetUpper.includes('CTV');
        if (record.format !== undefined) {
            // Format column exists in Excel
            if (isCTV && record.format.toLowerCase().includes('display')) {
                formatCheckStatus = 'Fail';
                summaryParts.push(`Invalid format: CTV deal should not use Display format (got "${record.format}").`);
            } else {
                formatCheckStatus = 'Pass';
            }
        }
        // If record.format is undefined, Format column was missing from Excel → keep N/A
    }

    // Check 5: Publisher ID Macro Verification (Rule 4)
    let macroCheckStatus: 'Pass' | 'Fail' | 'N/A' = 'N/A';
    let missingMacros: string[] = [];
    let publisherId: string | undefined;

    // Extract pubId from VAST URL (try common param name variations)
    const pubIdMatch = vastUrl.match(/[?&]pubid=(\d+)/i);
    publisherId = pubIdMatch ? pubIdMatch[1] : undefined;

    if (publisherId) {
        // Determine platform from tag name suffix (most reliable) or device target
        const tagUpper = tagName.toUpperCase();
        const deviceTargetUpper = record ? deviceTarget.toUpperCase() : '';
        let macroPlatform: 'ctv' | 'aos' | 'ios';
        if (tagUpper.endsWith('_IOS')) {
            macroPlatform = 'ios';
        } else if (tagUpper.endsWith('_AOS') || deviceTargetUpper.includes('AOS') || deviceTargetUpper.includes('MOBILE')) {
            macroPlatform = 'aos';
        } else if (deviceTargetUpper.includes('IOS')) {
            macroPlatform = 'ios';
        } else {
            macroPlatform = 'ctv';
        }

        const macroResult = checkMacros(vastUrl, publisherId, macroPlatform);
        macroCheckStatus = macroResult.status;
        missingMacros = macroResult.missing;
        if (macroCheckStatus === 'Fail') {
            summaryParts.push(`Publisher ${publisherId} macro check failed — missing: ${missingMacros.join(', ')}.`);
        }
    }

    // Check 6: Duration (vmaxl)
    let durationStatus: ValidationStatus = 'N/A';
    if (record && record.adDuration) {
        const lowerUrl = vastUrl.toLowerCase();
        // Extract vmaxl value: match vmaxl=123 or vmaxl%3d123
        const match = lowerUrl.match(/vmaxl(?:=|%3d)(\d+)/);
        if (match) {
            const vmaxlValue = parseInt(match[1], 10);
            const expectedVmaxl = record.adDuration + 1;

            if (vmaxlValue === expectedVmaxl) {
                durationStatus = 'Valid';
            } else {
                durationStatus = 'Invalid';
                summaryParts.push(`Duration Mismatch: Plan Duration=${record.adDuration} (Expected vmaxl=${expectedVmaxl}) but Tag vmaxl=${vmaxlValue}.`);
            }
        } else {
            durationStatus = 'Warning';
            summaryParts.push(`Plan has Duration=${record.adDuration} but Tag is missing 'vmaxl' param.`);
        }
    }

    // Final Summary
    let finalStatus = "PASS";
    if (
        tagNameMatchStatus === 'Mismatch' ||
        deviceTypeStatus === 'Invalid' ||
        durationStatus === 'Invalid' ||
        storeBundleValidationStatus === 'Invalid' ||
        formatCheckStatus === 'Fail' ||
        macroCheckStatus === 'Fail'
    ) {
        finalStatus = "FAIL";
    } else if (filenameCheckStatus === 'Warning' || durationStatus === 'Warning') {
        finalStatus = "WARN";
    }

    const summary = summaryParts.length > 0 ? `${finalStatus} - ${summaryParts.join(' ')}` : "PASS - All checks valid.";

    return {
        dealName: matchedDealName,
        tagName: tagName,
        filename: filename,
        deviceTarget: deviceTarget,
        deviceTypeParam: deviceTypeParamValue,
        storeBundleStatus: storeBundleStatusText,
        dealMatchStatus,
        tagNameMatchStatus,
        deviceTypeStatus,
        storeBundleValidationStatus,
        filenameCheckStatus,
        durationStatus,
        format: record?.format,
        formatCheckStatus,
        publisherId,
        macroCheckStatus,
        missingMacros,
        summary
    };
};
