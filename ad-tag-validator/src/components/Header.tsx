import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <header className="header-gradient sticky top-0 z-50 shadow-lg">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <ShieldCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <span className="text-white font-bold text-lg tracking-tight">PubMatic</span>
                            <span className="text-white/60 font-light text-lg ml-1.5">Tag Validation</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                            v2.0
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};
