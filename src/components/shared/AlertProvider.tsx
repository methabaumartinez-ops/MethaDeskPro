'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { _registerAlertFn } from '@/lib/alert';

type AlertVariant = 'danger' | 'warning' | 'success' | 'info';

interface AlertOptions {
    title: string;
    message: string;
    variant?: AlertVariant;
    confirmLabel?: string;
}

interface AlertState extends AlertOptions {
    id: number;
    resolve: () => void;
}

interface AlertContextValue {
    alert: (options: AlertOptions | string) => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlert() {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlert must be used within AlertProvider');
    return ctx;
}

const VARIANTS = {
    danger: {
        icon: AlertTriangle,
        iconClass: 'text-red-500',
        iconBg: 'bg-red-100 border-red-200',
        button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-orange-500',
        iconBg: 'bg-orange-100 border-orange-200',
        button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
    success: {
        icon: CheckCircle,
        iconClass: 'text-green-500',
        iconBg: 'bg-green-100 border-green-200',
        button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
    info: {
        icon: Info,
        iconClass: 'text-blue-500',
        iconBg: 'bg-blue-100 border-blue-200',
        button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20',
    },
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [alerts, setAlerts] = useState<AlertState[]>([]);
    const [counter, setCounter] = useState(0);

    const alert = useCallback((options: AlertOptions | string): Promise<void> => {
        return new Promise((resolve) => {
            const opts: AlertOptions = typeof options === 'string'
                ? { title: 'Hinweis', message: options, variant: 'warning' }
                : options;

            setCounter(c => {
                const id = c + 1;
                setAlerts(prev => [...prev, { ...opts, variant: opts.variant || 'warning', id, resolve }]);
                return id;
            });
        });
    }, []);

    // Register globally so non-hook code can call showAlert()
    useEffect(() => { _registerAlertFn(alert); }, [alert]);

    const dismiss = (id: number) => {
        setAlerts(prev => {
            const a = prev.find(x => x.id === id);
            a?.resolve();
            return prev.filter(x => x.id !== id);
        });
    };

    return (
        <AlertContext.Provider value={{ alert }}>
            {children}
            {alerts.map((a) => {
                const v = VARIANTS[a.variant || 'warning'];
                const Icon = v.icon;
                return (
                    <div key={a.id} className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        {/* Blur backdrop */}
                        <div
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => dismiss(a.id)}
                        />
                        {/* Modal */}
                        <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 flex flex-col items-center gap-5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                            {/* Close button */}
                            <button
                                onClick={() => dismiss(a.id)}
                                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {/* Icon */}
                            <div className={cn(
                                'flex h-20 w-20 items-center justify-center rounded-full border-2',
                                v.iconBg
                            )}>
                                <Icon className={cn('h-10 w-10', v.iconClass)} />
                            </div>

                            {/* Text */}
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                                    {a.title}
                                </h2>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                                    {a.message}
                                </p>
                            </div>

                            {/* Button */}
                            <button
                                onClick={() => dismiss(a.id)}
                                className={cn(
                                    'w-full py-3.5 rounded-2xl text-white font-black uppercase text-xs tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg',
                                    v.button
                                )}
                            >
                                {a.confirmLabel || 'Verstanden'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </AlertContext.Provider>
    );
}
