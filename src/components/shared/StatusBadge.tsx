import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusStyle } from '@/lib/config/statusConfig';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string | null | undefined;
    className?: string;
    showIcon?: boolean;
}

/**
 * Centralized status badge.
 * Resolves any status string through getStatusStyle() — handles
 * legacy aliases, casing variants, and unknown statuses gracefully.
 * Scope: status chips/pills only. Does NOT color cards or rows.
 */
export function StatusBadge({ status, className, showIcon }: StatusBadgeProps) {
    if (!status) return null;

    const style = getStatusStyle(status);

    return (
        <Badge
            variant={style.variant}
            className={cn('font-bold', className)}
        >
            {style.label}
        </Badge>
    );
}
