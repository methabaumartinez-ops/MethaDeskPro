import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Abteilung, ABTEILUNGEN_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

// Abteilung color mapping (background colors with always-black text)
// AVOR=blue, Bau=red, Einkauf=yellow — all others have unique colors
// Text is always black regardless of background color

interface AbteilungBadgeProps {
    abteilung: Abteilung | string | null | undefined;
    className?: string;
}

export function AbteilungBadge({ abteilung, className }: AbteilungBadgeProps) {
    if (!abteilung) return <span className="text-slate-400 italic text-xs">Keine Abteilung</span>;

    if (abteilung === 'Sin Abteilung') {
        return (
            <Badge variant="outline" className={cn("text-slate-400 border-dashed font-normal bg-slate-50/50", className)}>
                —
            </Badge>
        );
    }

    const departmentStr = abteilung.toLowerCase();

    const configMatch = ABTEILUNGEN_CONFIG.find(
        (c) => c.name.toLowerCase() === departmentStr || c.id.toLowerCase() === departmentStr
    );

    if (configMatch) {
        return (
            <Badge
                variant={configMatch.color as any}
                className={cn(
                    "capitalize font-bold border-transparent !text-black",
                    className
                )}
            >
                {configMatch.name}
            </Badge>
        );
    }

    // Default Fallback — also black text
    return (
        <Badge variant="outline" className={cn("capitalize font-semibold !text-black", className)}>
            {abteilung}
        </Badge>
    );
}
