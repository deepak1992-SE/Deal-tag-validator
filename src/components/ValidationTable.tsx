import React from 'react';
import type { ValidationResult } from '../types';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface ValidationTableProps {
    results: ValidationResult[];
}

const StatusBadge: React.FC<{ status: string; type?: 'badge' | 'icon' }> = ({ status, type = 'badge' }) => {
    const isValid = status === 'Valid' || status === 'Match' || status === 'Found';
    const isInvalid = status === 'Invalid' || status === 'Mismatch' || status === 'Not Found';
    const isInfo = status === 'Info';

    if (type === 'icon') {
        if (isValid) return <CheckCircle className="w-5 h-5 text-green-500" />;
        if (isInvalid) return <XCircle className="w-5 h-5 text-red-500" />;
        return <Info className="w-5 h-5 text-blue-500" />;
    }

    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            isValid && "bg-green-50 text-green-700 border-green-200",
            isInvalid && "bg-red-50 text-red-700 border-red-200",
            isInfo && "bg-blue-50 text-blue-700 border-blue-200",
            !isValid && !isInvalid && !isInfo && "bg-gray-100 text-gray-800 border-gray-200"
        )}>
            {status}
        </span>
    );
};

export const ValidationTable: React.FC<ValidationTableProps> = ({ results }) => {
    if (results.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source File</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal Name (Excel)</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tag Name (TXT)</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Device Target</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Device Type (VAST)</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Store/Bundle</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {results.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {row.summary.startsWith('FAIL') ? (
                                        <div className="flex items-center text-red-600 font-bold"><AlertCircle className="w-4 h-4 mr-2" /> FAIL</div>
                                    ) : (
                                        <div className="flex items-center text-green-600 font-bold"><CheckCircle className="w-4 h-4 mr-2" /> PASS</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[150px] truncate" title={row.filename}>
                                    {row.filename}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{row.dealName}</span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            <StatusBadge status={row.dealMatchStatus} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900 truncate max-w-xs" title={row.tagName}>{row.tagName}</span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            <StatusBadge status={row.tagNameMatchStatus} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {row.deviceTarget}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900">{row.deviceTypeParam}</span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            <StatusBadge status={row.deviceTypeStatus} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-gray-900">{row.storeBundleStatus}</span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            <StatusBadge status={row.storeBundleValidationStatus} />
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-sm">
                                    {row.summary}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
