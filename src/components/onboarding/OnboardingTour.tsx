'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Layout, FolderKanban, Users, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    highlight?: string;
}

const STEPS: OnboardingStep[] = [
    {
        icon: <Sparkles className="h-8 w-8 text-primary" />,
        title: 'Willkommen bei METHADesk Pro!',
        description: 'Ihre zentrale Plattform für Baudokumentation und Projektmanagement. Wir zeigen Ihnen kurz die wichtigsten Funktionen.',
        highlight: 'Diese Einführung erscheint nur einmal.',
    },
    {
        icon: <Layout className="h-8 w-8 text-primary" />,
        title: 'Dashboard & Projekte',
        description: 'Auf der Startseite sehen Sie alle aktiven Projekte auf einen Blick. Wählen Sie ein Projekt, um in die Detailansicht zu gelangen.',
    },
    {
        icon: <FolderKanban className="h-8 w-8 text-primary" />,
        title: 'Teilsysteme & Positionen',
        description: 'Jedes Projekt ist in Teilsysteme und Positionen unterteilt. Verfolgen Sie Status, Lieferdaten und Montage in Echtzeit.',
    },
    {
        icon: <Users className="h-8 w-8 text-primary" />,
        title: 'Planer & Mitarbeiter',
        description: 'Weisen Sie Aufgaben Mitarbeitern zu, verwalten Sie Teams und behalten Sie Auslastungen im Blick.',
    },
    {
        icon: <Truck className="h-8 w-8 text-primary" />,
        title: 'Fahrzeuge & Ressourcen',
        description: 'Planen und reservieren Sie Fahrzeuge direkt aus der App. Alle Ressourcen auf einen Blick.',
    },
    {
        icon: <CheckCircle2 className="h-8 w-8 text-emerald-500" />,
        title: 'Bereit loszulegen!',
        description: 'Das war der schnelle Überblick. Sie können jederzeit auf die Hilfe-Dokumentation zugreifen. Viel Erfolg!',
    },
];

interface OnboardingTourProps {
    onComplete: () => void;
    onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
    const [step, setStep] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    const isLast = step === STEPS.length - 1;
    const isFirst = step === 0;
    const current = STEPS[step];
    const progress = ((step + 1) / STEPS.length) * 100;

    const handleFinish = () => {
        setVisible(false);
        setTimeout(onComplete, 300);
    };

    const handleSkip = () => {
        setVisible(false);
        setTimeout(onSkip, 300);
    };

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60" onClick={handleSkip} />

            {/* Modal */}
            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header gradient bar */}
                <div className="h-1.5 bg-slate-100">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Close */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    aria-label="Überspringen"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-8 pt-6">
                    {/* Icon */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100 mb-5">
                        {current.icon}
                    </div>

                    {/* Step counter */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Schritt {step + 1} von {STEPS.length}
                    </p>

                    <h2 className="text-xl font-bold text-slate-800 mb-3 leading-tight">
                        {current.title}
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-3">
                        {current.description}
                    </p>

                    {current.highlight && (
                        <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700 font-medium">
                            ✨ {current.highlight}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 pb-6">
                    {/* Skip */}
                    {!isLast ? (
                        <button
                            onClick={handleSkip}
                            className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                        >
                            Überspringen
                        </button>
                    ) : (
                        <div />
                    )}

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        {!isFirst && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Zurück
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
                            className="flex items-center gap-1 min-w-[100px]"
                        >
                            {isLast ? 'Los geht\'s!' : (
                                <>
                                    Weiter
                                    <ChevronRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Step dots */}
                <div className="flex items-center justify-center gap-1.5 pb-5">
                    {STEPS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setStep(i)}
                            className={`rounded-full transition-all duration-200 ${i === step ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
                            aria-label={`Schritt ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Hook to manage onboarding state
export function useOnboarding(onboardingStatus?: string, userId?: string) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Key is per-user so different users on same browser are handled correctly
        const localKey = userId ? `methabau_onboarding_done_${userId}` : 'methabau_onboarding_done';

        // 1. Check localStorage first (instant, always reliable)
        const localDone = typeof window !== 'undefined' && localStorage.getItem(localKey) === 'true';
        if (localDone) return; // Already seen it — never show again

        // 2. If DB says pending (first login), show the tour
        if (onboardingStatus === 'pending') {
            const t = setTimeout(() => setShow(true), 800);
            return () => clearTimeout(t);
        }
    }, [onboardingStatus, userId]);

    const markCompleted = async (status: 'completed' | 'skipped') => {
        setShow(false);

        // Save to localStorage immediately so it never shows again on this browser
        const localKey = userId ? `methabau_onboarding_done_${userId}` : 'methabau_onboarding_done';
        if (typeof window !== 'undefined') {
            localStorage.setItem(localKey, 'true');
        }

        // Also persist to DB (best-effort)
        try {
            await fetch('/api/user/onboarding', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch {
            // Non-critical — localStorage already guards against re-showing
        }
    };

    return {
        show,
        complete: () => markCompleted('completed'),
        skip: () => markCompleted('skipped'),
    };
}
