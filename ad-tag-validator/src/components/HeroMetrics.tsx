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
    const warnings = results.filter(r => r.summary.startsWith('WARN')).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
                label="Total Tags Scanned"
                value={total > 0 ? total.toString() : "-"}
                icon={<FileText className="w-5 h-5" />}
                gradient="from-slate-500 to-slate-700"
                iconBg="bg-slate-100 text-slate-600"
            />
            <MetricCard
                label="Pass Rate"
                value={`${passRate}%`}
                subtext={`${passCount}/${total} Passed`}
                icon={<CheckCircle2 className="w-5 h-5" />}
                gradient="from-emerald-500 to-emerald-700"
                iconBg="bg-emerald-100 text-emerald-600"
                progressBar={passRate}
                progressColor="bg-emerald-500"
            />
            <MetricCard
                label="Critical Errors"
                value={failCount.toString()}
                icon={<AlertTriangle className="w-5 h-5" />}
                gradient="from-red-500 to-red-700"
                iconBg={failCount > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}
            />
            <MetricCard
                label="Warnings"
                value={warnings.toString()}
                icon={<Clock className="w-5 h-5" />}
                gradient="from-amber-500 to-amber-700"
                iconBg={warnings > 0 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"}
            />
        </div>
    );
};

const MetricCard: React.FC<{
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
    progressBar?: number;
    progressColor?: string;
}> = ({ label, value, subtext, icon, iconBg, progressBar, progressColor }) => (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
        <div className="flex items-start justify-between">
            <div className="relative z-10">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                <h3 className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{value}</h3>
                {subtext && <p className="text-xs text-gray-400 mt-1.5">{subtext}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
                {icon}
            </div>
        </div>
        {progressBar !== undefined && (
            <div className="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${progressColor} rounded-full transition-all duration-700`} style={{ width: `${progressBar}%` }} />
            </div>
        )}
    </div>
);
