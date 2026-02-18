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
        switch (s.toLowerCase()) {
            case 'offen': return 'success';
            case 'bestellt': return 'warning';
            case 'in arbeit': return 'info';
            case 'geliefert': return 'success';
            case 'verbaut': return 'info';
            case 'abgeschlossen': return 'default';
            case 'pausiert': return 'error';
            default: return 'outline';
        }
    };

    return (
        <Badge variant={getVariant(status) as any} className={cn("capitalize font-bold", className)}>
            {status}
        </Badge>
    );
}
