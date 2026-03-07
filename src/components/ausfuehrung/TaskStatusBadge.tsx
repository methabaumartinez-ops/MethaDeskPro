import * as React from 'react';
import { TaskStatus, SubtaskStatus } from '@/types/ausfuehrung';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';

interface TaskStatusBadgeProps {
    status: TaskStatus | SubtaskStatus;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { label: string; colorClass: string; icon: React.ReactNode }> = {
    'offen': {
        label: 'Offen',
        colorClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: <Circle className="h-3 w-3" />
    },
    'in_arbeit': {
        label: 'In Arbeit',
        colorClass: 'bg-orange-50 text-orange-600 border-orange-200',
        icon: <Clock className="h-3 w-3" />
    },
    'blockiert': {
        label: 'Blockiert',
        colorClass: 'bg-red-100 text-red-700 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />
    },
    'fertig': {
        label: 'Fertig',
        colorClass: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle2 className="h-3 w-3" />
    },
};

export function TaskStatusBadge({ status, className, variant = 'default', size = 'md' }: TaskStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig['offen'];

    // Map variant to styling approach
    let variantStyles = '';
    if (variant === 'ghost') {
        variantStyles = config.colorClass.replace(/bg-\w+-\d+/, 'bg-transparent border-transparent').replace(/text-\w+-\d+/, 'text-muted-foreground hover:bg-slate-50');
    } else if (variant === 'outline') {
        variantStyles = config.colorClass.replace(/bg-\w+-\d+/, 'bg-transparent');
    } else {
        variantStyles = config.colorClass;
    }

    const sizeStyles = {
        sm: 'px-1.5 py-0 text-[10px] gap-1 h-5',
        md: 'px-2.5 py-0.5 text-xs gap-1.5 h-6',
        lg: 'px-3 py-1 text-sm gap-2 h-8',
    };

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-bold uppercase tracking-widest whitespace-nowrap shadow-sm transition-colors",
                variantStyles,
                sizeStyles[size],
                className
            )}
        >
            {config.icon}
            {config.label}
        </Badge>
    );
}
