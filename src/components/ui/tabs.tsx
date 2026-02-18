'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('space-y-4', className)}>{children}</div>
);

const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn('inline-flex h-12 items-center justify-center rounded-xl bg-slate-100 p-1 text-slate-500', className)}>
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
            'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
            active ? 'bg-white text-slate-950 shadow-sm' : 'hover:bg-slate-200/50 hover:text-slate-700',
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
