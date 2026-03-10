import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'gray' | 'orange' | 'teal' | 'violet' | 'fertig' | 'amber';
}

export const badgeVariants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    outline: 'text-foreground border-border',
    success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    amber:   'border-transparent bg-amber-200 text-amber-900 dark:bg-amber-800/40 dark:text-amber-300',
    error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    secondary: 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
    gray: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    fertig: 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    orange: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-500/30 dark:text-orange-400',
    teal: 'border-transparent bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    violet: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
                badgeVariants[variant],
                className
            )}
            {...props}
        />
    );
}

export { Badge };
