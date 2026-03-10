'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectBanner({ className }: { className?: string }) {
    const { activeProjekt } = useProjekt();

    const [imageError, setImageError] = React.useState(false);

    if (!activeProjekt) return null;

    const getProjectImage = (url: string | undefined | null) => {
        if (!url) return null;
        if (url.includes('drive.google.com')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const projectImageUrl = getProjectImage(activeProjekt.imageUrl);

    return (
        <div className={cn(
            "bg-slate-950 border border-white/10 text-slate-100 rounded-2xl flex items-center shadow-inner overflow-hidden h-10 w-full min-w-0",
            className
        )}>
            {/* Left Edge: Small Image */}
            <div className="h-10 w-10 shrink-0 bg-black flex items-center justify-center relative border-r border-white/10">
                {projectImageUrl && !imageError ? (
                    <img
                        src={projectImageUrl}
                        alt={activeProjekt.projektname}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="text-white/40 font-black text-xs italic uppercase tracking-tighter select-none">
                        {activeProjekt.projektname?.substring(0, 1)}<span className="text-primary">{activeProjekt.projektname?.substring(1, 2)}</span>
                    </div>
                )}
            </div>

            {/* Core Info */}
            <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
                <span className="font-bold text-sm truncate text-white" title={activeProjekt.projektname}>
                    {activeProjekt.projektname}
                </span>
                <div className="hidden sm:flex items-center text-[10px] text-slate-400 gap-1 shrink-0">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[180px]" title={`${activeProjekt.plz} ${activeProjekt.ort}`}>
                        {activeProjekt.ort}
                    </span>
                </div>
            </div>

            {/* Metadata Badges - Scrollable or hidden on very small screens */}
            <div className="hidden md:flex items-center gap-4 px-4 text-[10px] border-l border-white/10 bg-white/5 h-full">
                <div className="flex gap-1 items-center" title={`Kommission: ${activeProjekt.projektnummer}`}>
                    <span className="text-primary font-medium tracking-wider uppercase">Komm.</span>
                    <span className="font-mono text-slate-200">#{activeProjekt.projektnummer}</span>
                </div>
                <div className="flex gap-1 items-center" title={`Bauleiter: ${activeProjekt.bauleiter}`}>
                    <span className="text-primary font-medium tracking-wider uppercase">BL</span>
                    <span className="text-slate-200 max-w-[120px] truncate">{activeProjekt.bauleiter || 'n/a'}</span>
                </div>
                <div className="flex gap-1 items-center" title={`Polier: ${activeProjekt.polier}`}>
                    <span className="text-primary font-medium tracking-wider uppercase">POL</span>
                    <span className="text-slate-200 max-w-[120px] truncate">{activeProjekt.polier || 'n/a'}</span>
                </div>
                <div className="hidden lg:flex gap-1 items-center" title={`Projektleiter: ${activeProjekt.projektleiter}`}>
                    <span className="text-primary font-medium tracking-wider uppercase">PL</span>
                    <span className="text-slate-200 max-w-[120px] truncate">{activeProjekt.projektleiter || 'n/a'}</span>
                </div>
                <div className="hidden lg:flex gap-1 items-center" title={`BIM Konstrukteur: ${activeProjekt.bimKonstrukteur}`}>
                    <span className="text-primary font-medium tracking-wider uppercase">BIM</span>
                    <span className="text-slate-200 max-w-[120px] truncate">{activeProjekt.bimKonstrukteur || 'n/a'}</span>
                </div>
            </div>
        </div>
    );
}
