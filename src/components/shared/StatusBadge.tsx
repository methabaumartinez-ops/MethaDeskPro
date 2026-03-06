import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ItemStatus, ProjektStatus } from '@/types';
import { STATUS_UI_CONFIG } from '@/lib/config/statusConfig';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: ItemStatus | ProjektStatus | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    if (!status) return null;

    // Use lowercase to perform dict match
    const sKey = status.toLowerCase() as ItemStatus;

    // If it's a known ItemStatus mapped in STATUS_UI_CONFIG
    if (STATUS_UI_CONFIG[sKey]) {
        const config = STATUS_UI_CONFIG[sKey];
        return (
            <Badge variant={config.variant} className={cn("capitalize font-bold", className)}>
                {config.label}
            </Badge>
        );
    }

    // Fallbacks for unmapped statuses like Project statuses ('in arbeit', 'pausiert')
    if (status === 'in arbeit') {
        return <Badge variant="info" className={cn("capitalize font-bold", className)}>In Arbeit</Badge>;
    }
    if (status === 'pausiert') {
        return <Badge variant="error" className={cn("capitalize font-bold", className)}>Pausiert</Badge>;
    }

    // Default Fallback
    return (
        <Badge variant="outline" className={cn("capitalize font-bold", className)}>
            {status}
        </Badge>
    );
}
