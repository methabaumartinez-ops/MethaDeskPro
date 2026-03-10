import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusStyle } from '@/lib/config/statusConfig';
import { cn } from '@/lib/utils';
import {
    CheckCircle2, Circle, AlertCircle, Clock,
    Loader2, Package, PackageCheck, Wrench, Ban
} from 'lucide-react';

interface TaskStatusBadgeProps {
    status: string;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

/** Returns the icon component for a given canonical status */
function getStatusIcon(status: string): React.ReactNode {
    const key = status.toLowerCase().trim();
    const iconMap: Record<string, React.ReactNode> = {
        offen:           <Circle className="h-3 w-3" />,
        in_arbeit:       <Loader2 className="h-3 w-3" />,
        in_planung:      <Clock className="h-3 w-3" />,
        fertig:          <CheckCircle2 className="h-3 w-3" />,
        nachbearbeitung: <Wrench className="h-3 w-3" />,
        geaendert:       <Wrench className="h-3 w-3" />,
        geliefert:       <PackageCheck className="h-3 w-3" />,
        bestellt:        <Package className="h-3 w-3" />,
        verbaut:         <CheckCircle2 className="h-3 w-3" />,
        abgeschlossen:   <CheckCircle2 className="h-3 w-3" />,
        blockiert:       <Ban className="h-3 w-3" />,
        pausiert:        <AlertCircle className="h-3 w-3" />,
    };
    return iconMap[key] ?? <Circle className="h-3 w-3" />;
}

/**
 * Status badge with icon — used in Ausfuehrung task views.
 * Now backed by the centralized getStatusStyle() system.
 * Scope: task status chips only.
 */
export function TaskStatusBadge({
    status,
    className,
    variant = 'default',
    size = 'md',
}: TaskStatusBadgeProps) {
    const style = getStatusStyle(status);
    const icon = getStatusIcon(status);

    const sizeStyles = {
        sm: 'px-1.5 py-0 text-[10px] gap-1 h-5',
        md: 'px-2.5 py-0.5 text-xs gap-1.5 h-6',
        lg: 'px-3 py-1 text-sm gap-2 h-8',
    };

    // Build class string from granular tokens based on variant
    let colorClasses: string;
    if (variant === 'ghost') {
        colorClasses = cn('bg-transparent border-transparent', style.iconColor);
    } else if (variant === 'outline') {
        colorClasses = cn('bg-transparent', style.textColor, style.borderColor);
    } else {
        colorClasses = cn(style.bgColor, style.textColor, style.borderColor ?? '');
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                'font-bold uppercase tracking-widest whitespace-nowrap shadow-sm transition-colors',
                colorClasses,
                sizeStyles[size],
                className
            )}
        >
            <span className={cn('shrink-0', style.iconColor)}>{icon}</span>
            {style.label}
        </Badge>
    );
}
