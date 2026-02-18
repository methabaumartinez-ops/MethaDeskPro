import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { label: string; value: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-semibold text-foreground ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        className={cn(
                            'flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent-foreground/50',
                            error && 'border-red-500 focus-visible:ring-red-500',
                            className
                        )}
                        ref={ref}
                        {...props}
                    >
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
                {error && <p className="text-xs font-medium text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);
Select.displayName = 'Select';

export { Select };
