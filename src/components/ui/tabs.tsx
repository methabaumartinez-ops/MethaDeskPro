'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('space-y-4', className)}>{children}</div>
);

const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('inline-flex h-12 items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-1 text-slate-500 dark:text-slate-400', className)}>
        {children}
    </div>
);

const TabsTrigger = ({
    children,
    active,
    onClick,
    className
}: {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    className?: string;
}) => (
    <button
        onClick={onClick}
        className={cn(
            'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-black ring-offset-white transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
            active
                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-900 dark:text-orange-300 shadow-sm border-none'
                : 'bg-orange-50/50 text-orange-600 hover:bg-orange-100/50 hover:text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 dark:hover:text-orange-300 border-none',
            className
        )}
    >
        {children}
    </button>
);

const TabsContent = ({ children, active, className }: { children: React.ReactNode; active: boolean; className?: string }) => {
    if (!active) return null;
    return <div className={cn('ring-offset-white focus-visible:outline-none', className)}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
