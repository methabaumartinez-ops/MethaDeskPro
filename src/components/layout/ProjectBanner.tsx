'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { MapPin, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Projekt } from '@/types';

export function ProjectBanner() {
    const { activeProjekt } = useProjekt();

    if (!activeProjekt) return null;

    const getProjectImage = (p: Projekt) => {
        if (p.imageUrl) {
            if (p.imageUrl.includes('drive.google.com')) {
                return `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}`;
            }
            return p.imageUrl;
        }
        return '/images/Foto.png';
    };

    return (
        <div className="bg-slate-950 text-white border-none rounded-lg px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md gap-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 min-w-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-slate-700 shadow-lg flex items-center justify-center">
                        <img
                            src={getProjectImage(activeProjekt)}
                            alt={activeProjekt.projektname}
                            className="h-full w-full object-cover transition-transform hover:scale-110 duration-500"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/Foto.png';
                            }}
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5 opacity-80">Projekt</div>
                        <div className="text-2xl font-black text-white truncate max-w-[400px] leading-tight tracking-tight">{activeProjekt.projektname}</div>
                    </div>
                </div>
                <div className="hidden xl:flex text-xs text-slate-500 gap-4 items-center pl-4 border-l border-slate-800/50 h-10 self-center ml-2">
                    <MapPin className="h-3.5 w-3.5 text-primary/60" />
                    <span className="font-medium">{activeProjekt.plz} {activeProjekt.ort}</span>
                </div>
            </div>
            <div className="flex gap-8 text-xs self-end md:self-auto">
                <div>
                    <span className="text-primary block text-[9px] uppercase tracking-wider mb-0.5">Kommission</span>
                    <span className="font-bold text-sm block font-mono">#{activeProjekt.projektnummer}</span>
                </div>
                <div>
                    <span className="text-primary block text-[9px] uppercase tracking-wider mb-0.5">Bauleiter</span>
                    <span className="font-bold text-sm block">{activeProjekt.bauleiter || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-primary block text-[9px] uppercase tracking-wider mb-0.5">Polier</span>
                    <span className="font-bold text-sm block">{activeProjekt.polier || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-primary block text-[9px] uppercase tracking-wider mb-0.5">Projektleiter</span>
                    <span className="font-bold text-sm block">{activeProjekt.projektleiter || 'n/a'}</span>
                </div>
                <div>
                    <span className="text-primary block text-[9px] uppercase tracking-wider mb-0.5">BIM Konst.</span>
                    <span className="font-bold text-sm block">{activeProjekt.bimKonstrukteur || 'n/a'}</span>
                </div>
            </div>
        </div>
    );
}
