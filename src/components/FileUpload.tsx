import React from 'react';
import { FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
    label: string;
    accept: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileCount: number;
    icon: 'excel' | 'text';
    multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, accept, onChange, fileCount, icon, multiple = false }) => {
    return (
        <div className="group relative">
            <div className={clsx(
                "relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out p-8 text-center",
                fileCount > 0
                    ? "border-green-400 bg-green-50/50"
                    : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50"
            )}>
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept={accept}
                    onChange={onChange}
                    multiple={multiple}
                />

                <div className="flex flex-col items-center justify-center gap-4 transition-transform duration-300 group-hover:scale-105">
                    <div className={clsx(
                        "p-4 rounded-full shadow-sm",
                        fileCount > 0 ? "bg-green-100 text-green-600" : "bg-white text-indigo-600 shadow-indigo-100"
                    )}>
                        {fileCount > 0 ? (
                            <CheckCircle2 className="w-8 h-8" />
                        ) : icon === 'excel' ? (
                            <FileSpreadsheet className="w-8 h-8" />
                        ) : (
                            <FileText className="w-8 h-8" />
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
                        <p className="text-sm text-gray-500">
                            {fileCount > 0
                                ? `${fileCount} file${fileCount !== 1 ? 's' : ''} selected`
                                : multiple ? "Drag & drop files or click to browse" : "Drag & drop file or click to browse"
                            }
                        </p>
                    </div>
                </div>

                {/* Decorative background blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10 transition-opacity opacity-0 group-hover:opacity-100" />
            </div>
        </div>
    );
};
