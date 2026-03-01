import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ItemStatus, ProjektStatus } from '@/types';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: ItemStatus | ProjektStatus | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const getVariant = (s: string) => {
        if (!s) return 'outline';
        switch (s.toLowerCase()) {
            case 'offen': return 'success';
            case 'bestellt': return 'warning';
            case 'in arbeit': return 'info';
            case 'geliefert': return 'success';
            case 'verbaut': return 'info';
            case 'geaendert': return 'warning';
            case 'abgeschlossen': return 'default';
            case 'pausiert': return 'error';
            default: return 'outline';
        }
    };

    const getDisplayText = (s: string) => {
        if (!s) return s;
        switch (s.toLowerCase()) {
            case 'offen': return 'Offen';
            case 'in_produktion': return 'In Produktion';
            case 'bestellt': return 'Bestellt';
            case 'geliefert': return 'Geliefert';
            case 'verbaut': return 'Verbaut';
            case 'geaendert': return 'Nachbearbeitung';
            case 'abgeschlossen': return 'Abgeschlossen';
            case 'pausiert': return 'Pausiert';
            default: return s;
        }
    };

    return (
        <Badge variant={getVariant(status) as any} className={cn("capitalize font-bold", className)}>
            {getDisplayText(status)}
        </Badge>
    );
}
