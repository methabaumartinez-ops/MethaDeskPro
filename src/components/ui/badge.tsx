import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants = {
        default: 'border-transparent bg-primary text-primary-foreground',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        error: 'border-transparent bg-red-100 text-red-800',
        info: 'border-transparent bg-blue-100 text-blue-800',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
                variants[variant],
                className
            )}
            {...props}
        />
    );
}

export { Badge };
