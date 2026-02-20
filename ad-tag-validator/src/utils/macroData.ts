/**
 * Publisher ID Macro Requirements
 *
 * Parsed from the PublisherID_macro reference file.
 * For each publisher + platform, lists the required URL parameter keys
 * that must be present in the VAST tag URL.
 *
 * Keys are derived by extracting param names from the macro strings in
 * the reference file (e.g. "&sec=1&storeurl=...&udid=..." → ['sec', 'storeurl', 'udid', ...]).
 *
 * Source file: PublisherID_macro (at project root)
 */

interface MacroRequirements {
    ctv?: string[];
    aos?: string[];
    ios?: string[];
}

// Macro requirements per publisher ID, derived from the PublisherID_macro reference file.
// Each array lists the URL parameter keys that must be present in the VAST tag.
const PUBLISHER_MACROS: Record<string, MacroRequirements> = {
    // MX Player (tag-based pub ID 158872)
    // CTV:  &sec=1&storeurl=...&udid=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&ifty=...&lmt=...
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...&bundle=...
    // iOS:  &gdpr=0&storeurl=...&udid=...&udidtype=1&udidhash=1&lmt=...&bundle=...
    '158872': {
        ctv: ['sec', 'storeurl', 'udid', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'ifty', 'lmt'],
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
        ios: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
    },

    // SonyLiv (tag-based pub ID 156549)
    // CTV:  &sec=1&storeurl=...&udid=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&ifty=...&lmt=...
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...&bundle=...
    // iOS:  &gdpr=0&storeurl=...&udid=...&udidtype=1&udidhash=1&lmt=...&bundle=...
    '156549': {
        ctv: ['sec', 'storeurl', 'udid', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'ifty', 'lmt'],
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
        ios: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
    },

    // Zee5 (tag-based pub ID 158354)
    // CTV:  &sec=1&storeurl=...&udid=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&ifty=...&lmt=...
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...&bundle=...
    // iOS:  &gdpr=0&storeurl=...&udid=...&udidtype=1&udidhash=1&lmt=...&bundle=...
    '158354': {
        ctv: ['sec', 'storeurl', 'udid', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'ifty', 'lmt'],
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
        ios: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
    },

    // Zee News (pub ID 158141)
    // CTV:  &sec=1&storeurl=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&udid=...&ifty=...&lmt=...
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...&bundle=...
    '158141': {
        ctv: ['sec', 'storeurl', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'udid', 'ifty', 'lmt'],
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
    },

    // NDTV (pub ID 158451)
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...
    '158451': {
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt'],
    },

    // Jio Ads and JIO TV (pub ID 161584)
    // CTV:  &sec=1&storeurl=...&udid=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&ifty=...&lmt=...
    // AOS:  &gdpr=0&storeurl=...&udid=...&udidtype=9&udidhash=1&lmt=...&bundle=...
    '161584': {
        ctv: ['sec', 'storeurl', 'udid', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'ifty', 'lmt'],
        aos: ['gdpr', 'storeurl', 'udid', 'udidtype', 'udidhash', 'lmt', 'bundle'],
    },

    // HotStar (pub ID 164208)
    // CTV:  &sec=1&storeurl=...&udidtype=1&udidhash=1&devicetype=3&bundle=...&udid=...&ifty=...&vapi=7&lmt=...
    // iOS:  &gdpr=0&storeurl=...&udidtype=1&udidhash=1&udid=...&lmt=...&bundle=...
    // AOS:  &gdpr=0&storeurl=...&udidtype=9&udidhash=1&udid=...&lmt=...&bundle=...
    '164208': {
        ctv: ['sec', 'storeurl', 'udidtype', 'udidhash', 'devicetype', 'bundle', 'udid', 'ifty', 'vapi', 'lmt'],
        ios: ['gdpr', 'storeurl', 'udidtype', 'udidhash', 'udid', 'lmt', 'bundle'],
        aos: ['gdpr', 'storeurl', 'udidtype', 'udidhash', 'udid', 'lmt', 'bundle'],
    },

    // Voot / Jio Cinema (tag-based pub ID 156182) — no macro in reference file
    // MXP OW (pub ID 159800) — no macro in reference file
    // Times Internet / TOI / Navbharat (pub ID 23105) — no macro in reference file
    // Network 18 (pub ID 113941) — no macro in reference file
    // HT Media (pub ID 156370) — no macro in reference file
    // Jagran (pub ID 156015) — no macro in reference file
    // TV9 (pub ID 161755) — no macro in reference file
    // DivyaBhaskar (pub ID 69363) — no macro in reference file
    // Samsung (pub ID 161729) — no macro in reference file
    // Amar Ujala (pub ID 158914) — no macro in reference file
};

/**
 * Returns the list of required URL parameter keys for a given publisher + platform.
 * Returns null if the publisher is unknown or has no requirements for the given platform.
 */
export function getRequiredMacros(pubId: string, platform: 'ctv' | 'aos' | 'ios'): string[] | null {
    const req = PUBLISHER_MACROS[pubId];
    if (!req) return null;
    return req[platform] ?? null;
}

/**
 * Checks a VAST tag URL against the required macros for a publisher + platform.
 * Returns { pass: boolean, missing: string[] }
 */
export function checkMacros(vastUrl: string, pubId: string, platform: 'ctv' | 'aos' | 'ios'): {
    status: 'Pass' | 'Fail' | 'N/A';
    missing: string[];
} {
    const required = getRequiredMacros(pubId, platform);
    if (!required) return { status: 'N/A', missing: [] };

    const lowerUrl = vastUrl.toLowerCase();
    const missing = required.filter(key => !lowerUrl.includes(`${key}=`));
    return {
        status: missing.length === 0 ? 'Pass' : 'Fail',
        missing,
    };
}
