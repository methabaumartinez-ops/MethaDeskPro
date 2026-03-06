import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Abteilung, ABTEILUNGEN_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

// Maps from types/index.ts
// { id: 'planung', name: 'Planung', color: 'info' }
// { id: 'einkauf', name: 'Einkauf', color: 'secondary' }
// { id: 'avor', name: 'AVOR', color: 'violet' }
// { id: 'schlosserei', name: 'Schlosserei', color: 'gray' }
// { id: 'blech', name: 'Blechabteilung', color: 'orange' }
// { id: 'werkhof', name: 'Werkhof', color: 'info' }
// { id: 'montage', name: 'Montage', color: 'success' }
// { id: 'bau', name: 'Bau', color: 'error' }
// { id: 'zimmerei', name: 'Zimmerei', color: 'gray' }
// { id: 'subunternehmer', name: 'Subunternehmer', color: 'violet' }
// { id: 'unternehmer', name: 'Unternehmer', color: 'violet' }

interface AbteilungBadgeProps {
    abteilung: Abteilung | string | null | undefined;
    className?: string;
}

export function AbteilungBadge({ abteilung, className }: AbteilungBadgeProps) {
    if (!abteilung) return <span className="text-slate-400 italic text-xs">Keine Abteilung</span>;

    // Check if it's "Sin Abteilung"
    if (abteilung === 'Sin Abteilung') {
        return (
            <Badge variant="outline" className={cn("text-slate-400 border-dashed font-normal bg-slate-50/50", className)}>
                {abteilung}
            </Badge>
        );
    }

    // Try to find matching config from ABTEILUNGEN_CONFIG
    // We do case-insensitive comparison because data from API might vary visually
    const departmentStr = abteilung.toLowerCase();
    
    const configMatch = ABTEILUNGEN_CONFIG.find(
        (c) => c.name.toLowerCase() === departmentStr || c.id.toLowerCase() === departmentStr
    );

    if (configMatch) {
        return (
            <Badge 
                variant={configMatch.color as any} 
                className={cn("capitalize font-bold border-transparent", className)}
            >
                {configMatch.name}
            </Badge>
        );
    }

    // Default Fallback
    return (
        <Badge variant="outline" className={cn("capitalize font-semibold", className)}>
            {abteilung}
        </Badge>
    );
}
