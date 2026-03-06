'use client';

import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'info' | 'error' | 'warning';

interface ToastOptions {
    title?: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
}

type ToastFn = (options: ToastOptions | string) => void;

let _toastFn: ToastFn | null = null;

/**
 * Internal helper to register the toast function globally.
 */
export function _registerToastFn(fn: ToastFn) {
    _toastFn = fn;
}

/**
 * Show a non-blocking toast notification.
 */
export const toast = (options: ToastOptions | string) => {
    if (_toastFn) {
        _toastFn(options);
    } else {
        console.warn('ToastProvider not mounted. Message:', options);
    }
};

toast.success = (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => 
    toast({ ...options, message, variant: 'success' });

toast.error = (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => 
    toast({ ...options, message, variant: 'error' });

toast.info = (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => 
    toast({ ...options, message, variant: 'info' });

toast.warning = (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => 
    toast({ ...options, message, variant: 'warning' });
