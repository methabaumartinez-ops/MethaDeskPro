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
                    <div className="divide-y divide-border/30 overflow-y-auto max-h-[280px]">
                        {visible.map((entry) => {
                            const dateStr = format(new Date(entry.changedAt), 'dd.MM.yy', { locale: de });
                            // Short name: "F.Martinez"
                            const nameParts = entry.changedBy.trim().split(' ');
                            const shortName = nameParts.length >= 2
                                ? `${nameParts[0][0]}.${nameParts.slice(1).join(' ')}`
                                : entry.changedBy;

                            const rows = (entry.changedFields && entry.changedFields.length > 0)
                                ? entry.changedFields.map((f, i) => ({ key: `${entry.id}-${i}`, label: getFieldLabel(entry.entityType, f.field, f.label), before: renderValue(f.before), after: renderValue(f.after) }))
                                : [{ key: entry.id, label: '', before: '', after: entry.summary || 'Änderung erfasst' }];

                            return rows.map(row => (
                                <div key={row.key} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/30 transition-colors text-[10px]">
                                    <span className="font-black text-primary shrink-0">{shortName}</span>
                                    <span className="text-muted-foreground/50 shrink-0">{dateStr}</span>
                                    {row.label && (
                                        <>
                                            <span className="font-bold text-muted-foreground shrink-0">{row.label}:</span>
                                            <span className="text-red-500/70 line-through shrink-0 max-w-[60px] truncate">{row.before}</span>
                                            <span className="text-muted-foreground/40 shrink-0">→</span>
                                            <span className="font-bold text-foreground truncate">{row.after}</span>
                                        </>
                                    )}
                                    {!row.label && (
                                        <span className="text-muted-foreground italic truncate">{row.after}</span>
                                    )}
                                </div>
                            ));
                        })}
                        {hasMore && (
                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="w-full py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
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
