'use client';

import React, { useEffect, useState } from 'react';
import { Lagerbewegung, Lagerort } from '@/types';
import { LagerbewegungService } from '@/lib/services/lagerbewegungService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowRightLeft, Download, MapPin, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TrackingTimelineProps {
    entityId: string;
    projektId: string;
    entityType: 'position' | 'unterposition';
    className?: string;
}

export function TrackingTimeline({ entityId, projektId, entityType, className }: TrackingTimelineProps) {
    const [history, setHistory] = useState<Lagerbewegung[]>([]);
    const [lagerorte, setLagerorte] = useState<Record<string, Lagerort>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [h, loList] = await Promise.all([
                    LagerbewegungService.getHistorieForEntity(entityId),
                    LagerortService.getLagerorte(projektId)
                ]);

                const loMap: Record<string, Lagerort> = {};
                loList.forEach(lo => { loMap[lo.id] = lo; });

                setHistory(h);
                setLagerorte(loMap);
            } catch (error) {
                console.error('Failed to load tracking history', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [entityId, projektId]);

    if (loading) return <div className="h-20 animate-pulse bg-muted rounded-xl" />;

    if (history.length === 0) {
        return (
            <Card className={cn("border-2 border-dashed border-border bg-muted/20", className)}>
                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-bold text-muted-foreground">Keine Tracking-Daten vorhanden</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Starten Sie einen Scan, um Bewegungen zu erfassen.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("border-2 border-border shadow-sm", className)}>
            <CardHeader className="border-b bg-muted/30 py-3 px-6">
                <CardTitle className="text-base font-black flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Tracking Historie
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-800">
                    {history.map((event, index) => {
                        const nachLo = lagerorte[event.nachLagerortId]?.bezeichnung || 'Unbekannt';
                        const vonLo = event.vonLagerortId ? lagerorte[event.vonLagerortId]?.bezeichnung : null;
                        const zeitpunkt = new Date(event.zeitpunkt);
                        const zeitpunktStr = !isNaN(zeitpunkt.getTime())
                            ? format(zeitpunkt, 'dd.MM.yyyy HH:mm', { locale: de })
                            : (event.zeitpunkt || '—');

                        return (
                            <div key={event.id} className="relative flex items-start group">
                                <div className={cn(
                                    "absolute left-0 mt-1 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-all group-hover:scale-110 group-hover:shadow-md dark:bg-slate-950",
                                    index === 0 ? "border-primary ring-4 ring-primary/10" : "border-slate-200 dark:border-slate-800"
                                )}>
                                    {event.typ === 'einlagerung' ? (
                                        <Download className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                                <div className="ml-14 flex-1 pt-1">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                        <div>
                                            <p className="text-sm font-black text-foreground capitalize">
                                                {event.typ === 'einlagerung' ? 'Einlagerung' : event.typ === 'auslagerung' ? 'Auslagerung' : 'Umlagerung'}
                                            </p>
                                            <p className="text-xs font-bold text-muted-foreground mt-0.5">
                                                {vonLo ? (
                                                    <span className="flex items-center gap-1">
                                                        {vonLo} <ArrowRightLeft className="h-3 w-3 inline" /> {nachLo}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        Nach: <MapPin className="h-3 w-3 inline" /> {nachLo}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full w-fit">
                                            <Calendar className="h-3 w-3" />
                                            {zeitpunktStr}
                                        </div>
                                    </div>

                                    {(event.bemerkung || event.durchgefuehrtVonName) && (
                                        <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                            {event.bemerkung && <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{event.bemerkung}"</p>}
                                            {event.durchgefuehrtVonName && (
                                                <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                                    <User className="h-3 w-3" />
                                                    <span className="font-bold">{event.durchgefuehrtVonName}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
