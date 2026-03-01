'use client';

import React from 'react';
import { Construction, Warehouse, Truck, MapPin, Globe, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lagerort } from '@/types';

interface LagerortBadgeProps {
    lagerort?: Lagerort | null;
    fallbackName?: string;
    className?: string;
}

const BEREICHE_CONFIG = [
    { name: 'Werkhof', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', iconBg: 'bg-blue-100' },
    { name: 'Baustelle', icon: Construction, color: 'text-orange-600', bg: 'bg-[#FFF5F1]', border: 'border-[#FFE5D9]', iconBg: 'bg-[#FFE5D9]' },
    { name: 'Extern', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', iconBg: 'bg-purple-100' },
    { name: 'Lager', icon: Warehouse, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-200' },
    { name: 'Produktion', icon: Factory, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-100' },
];

export function LagerortBadge({ lagerort, fallbackName, className }: LagerortBadgeProps) {
    if (!lagerort && !fallbackName) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    <MapPin className="h-4 w-4 text-slate-300" />
                </div>
                <div className="px-4 py-1.5 rounded-full border border-slate-100 bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                    Nicht zugewiesen
                </div>
            </div>
        );
    }

    const config = BEREICHE_CONFIG.find(c => c.name === lagerort?.bereich) || {
        icon: MapPin,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-100',
        iconBg: 'bg-slate-100'
    };

    const Icon = config.icon;
    const name = lagerort?.bezeichnung || fallbackName || 'Lagerort';

    return (
        <div className={cn("flex items-center gap-2 group transition-all shrink-0", className)}>
            {/* Icon Square */}
            <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-2xl border-2 shadow-sm transition-all group-hover:scale-110 group-hover:shadow-md shrink-0",
                config.iconBg,
                config.border
            )}>
                <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            {/* Name Pill */}
            <div className={cn(
                "px-5 h-10 flex items-center rounded-full border-2 shadow-sm font-black uppercase text-[11px] tracking-widest transition-all whitespace-nowrap",
                config.bg,
                config.border,
                config.color
            )}>
                {name}
            </div>
        </div>
    );
}
