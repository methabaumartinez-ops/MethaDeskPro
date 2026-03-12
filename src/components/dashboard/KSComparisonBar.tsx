'use client';

import React from 'react';
import { Progress } from "@/components/ui/progress";

interface KSComparisonBarProps {
    ks1Value: number;
    ks2Value: number;
    title?: string;
    label1?: string;
    label2?: string;
}

export function KSComparisonBar({ 
    ks1Value, 
    ks2Value, 
    title = "KS Verteilung",
    label1 = "KS 1 (Baumeister)",
    label2 = "KS 2 (Produktion)"
}: KSComparisonBarProps) {
    const total = ks1Value + ks2Value;
    const ks1Percentage = total > 0 ? (ks1Value / total) * 100 : 0;
    const ks2Percentage = total > 0 ? (ks2Value / total) * 100 : 0;

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                <span>{title}</span>
                <span>{total > 0 ? '100%' : '0%'}</span>
            </div>
            
            <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                    className="h-full bg-slate-400 transition-all duration-500 ease-in-out" 
                    style={{ width: `${ks1Percentage}%` }}
                />
                <div 
                    className="h-full bg-orange-500 transition-all duration-500 ease-in-out" 
                    style={{ width: `${ks2Percentage}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold mt-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-600">{label1} ({ks1Percentage.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">({ks2Percentage.toFixed(0)}%) {label2}</span>
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                </div>
            </div>
        </div>
    );
}
