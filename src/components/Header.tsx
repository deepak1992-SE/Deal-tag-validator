import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="bg-brand-navy border-b border-brand-blue/30 sticky top-0 z-50 shadow-md">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-white/90" />
                            <span className="text-white font-bold text-lg tracking-tight">PubMatic tag validation tool</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
