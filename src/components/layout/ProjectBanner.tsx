'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectBanner() {
    const { activeProjekt } = useProjekt();

    if (!activeProjekt) return null;

    return (
        <div className="bg-slate-950 text-white border-none rounded-lg px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6">
                <div>
                    <div className="text-[9px] font-bold text-primary uppercase tracking-wider">Projekt</div>
                    <div className="text-xl font-black text-white">{activeProjekt.projektname}</div>
                </div>
                <div className="text-xs text-slate-400 flex gap-4 items-baseline">
                    <MapPin className="h-3 w-3 mr-1 inline-block" />
                    <span>{activeProjekt.plz} {activeProjekt.ort}</span>
                </div>
            </div>
            <div className="flex gap-8 text-xs self-end md:self-auto">
                <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Kommission</span>
                    <span className="font-bold text-sm block font-mono">#{activeProjekt.projektnummer}</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Bauleiter</span>
                    <span className="font-bold text-sm block">{activeProjekt.bauleiter || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Polier</span>
                    <span className="font-bold text-sm block">{activeProjekt.polier || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Projektleiter</span>
                    <span className="font-bold text-sm block">{activeProjekt.projektleiter || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">BIM Konst.</span>
                    <span className="font-bold text-sm block">{activeProjekt.bimKonstrukteur || 'n/a'}</span>
                </div>
            </div>
        </div>
    );
}
