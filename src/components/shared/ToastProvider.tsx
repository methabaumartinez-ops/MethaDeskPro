'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { _registerToastFn } from '@/lib/toast';

type ToastVariant = 'success' | 'info' | 'error' | 'warning';

interface ToastItem {
    id: string;
    message: string;
    title?: string;
    variant: ToastVariant;
    duration: number;
}

const VARIANTS = {
    success: {
        icon: CheckCircle,
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-800 dark:text-green-300',
        iconColor: 'text-green-600 dark:text-green-400',
    },
    error: {
        icon: AlertTriangle,
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-300',
        iconColor: 'text-red-600 dark:text-red-400',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-300',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-800 dark:text-orange-300',
        iconColor: 'text-orange-600 dark:text-orange-400',
    }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((options: { message: string; title?: string; variant?: ToastVariant; duration?: number } | string) => {
        const id = Math.random().toString(36).substring(2, 9);
        const item: ToastItem = typeof options === 'string'
            ? { id, message: options, variant: 'info', duration: 4000 }
            : { 
                id, 
                message: options.message, 
                title: options.title, 
                variant: options.variant || 'info', 
                duration: options.duration || 4000 
            };

        setToasts(prev => [...prev, item]);

        if (item.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, item.duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        _registerToastFn(addToast);
    }, [addToast]);

    return (
        <>
            {children}
            <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-3 w-full max-w-sm">
                {toasts.map((t) => {
                    const v = VARIANTS[t.variant];
                    const Icon = v.icon;
                    return (
                        <div
                            key={t.id}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-2xl border-2 shadow-lg backdrop-blur-md animate-in slide-in-from-right-full duration-300",
                                v.bg,
                                v.border
                            )}
                        >
                            <div className={cn("p-1.5 rounded-full bg-white dark:bg-slate-900 shadow-sm", v.iconColor)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                {t.title && <h4 className={cn("font-black uppercase text-[10px] tracking-widest", v.text)}>{t.title}</h4>}
                                <p className={cn("text-xs font-bold leading-relaxed", v.text)}>{t.message}</p>
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className={cn("p-1 rounded-lg hover:bg-black/5 transition-colors", v.text)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
