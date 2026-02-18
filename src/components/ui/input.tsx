import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-semibold text-foreground ml-1">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    className={cn(
                        'flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent-foreground/50',
                        error && 'border-red-500 focus-visible:ring-red-500',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="text-xs font-medium text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

export { Input };
