'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, Map, Database } from 'lucide-react';
import { LagerortService } from '@/lib/services/lagerortService';

export default function LagerortShareView({ id }: { id: string }) {
    const [lagerort, setLagerort] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                setLoading(true);
                // La API no requiere un proyectoId obligatoriamente
                const data = await LagerortService.getLagerortById(id);
                if (isMounted) {
                    if (data) {
                        setLagerort(data);
                    } else {
                        setError('Lagerort nicht gefunden.');
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setError('Fehler beim Laden der Daten.');
                    console.error('Error fetching Lagerort:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Database className="h-10 w-10 text-primary animate-pulse" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Lade Lagerort Informationen...</p>
            </div>
        );
    }

    if (error || !lagerort) {
        return (
            <Card className="border-2 border-red-100 shadow-xl rounded-[2rem] max-w-xl mx-auto mt-10">
                <CardContent className="py-20 flex flex-col items-center text-center gap-6">
                    <div className="p-6 bg-red-50 rounded-full">
                        <Package className="h-12 w-12 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Lagerort nicht gefunden</h2>
                        <p className="text-muted-foreground mt-2 font-medium max-w-sm">
                            {error || 'Der gesuchte Lagerort konnte in der Datenbank nicht gefunden werden.'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-orange-500/10 shadow-xl rounded-[2rem] overflow-hidden max-w-2xl mx-auto">
            <CardHeader className="bg-orange-50/30 border-b border-orange-500/10 p-8 text-center pb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Package className="w-48 h-48 rotate-12" />
                </div>

                <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-lg ring-4 ring-orange-500/5 mb-6 relative z-10">
                    <Package className="h-8 w-8 text-orange-500" />
                </div>

                <div className="relative z-10">
                    <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-slate-800">
                        {lagerort.bezeichnung}
                    </CardTitle>
                    {lagerort.bereich && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-orange-500/10 shadow-sm">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="text-xs font-black uppercase text-slate-600 tracking-widest">
                                Bereich: {lagerort.bereich}
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-8">
                {lagerort.beschreibung && (
                    <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Beschreibung</h3>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                            "{lagerort.beschreibung}"
                        </p>
                    </div>
                )}

                {lagerort.planUrl && (
                    <a
                        href={lagerort.planUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 border-2 border-orange-500/20 bg-orange-50/50 hover:bg-orange-50 text-orange-600 font-black uppercase text-[12px] tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm focus:ring-4 focus:ring-orange-500/10"
                    >
                        <Map className="h-5 w-5" />
                        Lagerort-Plan ansehen
                    </a>
                )}
            </CardContent>
        </Card>
    );
}
