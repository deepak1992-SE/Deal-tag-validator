import React from 'react';
import type { ValidationResult } from '../types';
import { FileText, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface HeroMetricsProps {
    results: ValidationResult[];
    fileCount: number;
}

export const HeroMetrics: React.FC<HeroMetricsProps> = ({ results }) => {
    const total = results.length;
    const passCount = results.filter(r => !r.summary.startsWith('FAIL') && !r.summary.startsWith('WARN')).length;
    const failCount = results.filter(r => r.summary.startsWith('FAIL')).length;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

    // Duration mismatches placeholder (future feature)
    // For now we can track warnings as a proxy or just hardcode 0 if not implemented
    const warnings = results.filter(r => r.summary.startsWith('WARN')).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
                label="Total Files Scanned"
                value={total > 0 ? total.toString() : "-"}
                icon={<FileText className="w-4 h-4 text-brand-blue" />}
            />
            <MetricCard
                label="Pass Rate"
                value={`${passRate}%`}
                subtext={`${passCount}/${total} Passed`}
                icon={<CheckCircle2 className="w-4 h-4 text-status-pass-text" />}
                statusColor="bg-status-pass-bg text-status-pass-text"
            />
            <MetricCard
                label="Critical Errors"
                value={failCount.toString()}
                icon={<AlertTriangle className="w-4 h-4 text-status-fail-text" />}
                statusColor={failCount > 0 ? "bg-status-fail-bg text-status-fail-text" : "bg-gray-100 text-gray-500"}
            />
            <MetricCard
                label="Non-Blocking Warnings"
                value={warnings.toString()}
                icon={<Clock className="w-4 h-4 text-status-warn-text" />}
                statusColor={warnings > 0 ? "bg-status-warn-bg text-status-warn-text" : "bg-gray-100 text-gray-500"}
            />
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string; subtext?: string; icon: React.ReactNode; statusColor?: string }> = ({ label, value, subtext, icon, statusColor = "bg-brand-navy/5 text-brand-navy" }) => (
    <div className="bg-white rounded border border-gray-200 p-4 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-gray-900 font-mono">{value}</h3>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded ${statusColor}`}>
            {icon}
        </div>
    </div>
);
