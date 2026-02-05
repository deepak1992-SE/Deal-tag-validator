import React, { useState } from 'react';
import type { ValidationResult } from '../types';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

interface DataGridProps {
    results: ValidationResult[];
}

const StatusPill: React.FC<{ status: string; type: 'pass' | 'fail' | 'warn' | 'info' }> = ({ status, type }) => {
    const styles = {
        pass: "bg-status-pass-bg text-status-pass-text",
        fail: "bg-status-fail-bg text-status-fail-text",
        warn: "bg-status-warn-bg text-status-warn-text",
        info: "bg-blue-50 text-blue-700"
    };

    return (
        <span className={clsx("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider", styles[type])}>
            {status}
        </span>
    );
};

export const DataGrid: React.FC<DataGridProps> = ({ results }) => {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const toggleRow = (idx: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(idx)) {
            newExpanded.delete(idx);
        } else {
            newExpanded.add(idx);
        }
        setExpandedRows(newExpanded);
    };

    if (results.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-8 px-2 py-2"></th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">Status</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">Deal Name</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">Tag Name (TXT)</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">Target</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">devicetype=3</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">App Params</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-tight text-xs">Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {results.map((row, idx) => {
                            const isFail = row.summary.startsWith('FAIL');
                            const isWarn = row.summary.startsWith('WARN');
                            const isExpanded = expandedRows.has(idx);

                            // App Params Logic
                            const hasStore = row.storeBundleStatus.includes('StoreURL');
                            const hasBundle = row.storeBundleStatus.includes('Bundle');
                            const bothPresent = row.storeBundleStatus === 'Both Params Present';

                            return (
                                <React.Fragment key={idx}>
                                    <tr
                                        className={clsx(
                                            "group hover:bg-gray-50 cursor-pointer transition-colors border-l-4",
                                            isFail ? "border-l-status-fail-text" : isWarn ? "border-l-status-warn-text" : "border-l-status-pass-text"
                                        )}
                                        onClick={() => toggleRow(idx)}
                                    >
                                        <td className="px-2 py-1 text-gray-400">
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            {isFail ? <StatusPill status="FAIL" type="fail" /> :
                                                isWarn ? <StatusPill status="WARN" type="warn" /> :
                                                    <StatusPill status="PASS" type="pass" />}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <div className="font-medium text-gray-900">{row.dealName}</div>
                                            <div className="text-[10px] text-gray-400">{row.dealMatchStatus}</div>
                                        </td>
                                        <td className="px-3 py-1.5 max-w-xs truncate font-mono text-xs text-brand-navy/80" title={row.tagName}>
                                            {row.tagName}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-600 md:w-24">
                                            {row.deviceTarget}
                                        </td>

                                        {/* Device Param Column - Checks for devicetype=3 only on CTV */}
                                        <td className="px-3 py-1.5 whitespace-nowrap text-xs">
                                            {row.deviceTarget.includes('CTV') ? (
                                                row.deviceTypeParam === '3' ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 font-mono">
                                                        Pass
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                                                        Missing
                                                    </span>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                                    Not Required
                                                </span>
                                            )}
                                        </td>

                                        {/* App Params Column */}
                                        <td className="px-3 py-1.5 whitespace-nowrap text-xs">
                                            <div className="flex gap-1">
                                                {bothPresent ? (
                                                    <>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800" title="StoreURL Present">StoreURL</span>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800" title="Bundle Present">Bundle</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        {hasStore ?
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">StoreURL</span> :
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400 decoration-line-through">StoreURL</span>
                                                        }
                                                        {hasBundle ?
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">Bundle</span> :
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400 decoration-line-through">Bundle</span>
                                                        }
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-1.5 whitespace-nowrap text-xs font-mono text-gray-500 max-w-[120px] truncate" title={row.filename}>
                                            {row.filename}
                                        </td>
                                    </tr>
                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                        <tr className="bg-gray-50/80">
                                            <td colSpan={8} className="px-4 py-3 border-b border-gray-200">
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                        <h4 className="font-bold text-gray-700 mb-1 uppercase tracking-wider">Validation Details</h4>
                                                        <ul className="space-y-1">
                                                            <ResultDetail
                                                                label="Tag Name Check"
                                                                status={row.tagNameMatchStatus === 'Match' ? 'pass' : 'fail'}
                                                                text={row.tagNameMatchStatus}
                                                            />
                                                            <ResultDetail
                                                                label="Device Type Param"
                                                                status={row.deviceTypeStatus === 'Valid' ? 'pass' : 'fail'}
                                                                text={row.deviceTypeStatus}
                                                            />
                                                            <ResultDetail
                                                                label="Filename Consistency"
                                                                status={row.filenameCheckStatus === 'Valid' || row.filenameCheckStatus === 'N/A' ? 'pass' : 'warn'}
                                                                text={row.filenameCheckStatus}
                                                            />
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-700 mb-1 uppercase tracking-wider">Summary Log</h4>
                                                        <div className="bg-white border border-gray-300 p-2 rounded font-mono text-gray-600 text-xs">
                                                            {row.summary}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ResultDetail: React.FC<{ label: string; status: 'pass' | 'fail' | 'warn'; text: string }> = ({ label, status, text }) => {
    const icons = {
        pass: <CheckCircle className="w-3 h-3 text-status-pass-text" />,
        fail: <AlertCircle className="w-3 h-3 text-status-fail-text" />,
        warn: <Clock className="w-3 h-3 text-status-warn-text" />
    };
    const colors = {
        pass: "text-status-pass-text",
        fail: "text-status-fail-text",
        warn: "text-status-warn-text"
    };

    return (
        <li className="flex items-center gap-2">
            {icons[status]}
            <span className="text-gray-600">{label}:</span>
            <span className={clsx("font-semibold", colors[status])}>{text}</span>
        </li>
    );
}
