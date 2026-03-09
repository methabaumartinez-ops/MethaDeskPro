'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Calendar, MapPin, FileText, Hash, Loader2, ShieldCheck, ListTodo } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function TeilsystemShareView({ id }: { id: string }) {
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch(`/api/public/share/teilsystem/${id}`)
            .then(r => r.json())
            .then(data => {
                if (!mounted) return;
                if (data.error) setError(data.error);
                else setItem(data);
            })
            .catch(() => mounted && setError('Fehler beim Laden der Daten.'))
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-bold text-muted-foreground">Lade Teilsystem-Informationen...</p>
        </div>
    );

    if (error || !item) return (
        <Card className="border-2 border-red-100 shadow-xl rounded-[2rem] max-w-xl mx-auto mt-10">
            <CardContent className="py-20 flex flex-col items-center text-center gap-6">
                <div className="p-6 bg-red-50 rounded-full">
                    <Layers className="h-12 w-12 text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Teilsystem nicht gefunden</h2>
                    <p className="text-muted-foreground mt-2 font-medium max-w-sm">
                        {error || 'Der gesuchte Eintrag konnte nicht gefunden werden.'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );

    const tsNr = (item.teilsystemNummer || '').replace(/^ts\s?/i, '');
    const dateFields = [
        { label: 'Planabgabe', value: item.abgabePlaner },
        { label: 'Liefertermin', value: item.lieferfrist },
        { label: 'Montage', value: item.montagetermin },
    ];
    const locationFields = [
        { label: 'Gebäude', value: item['gebäude'] },
        { label: 'Abschnitt', value: item.abschnitt },
        { label: 'Geschoss', value: item.geschoss },
    ].filter(f => f.value);

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header Banner */}
            <Card className="border-2 border-primary/10 shadow-xl rounded-[2rem] overflow-hidden">
                <div className="bg-gradient-to-br from-primary/5 to-orange-50 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Layers className="w-48 h-48 rotate-12" />
                    </div>
                    <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-lg ring-4 ring-primary/10 mb-4 relative z-10">
                        <Layers className="h-8 w-8 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Teilsystem</p>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{tsNr}</h1>
                        <h2 className="text-xl font-bold text-slate-700 mt-2">{item.name}</h2>
                        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                            {item.abteilung && (
                                <Badge variant="outline" className="px-4 py-1.5 rounded-xl font-bold text-sm">{item.abteilung}</Badge>
                            )}
                            <StatusBadge status={item.status} className="px-4 py-1.5 text-sm rounded-xl" />
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-3 py-1.5 rounded-xl">
                                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                Nur Lesezugriff
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates */}
                <Card className="border-2 border-border shadow-sm rounded-2xl">
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Termine &amp; Fristen
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                            {dateFields.map((d) => (
                                <div key={d.label} className="flex flex-col items-center text-center gap-1">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{d.label}</span>
                                    <span className="text-sm font-black text-foreground leading-none">{d.value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Location */}
                {locationFields.length > 0 && (
                    <Card className="border-2 border-border shadow-sm rounded-2xl">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Standort
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-2">
                                {locationFields.map(f => (
                                    <div key={f.label} className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{f.label}</span>
                                        <span className="text-sm font-bold text-foreground">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bemerkung */}
                {item.bemerkung && (
                    <Card className="border-2 border-border shadow-sm rounded-2xl md:col-span-2">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Bemerkung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground leading-relaxed italic">{item.bemerkung}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Positionen */}
                {item._positionen?.length > 0 && (
                    <Card className="border-2 border-border shadow-sm rounded-2xl md:col-span-2">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ListTodo className="h-3 w-3" /> Positionen ({item._positionen.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {item._positionen.map((pos: any) => (
                                    <div key={pos.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-primary w-16 shrink-0">{pos.posNummer || '—'}</span>
                                            <span className="text-sm font-bold text-foreground">{pos.name}</span>
                                        </div>
                                        <StatusBadge status={pos.status} className="scale-75 origin-right" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
