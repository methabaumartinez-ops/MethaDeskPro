'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AbteilungWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AbteilungWarningModal({ isOpen, onClose }: AbteilungWarningModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-card w-full max-w-sm rounded-[2.5rem] shadow-2xl border-2 border-orange-500/10 p-8 flex flex-col items-center gap-6 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="h-20 w-20 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center border-4 border-orange-500/20">
                    <AlertTriangle className="h-10 w-10 text-orange-500" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase">
                        Aktion gesperrt
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2 line-clamp-3">
                        Die Abteilung kann nur geändert werden, wenn der Status des Teilsystems <span className="text-orange-500 font-black">"Abgeschlossen"</span> ist.
                    </p>
                </div>

                <Button
                    onClick={onClose}
                    className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    Verstanden
                </Button>
            </div>
        </div>
    );
}
