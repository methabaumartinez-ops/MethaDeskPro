'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, ChevronDown, ChevronUp, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FieldChange {
    field: string;
    label: string;
    before: unknown;
    after: unknown;
}

interface ChangelogEntry {
    id: string;
    changedAt: string;
    changedBy: string;
    changedFields: FieldChange[];
    summary: string;
    entityType?: 'teilsystem' | 'position' | 'unterposition';
}

const renderValue = (val: unknown) => {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
};

const getFieldLabel = (entityType: string | undefined, field: string, defaultLabel: string) => {
    if (field === 'status') {
        if (entityType === 'teilsystem') return 'TS Status';
        if (entityType === 'position') return 'Pos Status';
        if (entityType === 'unterposition') return 'UntPos Status';
    }
    return defaultLabel;
};

interface ChangeHistoryPanelProps {
    entityId: string;
    className?: string;
}

const VISIBLE_COUNT = 5;

export function ChangeHistoryPanel({ entityId, className }: ChangeHistoryPanelProps) {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!entityId) return;
        setLoading(true);
        fetch(`/api/changelog?entityId=${entityId}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setEntries(Array.isArray(data) ? data : []))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));

    }, [entityId]);

    const visible = expanded ? entries : entries.slice(0, VISIBLE_COUNT);
    const hasMore = entries.length > VISIBLE_COUNT;

    return (
        <Card className={cn("border-2 border-border shadow-sm overflow-hidden bg-white dark:bg-card flex flex-col", className)}>
            <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    Aenderungshistorie
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="py-6 flex justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="py-8 px-4 flex flex-col items-center justify-center text-center flex-1">
                        <Clock className="h-7 w-7 text-muted-foreground/20 mb-2" />
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">
                            Noch keine Aenderungen
                        </p>
                        <p className="text-[9px] text-muted-foreground/30 mt-0.5">
                            Wird beim naechsten Speichern erfasst
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 overflow-y-auto max-h-[280px]">
                        {visible.map((entry, idx) => (
                            <div
                                key={entry.id}
                                className={cn(
                                    "px-4 py-3 hover:bg-muted/5 transition-colors",
                                    idx === 0 && "bg-primary/5"
                                )}
                            >
                                {/* Header row: user + date + field count */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-wider truncate">
                                        <User className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{entry.changedBy}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {entry.changedFields && entry.changedFields.length > 0 && (
                                            <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                                {entry.changedFields.length} Feld{entry.changedFields.length !== 1 ? 'er' : ''}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-bold text-muted-foreground/50 whitespace-nowrap">
                                            {format(new Date(entry.changedAt), 'dd.MM.yy HH:mm', { locale: de })}
                                        </span>
                                    </div>
                                </div>

                                {/* Field changes */}
                                <div className="space-y-1.5">
                                    {(entry.changedFields && entry.changedFields.length > 0) ? (
                                        entry.changedFields.map((f, i) => (
                                            <div key={i} className="rounded-lg bg-muted/40 border border-border/50 px-2.5 py-1.5">
                                                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                                                    {getFieldLabel(entry.entityType, f.field, f.label)}
                                                </div>
                                                <div className="flex items-start gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-medium text-red-500/80 line-through break-all leading-tight">
                                                        {renderValue(f.before)}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/40 shrink-0 mt-0.5">→</span>
                                                    <span className="text-[10px] font-bold text-foreground break-all leading-tight">
                                                        {renderValue(f.after)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[9px] text-muted-foreground italic px-1">
                                            {entry.summary || 'Änderung erfasst'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {hasMore && (
                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                            >
                                {expanded
                                    ? <><ChevronUp className="h-3 w-3" /> Weniger</>
                                    : <><ChevronDown className="h-3 w-3" /> {entries.length - VISIBLE_COUNT} weitere</>
                                }
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
