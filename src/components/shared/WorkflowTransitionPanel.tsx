'use client';

/**
 * WorkflowTransitionPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays available workflow transitions for a TS / Position / Unterposition
 * based on the current entity status and the logged-in user's role.
 *
 * Usage:
 *   <WorkflowTransitionPanel
 *     entityId={id}
 *     entityType="TEILSYSTEM"
 *     currentStatus={item.status}
 *     currentAbteilung={item.abteilung}
 *     userRole={currentUser?.role}
 *     onTransitionApplied={(status, abteilung) => handleSave({ status, abteilung })}
 *   />
 */

import React, { useState } from 'react';
import { ArrowRight, Check, RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ABTEILUNGEN_CONFIG } from '@/types';
import type { ItemStatus, UserRole } from '@/types';
import {
    getAvailableTransitions,
    applyTransition,
    WorkflowTransitionId,
} from '@/lib/workflow/workflowEngine';
import { STATUS_UI_CONFIG } from '@/lib/config/statusConfig';
import { Badge } from '@/components/ui/badge';

interface WorkflowTransitionPanelProps {
    entityId: string;
    entityType: 'TEILSYSTEM' | 'POSITION' | 'UNTERPOSITION';
    currentStatus: ItemStatus | string;
    currentAbteilung?: string;
    userRole?: UserRole | string;
    onTransitionApplied: (status: ItemStatus, abteilung: string) => void;
    className?: string;
    isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
    'arrow-right': ArrowRight,
    'check': Check,
    'rotate-ccw': RotateCcw,
    'alert-triangle': AlertTriangle,
};

const BUTTON_COLOR_MAP: Record<WorkflowTransitionId, string> = {
    PLAN_FINISH: 'border-blue-400 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    AVOR_ASSIGN: 'border-orange-400 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20',
    DEPT_FINISH: 'border-green-400 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    REOPEN: 'border-slate-400 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
    NACHBEARBEITUNG: 'border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
};

export function WorkflowTransitionPanel({
    currentStatus,
    currentAbteilung,
    userRole,
    onTransitionApplied,
    className,
    isLoading,
}: WorkflowTransitionPanelProps) {
    const [selectedTransition, setSelectedTransition] = useState<WorkflowTransitionId | null>(null);
    const [destAbteilung, setDestAbteilung] = useState<string>('');
    const [applying, setApplying] = useState(false);

    const transitions = getAvailableTransitions(currentStatus, userRole);

    const abteilungOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...ABTEILUNGEN_CONFIG.map((a) => ({ label: a.name, value: a.name })),
    ];

    const currentStatusConfig =
        STATUS_UI_CONFIG[currentStatus as ItemStatus] ??
        STATUS_UI_CONFIG['offen'];

    const handleApply = async () => {
        if (!selectedTransition) return;
        const transition = transitions.find((t) => t.id === selectedTransition);
        if (!transition) return;
        if (transition.requiresDestAbteilung && !destAbteilung) return;

        setApplying(true);
        try {
            const result = applyTransition(selectedTransition, destAbteilung || undefined);
            if (result) {
                await onTransitionApplied(result.status, result.abteilung);
                setSelectedTransition(null);
                setDestAbteilung('');
            }
        } finally {
            setApplying(false);
        }
    };

    if (transitions.length === 0) {
        return (
            <Card className={cn('border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col', className)}>
                <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        Workflow
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-5 gap-2">
                    <div className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wide text-center">
                        Kein Workflow-Schritt verfügbar
                    </div>
                    <div className="text-[9px] text-muted-foreground/30">
                        Aktueller Status:&nbsp;
                        <Badge variant={currentStatusConfig.variant} className="text-[8px] h-4">
                            {currentStatusConfig.label}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const activeTransition = transitions.find((t) => t.id === selectedTransition);

    return (
        <Card className={cn('border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col', className)}>
            <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Workflow-Schritte
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 gap-3">
                {/* Current Status Indicator */}
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Aktuell:</span>
                    <Badge variant={currentStatusConfig.variant} className="text-[8px] h-4 font-black">
                        {currentStatusConfig.label}
                    </Badge>
                    {currentAbteilung && currentAbteilung !== 'Sin Abteilung' && (
                        <span className="text-[9px] font-bold text-muted-foreground">/ {currentAbteilung}</span>
                    )}
                </div>

                {/* Transition Buttons */}
                <div className="flex flex-col gap-2">
                    {transitions.map((t) => {
                        const Icon = ICON_MAP[t.icon] ?? ArrowRight;
                        const isSelected = selectedTransition === t.id;
                        const colorCls = BUTTON_COLOR_MAP[t.id];
                        const targetCfg = STATUS_UI_CONFIG[t.targetStatus as ItemStatus];
                        return (
                            <div key={t.id} className="flex flex-col gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTransition(isSelected ? null : t.id)}
                                    className={cn(
                                        'w-full rounded-xl border-2 bg-white dark:bg-slate-800 font-black uppercase text-[9px] tracking-widest px-3 h-9',
                                        'flex items-center justify-between gap-2 transition-all shadow-sm',
                                        'border-b-4 active:border-b-2 active:translate-y-[1px]',
                                        colorCls,
                                        isSelected && 'ring-2 ring-offset-1 ring-current'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-3 w-3 shrink-0" />
                                        <span>{t.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {targetCfg && (
                                            <Badge variant={targetCfg.variant} className="text-[7px] h-3.5 font-black">
                                                {targetCfg.label}
                                            </Badge>
                                        )}
                                        {t.targetAbteilung && (
                                            <span className="text-[8px] opacity-60">→ {t.targetAbteilung}</span>
                                        )}
                                        <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform', isSelected && 'rotate-180')} />
                                    </div>
                                </button>

                                {/* Dest Abteilung selector — expands when needed */}
                                {isSelected && t.requiresDestAbteilung && (
                                    <div className="ml-4 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
                                        <Select
                                            label="Ziel-Abteilung *"
                                            options={abteilungOptions}
                                            value={destAbteilung}
                                            onChange={(e) => setDestAbteilung(e.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Apply Button — shown when this transition is selected */}
                                {isSelected && (
                                    <Button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={applying || isLoading || (t.requiresDestAbteilung && !destAbteilung)}
                                        className="ml-4 w-auto self-start h-8 px-4 text-[9px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm"
                                    >
                                        {applying ? 'Wird angewendet...' : 'Jetzt anwenden'}
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
