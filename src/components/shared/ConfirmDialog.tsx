'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'success' | 'info';
    showCancel?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Bestätigen',
    cancelLabel = 'Abbrechen',
    variant = 'warning',
    showCancel = true
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variants = {
        danger: {
            icon: <AlertTriangle className="h-10 w-10 text-red-600" />,
            iconBg: "bg-red-100 dark:bg-red-950/30",
            border: "border-red-500/20",
            button: "bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-red-900/20",
        },
        warning: {
            icon: <AlertTriangle className="h-10 w-10 text-orange-500" />,
            iconBg: "bg-orange-50 dark:bg-orange-500/10",
            border: "border-orange-500/20",
            button: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 dark:shadow-orange-900/20",
        },
        success: {
            icon: <CheckCircle className="h-10 w-10 text-green-600" />,
            iconBg: "bg-green-100 dark:bg-green-950/30",
            border: "border-green-500/20",
            button: "bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-green-900/20",
        },
        info: {
            icon: <Info className="h-10 w-10 text-blue-600" />,
            iconBg: "bg-blue-100 dark:bg-blue-950/30",
            border: "border-blue-500/20",
            button: "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-blue-900/20",
        }
    };

    const currentVariant = variants[variant] || variants.warning;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className={cn(
                "relative bg-white dark:bg-card w-full max-w-sm rounded-[2.5rem] shadow-2xl border-2 p-8 flex flex-col items-center gap-6 animate-in zoom-in slide-in-from-bottom-4 duration-300",
                currentVariant.border
            )}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Icon Container */}
                <div className={cn(
                    "h-20 w-20 rounded-full flex items-center justify-center border-4",
                    currentVariant.iconBg,
                    currentVariant.border
                )}>
                    {currentVariant.icon}
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                        {title}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2 line-clamp-4 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-3">
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "w-full h-12 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                            currentVariant.button
                        )}
                    >
                        {confirmLabel}
                    </Button>

                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
