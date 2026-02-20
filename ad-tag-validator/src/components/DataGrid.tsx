import React, { useState } from 'react';
import type { ValidationResult, ParsedMediaPlan } from '../types';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, AlertTriangle, Minus } from 'lucide-react';

interface DataGridProps {
    results: ValidationResult[];
    mediaPlanData?: ParsedMediaPlan | null;
}

type Platform = 'ctv' | 'aos' | 'ios';
type CheckResult = 'pass' | 'fail' | 'warn' | 'na';

interface CheckRow {
    check: string;
    found: string;
    expected: string;
    result: CheckResult;
}

interface DealGroup {
    dealName: string;
    deviceTarget: string;
    expectedPlatforms: Platform[];
    tagsByPlatform: Partial<Record<Platform, ValidationResult>>;
}

const PLATFORM_LABELS: Record<Platform, string> = {
    ctv: 'CTV Tag',
    aos: 'Android (AOS) Tag',
    ios: 'iOS Tag',
};

const PLATFORM_BADGE_CLASSES: Record<Platform, string> = {
    ctv: 'bg-purple-100 text-purple-700',
    aos: 'bg-green-100 text-green-700',
    ios: 'bg-blue-100 text-blue-700',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function detectPlatform(result: ValidationResult): Platform {
    const tagUpper = result.tagName.toUpperCase();
    if (tagUpper.endsWith('_IOS')) return 'ios';
    if (tagUpper.endsWith('_AOS')) return 'aos';
    if (tagUpper.endsWith('_CTV')) return 'ctv';
    const devUpper = result.deviceTarget.toUpperCase();
    if (devUpper.includes('IOS') && !devUpper.includes('AOS')) return 'ios';
    if (devUpper.includes('AOS') || devUpper.includes('MOBILE') || devUpper.includes('ANDROID')) return 'aos';
    return 'ctv';
}

function getExpectedPlatforms(deviceTargeted: string): Platform[] {
    const upper = deviceTargeted.toUpperCase();
    const platforms: Platform[] = [];
    if (upper.includes('CTV')) platforms.push('ctv');
    if (upper.includes('AOS') || upper.includes('MOBILE') || upper.includes('ANDROID')) platforms.push('aos');
    if (upper.includes('IOS')) platforms.push('ios');
    return platforms.length > 0 ? platforms : ['ctv'];
}

function buildCheckRows(result: ValidationResult, platform: Platform): CheckRow[] {
    const isCTV = platform === 'ctv';
    const isMobile = platform === 'aos' || platform === 'ios';
    const hasStore =
        result.storeBundleStatus.includes('StoreURL present') ||
        result.storeBundleStatus === 'Both Params Present';
    const hasBundle =
        result.storeBundleStatus.includes('Bundle present') ||
        result.storeBundleStatus === 'Both Params Present';
    const hasDeviceType3 = result.deviceTypeParam === '3';

    const rows: CheckRow[] = [];

    // 1. Deal Match
    rows.push({
        check: 'Deal Match',
        found: result.dealMatchStatus === 'Found'
            ? `Matched → ${result.dealName}`
            : 'No match in media plan',
        expected: 'Deal must exist in media plan',
        result: result.dealMatchStatus === 'Found' ? 'pass' : 'fail',
    });

    // 2. Tag Name Suffix
    rows.push({
        check: 'Tag Name Suffix',
        found: result.tagName,
        expected: result.tagNameMatchStatus === 'Match'
            ? 'Suffix consistent with device target'
            : 'Suffix conflicts with device target',
        result: result.tagNameMatchStatus === 'Match' ? 'pass' : 'fail',
    });

    // 3. Unique Tag Name
    rows.push({
        check: 'Unique Tag Name',
        found: result.isDuplicateTagName
            ? `Duplicate — "${result.tagName}" appears in multiple files`
            : 'Unique',
        expected: 'Must be unique across all uploaded files',
        result: result.isDuplicateTagName ? 'fail' : 'pass',
    });

    // 4. devicetype=3
    rows.push({
        check: 'devicetype=3',
        found: hasDeviceType3 ? 'Present (devicetype=3)' : 'Not present',
        expected: isCTV ? 'Required for CTV' : 'Must NOT be present for Mobile',
        result: isCTV
            ? (hasDeviceType3 ? 'pass' : 'fail')
            : isMobile
                ? (hasDeviceType3 ? 'fail' : 'pass')
                : 'na',
    });

    // 5. StoreURL
    rows.push({
        check: 'StoreURL',
        found: hasStore ? 'Present' : 'Not present',
        expected: (isCTV || isMobile) ? 'Required' : 'N/A',
        result: (isCTV || isMobile) ? (hasStore ? 'pass' : 'fail') : 'na',
    });

    // 6. Bundle
    rows.push({
        check: 'Bundle',
        found: hasBundle ? 'Present' : 'Not present',
        expected: isCTV ? 'Required for CTV' : 'Optional for Mobile',
        result: isCTV
            ? (hasBundle ? 'pass' : 'fail')
            : isMobile
                ? (hasBundle ? 'pass' : 'na')
                : 'na',
    });

    // 7. Duration (vmaxl)
    if (result.durationStatus !== 'N/A') {
        const durationResultMap: Record<string, CheckResult> = {
            Valid: 'pass',
            Warning: 'warn',
            Invalid: 'fail',
        };
        rows.push({
            check: 'Duration (vmaxl)',
            found: result.durationStatus === 'Valid'
                ? 'vmaxl matches plan duration'
                : result.durationStatus === 'Warning'
                    ? 'vmaxl param missing from tag'
                    : 'vmaxl value mismatch',
            expected: 'vmaxl = ad duration + 1 second',
            result: durationResultMap[result.durationStatus] ?? 'na',
        });
    }

    // 8. Format (only show if column exists in Excel)
    if (result.format !== undefined) {
        rows.push({
            check: 'Format',
            found: result.format || 'N/A',
            expected: isCTV ? 'Video (Display is invalid for CTV)' : 'Any',
            result: result.formatCheckStatus === 'Pass' ? 'pass'
                : result.formatCheckStatus === 'Fail' ? 'fail'
                : 'na',
        });
    }

    // 9. Publisher Macros
    {
        const macroFound =
            result.macroCheckStatus === 'Pass'
                ? 'All required macros present'
                : result.macroCheckStatus === 'Fail'
                    ? `Missing: ${result.missingMacros?.join(', ')}`
                    : result.publisherId
                        ? 'No requirements defined for this publisher'
                        : 'pubId not found in tag URL';
        const macroExpected = result.publisherId
            ? `Required params for pubId ${result.publisherId}`
            : 'pubId param must be present in VAST URL';
        rows.push({
            check: 'Publisher Macros',
            found: macroFound,
            expected: macroExpected,
            result: result.macroCheckStatus === 'Pass' ? 'pass'
                : result.macroCheckStatus === 'Fail' ? 'fail'
                : 'na',
        });
    }

    return rows;
}

function getDealStatus(group: DealGroup): 'pass' | 'fail' | 'warn' {
    const hasMissingTag = group.expectedPlatforms.some(p => !group.tagsByPlatform[p]);
    if (hasMissingTag) return 'fail';
    let hasWarn = false;
    for (const p of group.expectedPlatforms) {
        const tag = group.tagsByPlatform[p];
        if (!tag) continue;
        if (tag.summary.startsWith('FAIL')) return 'fail';
        if (tag.summary.startsWith('WARN')) hasWarn = true;
    }
    return hasWarn ? 'warn' : 'pass';
}

function buildDealGroups(
    results: ValidationResult[],
    mediaPlanData: ParsedMediaPlan | null
): { groups: DealGroup[]; unmatchedTags: ValidationResult[] } {
    // Group matched results by dealName
    const resultsByDeal = new Map<string, ValidationResult[]>();
    results.forEach(r => {
        if (r.dealMatchStatus !== 'Found') return;
        if (!resultsByDeal.has(r.dealName)) resultsByDeal.set(r.dealName, []);
        resultsByDeal.get(r.dealName)!.push(r);
    });

    const unmatchedTags = results.filter(r => r.dealMatchStatus === 'Not Found');
    const groups: DealGroup[] = [];

    if (mediaPlanData) {
        Object.values(mediaPlanData).forEach(deal => {
            const expectedPlatforms = getExpectedPlatforms(deal.deviceTargeted);
            const dealResults = resultsByDeal.get(deal.dealName) || [];
            const tagsByPlatform: Partial<Record<Platform, ValidationResult>> = {};
            dealResults.forEach(r => {
                const p = detectPlatform(r);
                if (!tagsByPlatform[p]) tagsByPlatform[p] = r; // first match per platform wins
            });
            groups.push({
                dealName: deal.dealName,
                deviceTarget: deal.deviceTargeted,
                expectedPlatforms,
                tagsByPlatform,
            });
        });
    } else {
        // No media plan — build groups from results only
        const dealNames = new Set<string>(
            results.filter(r => r.dealMatchStatus === 'Found').map(r => r.dealName)
        );
        dealNames.forEach(dealName => {
            const dealResults = resultsByDeal.get(dealName) || [];
            const platformsFound: Platform[] = [];
            const tagsByPlatform: Partial<Record<Platform, ValidationResult>> = {};
            dealResults.forEach(r => {
                const p = detectPlatform(r);
                if (!tagsByPlatform[p]) {
                    tagsByPlatform[p] = r;
                    platformsFound.push(p);
                }
            });
            groups.push({
                dealName,
                deviceTarget: dealResults[0]?.deviceTarget || '',
                expectedPlatforms: platformsFound,
                tagsByPlatform,
            });
        });
    }

    // Sort: failed first, then warn, then pass
    const order = { fail: 0, warn: 1, pass: 2 };
    groups.sort((a, b) => order[getDealStatus(a)] - order[getDealStatus(b)]);

    return { groups, unmatchedTags };
}

// ── Sub-components ─────────────────────────────────────────────────────────

const ResultBadge: React.FC<{ result: CheckResult }> = ({ result }) => {
    if (result === 'na') return (
        <span className="text-[10px] text-gray-300 font-medium flex items-center gap-1 justify-center">
            <Minus className="w-3 h-3" /> N/A
        </span>
    );
    if (result === 'pass') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Pass
        </span>
    );
    if (result === 'warn') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="w-3 h-3" /> Warn
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
            <XCircle className="w-3 h-3" /> Fail
        </span>
    );
};

const CheckTable: React.FC<{ rows: CheckRow[] }> = ({ rows }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
            <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[160px]">Check</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Found in File</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expected Value</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[80px]">Result</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {rows.map((row, i) => (
                    <tr
                        key={i}
                        className={
                            row.result === 'fail' ? 'bg-red-50/40' :
                            row.result === 'warn' ? 'bg-amber-50/30' : ''
                        }
                    >
                        <td className="px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">{row.check}</td>
                        <td className="px-4 py-2.5 text-gray-700 font-mono break-all">{row.found}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row.expected}</td>
                        <td className="px-4 py-2.5">
                            <div className="flex justify-center">
                                <ResultBadge result={row.result} />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const PlatformTagSection: React.FC<{
    platform: Platform;
    tag: ValidationResult | undefined;
    dealName: string;
}> = ({ platform, tag, dealName }) => {
    const label = PLATFORM_LABELS[platform];
    const isMissing = !tag;
    const isFail = tag?.summary.startsWith('FAIL');
    const isWarn = tag?.summary.startsWith('WARN');
    const tagStatus: 'pass' | 'fail' | 'warn' = isMissing ? 'fail' : isFail ? 'fail' : isWarn ? 'warn' : 'pass';

    const headerBg =
        tagStatus === 'fail' ? 'bg-red-50/60 border-b border-red-200' :
        tagStatus === 'warn' ? 'bg-amber-50/60 border-b border-amber-200' :
        'bg-emerald-50/40 border-b border-emerald-200';

    const borderColor =
        tagStatus === 'fail' ? 'border-red-200' :
        tagStatus === 'warn' ? 'border-amber-200' :
        'border-emerald-200';

    return (
        <div className={`border ${borderColor} rounded-lg overflow-hidden mb-3 last:mb-0`}>
            {/* Platform row header */}
            <div className={`px-4 py-2.5 flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ${PLATFORM_BADGE_CLASSES[platform]}`}>
                        {label}
                    </span>
                    {isMissing ? (
                        <span className="text-xs text-red-500 font-medium italic">Tag not uploaded / Missing</span>
                    ) : (
                        <span className="text-xs text-gray-600 font-mono truncate" title={tag.tagName}>{tag.tagName}</span>
                    )}
                </div>
                <div className="shrink-0 ml-3">
                    <ResultBadge result={tagStatus} />
                </div>
            </div>

            {/* Tag details */}
            {isMissing ? (
                <div className="px-4 py-3.5 bg-red-50/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">
                        No {label} found for deal <strong>"{dealName}"</strong>.
                        Expected a tag with suffix <code className="bg-red-100 px-1 rounded">_{platform.toUpperCase()}</code> matching this deal name.
                    </p>
                </div>
            ) : (
                <CheckTable rows={buildCheckRows(tag, platform)} />
            )}
        </div>
    );
};

const DealCard: React.FC<{ group: DealGroup; defaultExpanded: boolean }> = ({ group, defaultExpanded }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const status = getDealStatus(group);

    const borderColor =
        status === 'fail' ? 'border-red-200' :
        status === 'warn' ? 'border-amber-200' :
        'border-emerald-200';

    const headerBg =
        status === 'fail' ? 'bg-red-50/40 hover:bg-red-50/70' :
        status === 'warn' ? 'bg-amber-50/40 hover:bg-amber-50/70' :
        'bg-emerald-50/30 hover:bg-emerald-50/60';

    const statusChip =
        status === 'fail'
            ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
            : status === 'warn'
                ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3.5 h-3.5" /> WARN</span>
                : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> PASS</span>;

    // Count tags found vs expected
    const foundCount = group.expectedPlatforms.filter(p => !!group.tagsByPlatform[p]).length;
    const expectedCount = group.expectedPlatforms.length;

    return (
        <div className={`bg-white rounded-xl border ${borderColor} shadow-sm overflow-hidden`}>
            {/* Card Header */}
            <div
                className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${headerBg}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    {statusChip}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{group.dealName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-gray-400">{group.deviceTarget || 'N/A'}</span>
                            {group.expectedPlatforms.length > 0 && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                                    {group.expectedPlatforms.map(p => p.toUpperCase()).join(' + ')}
                                </span>
                            )}
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                foundCount < expectedCount ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {foundCount}/{expectedCount} tags found
                            </span>
                        </div>
                    </div>
                </div>
                <span className="text-gray-400 shrink-0 ml-3">
                    {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </span>
            </div>

            {/* Expanded platform sections */}
            {expanded && (
                <div className="p-4 border-t border-gray-100">
                    {group.expectedPlatforms.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No platform information available.</p>
                    ) : (
                        group.expectedPlatforms.map(platform => (
                            <PlatformTagSection
                                key={platform}
                                platform={platform}
                                tag={group.tagsByPlatform[platform]}
                                dealName={group.dealName}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const SummarySection: React.FC<{
    groups: DealGroup[];
    unmatchedTags: ValidationResult[];
}> = ({ groups, unmatchedTags }) => {
    const total = groups.length;
    const passed = groups.filter(g => getDealStatus(g) === 'pass').length;
    const warned = groups.filter(g => getDealStatus(g) === 'warn').length;
    const failed = groups.filter(g => getDealStatus(g) === 'fail').length;
    const missingTagDeals = groups.filter(g =>
        g.expectedPlatforms.some(p => !g.tagsByPlatform[p])
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Validation Summary</h3>
            </div>
            <div className="p-5">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <p className="text-2xl font-bold text-gray-800">{total}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-semibold mt-0.5">Total Deals</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
                        <p className="text-2xl font-bold text-emerald-700">{passed}</p>
                        <p className="text-[10px] text-emerald-600 uppercase font-semibold mt-0.5">Fully Valid</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
                        <p className="text-2xl font-bold text-amber-700">{warned}</p>
                        <p className="text-[10px] text-amber-600 uppercase font-semibold mt-0.5">Warnings</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                        <p className="text-2xl font-bold text-red-700">{failed}</p>
                        <p className="text-[10px] text-red-600 uppercase font-semibold mt-0.5">Failed</p>
                    </div>
                </div>

                {/* Deals with missing tags */}
                {missingTagDeals.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Deals with Missing Tags ({missingTagDeals.length})
                        </p>
                        <div className="space-y-1">
                            {missingTagDeals.map((g, i) => {
                                const missing = g.expectedPlatforms.filter(p => !g.tagsByPlatform[p]);
                                return (
                                    <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                        <span className="font-medium">{g.dealName}</span>
                                        <span className="text-gray-400">—</span>
                                        <span className="text-red-500">
                                            Missing {missing.map(p => p.toUpperCase()).join(' + ')} tag{missing.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Unmatched tags (not in plan) */}
                {unmatchedTags.length > 0 && (
                    <div>
                        <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Tags Not Matched to Any Deal ({unmatchedTags.length})
                        </p>
                        <div className="space-y-1">
                            {unmatchedTags.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span className="font-mono">{t.tagName}</span>
                                    <span className="text-gray-400 text-[10px]">({t.filename})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {missingTagDeals.length === 0 && unmatchedTags.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        All deals have the correct number of tags and no unmatched tags found.
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main Export ────────────────────────────────────────────────────────────

export const DataGrid: React.FC<DataGridProps> = ({ results, mediaPlanData }) => {
    if (results.length === 0 && (!mediaPlanData || Object.keys(mediaPlanData).length === 0)) return null;

    const { groups, unmatchedTags } = buildDealGroups(results, mediaPlanData ?? null);
    const autoExpand = groups.length <= 3;

    return (
        <div className="mt-6 space-y-3">
            <SummarySection groups={groups} unmatchedTags={unmatchedTags} />
            {groups.map((group, idx) => (
                <DealCard key={idx} group={group} defaultExpanded={autoExpand} />
            ))}
        </div>
    );
};
