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
            "bg-slate-950 text-white border-none rounded-lg px-0 py-0 flex flex-col md:flex-row justify-between items-stretch shadow-md gap-4 overflow-hidden min-h-[58px]",
            className
        )}>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Project Image */}
                <div className="w-[72px] h-[72px] shrink-0 bg-slate-900 flex items-center justify-center border-r border-white/10 overflow-hidden relative">
                    {projectImageUrl && !imageError ? (
                        <img
                            src={projectImageUrl}
                            alt={activeProjekt.projektname}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="text-white/20 font-black text-xl italic uppercase tracking-tighter select-none flex items-center justify-center w-full h-full">
                            {activeProjekt.projektname?.substring(0, 1)}<span className="text-primary">{activeProjekt.projektname?.substring(1, 2)}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 px-4 md:px-0 py-3 md:py-0">
                    <div>
                        <div className="text-[9px] font-bold text-primary uppercase tracking-wider">Projekt</div>
                        <div className="text-xl font-black text-white">{activeProjekt.projektname}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex gap-4 items-baseline">
                        <MapPin className="h-3 w-3 mr-1 inline-block" />
                        <span>{activeProjekt.plz} {activeProjekt.ort}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-8 text-xs px-4 md:px-6 py-3 md:py-0 items-center">
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
