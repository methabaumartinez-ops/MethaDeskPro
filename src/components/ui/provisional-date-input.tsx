'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export interface ProvisionalDateInputProps {
    label?: string;
    error?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    name?: string;
    /** Text to show in red when the field is empty. Defaults to "Durch den Bauleiter" */
    provisionalText?: string;
    className?: string;
    disabled?: boolean;
}

/**
 * A date input that renders a red provisional label ("Durch den Bauleiter")
 * when no date is selected. Clicking the label triggers the native date picker
 * via a hidden input so the provisional text never flickers or disappears.
 * When a real date is selected, the native date input is shown normally in black.
 */
const ProvisionalDateInput = React.forwardRef<HTMLInputElement, ProvisionalDateInputProps>(
    ({ label, error, value, onChange, onBlur, name, className, disabled,
       provisionalText = 'Durch den Bauleiter' }, ref) => {
        const hasValue = Boolean(value && value.trim() !== '');
        const hiddenInputRef = React.useRef<HTMLInputElement>(null);

        // Merge external ref with our internal ref
        const handleRef = (el: HTMLInputElement | null) => {
            (hiddenInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
        };

        const triggerPicker = () => {
            if (!disabled) hiddenInputRef.current?.showPicker?.();
        };

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-semibold text-foreground ml-1 whitespace-nowrap truncate block">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {/* Provisional state: styled button that opens the date picker */}
                    {!hasValue && (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={triggerPicker}
                            className={cn(
                                'flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm transition-all hover:border-accent-foreground/50 disabled:cursor-not-allowed disabled:opacity-50',
                                error && 'border-red-500',
                                className
                            )}
                        >
                            <Calendar className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="font-semibold text-red-500">{provisionalText}</span>
                        </button>
                    )}

                    {/* Real date input: shown normally when a date is selected */}
                    <input
                        ref={handleRef}
                        type="date"
                        name={name}
                        value={value ?? ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        disabled={disabled}
                        className={cn(
                            'flex h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent-foreground/50',
                            error && 'border-red-500 focus-visible:ring-red-500',
                            // When no value: hide the native input visually but keep it in the DOM so the date picker works
                            !hasValue && 'opacity-0 absolute inset-0 cursor-pointer',
                            className
                        )}
                    />
                </div>
                {error && <p className="text-xs font-medium text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);
ProvisionalDateInput.displayName = 'ProvisionalDateInput';

export { ProvisionalDateInput };
