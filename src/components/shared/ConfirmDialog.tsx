'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Löschen',
    cancelLabel = 'Abbrechen',
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
                            variant === 'danger' ? "bg-red-100 dark:bg-red-950 text-red-600" : "bg-amber-100 dark:bg-amber-950 text-amber-600"
                        )}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-foreground">{title}</h3>
                        </div>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <p className="text-muted-foreground font-medium mb-6">
                        {description}
                    </p>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} className="font-bold">
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={variant === 'danger' ? 'danger' : 'primary'}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={cn(
                                "font-bold shadow-lg",
                                variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-red-950/20" : "shadow-amber-200 dark:shadow-amber-950/20"
                            )}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
