'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SubPositionService } from '@/lib/services/subPositionService';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Unterposition, Position, Teilsystem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, UploadCloud, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';

export default function UnterpositionDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readOnly';
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);
    const [parentPosition, setParentPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const uposData = await SubPositionService.getUnterpositionById(id);
                if (uposData) {
                    setUnterposition(uposData);
                    const posData = await PositionService.getPositionById(uposData.positionId);
                    if (posData) {
                        setParentPosition(posData);
                        const tsData = await SubsystemService.getTeilsystemById(posData.teilsystemId);
                        setTeilsystem(tsData);
                    }
                }
            } catch (error) {
                console.error("Failed to load sub-position hierarchy", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!unterposition) return <div className="p-10 text-center text-red-500">Unterposition nicht gefunden</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">UNTERPOSITION</span>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">UPOS {unterposition.posNummer || '—'}</span>
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">{unterposition.name}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <StatusBadge status={unterposition.status} />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{unterposition.menge} {unterposition.einheit}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <QRCodeSection
                        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/unterposition/${unterposition.id}`}
                        title={unterposition.name}
                        subtitle={`TS: ${teilsystem?.teilsystemNummer || '—'} | POS: ${parentPosition?.posNummer || '—'} | UPOS: ${unterposition.posNummer} | ${unterposition.menge} ${unterposition.einheit}`}
                        compact={true}
                    />

                    <div className="h-12 w-[1px] bg-border mx-2" />

                    <div className="flex items-center gap-3">
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full h-9 px-6 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                        {!isReadOnly && (
                            <Link href={`/${projektId}/unterpositionen/${unterposition.id}/edit`}>
                                <Button className="font-black bg-orange-600 hover:bg-orange-700 text-white h-9 px-6 rounded-full shadow-lg shadow-orange-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <Edit className="h-4 w-4" />
                                    <span>Bearbeiten</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            Detalles de la Unterposition
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menge & Einheit</span>
                                <p className="text-xl font-bold text-foreground">{unterposition.menge} {unterposition.einheit}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                                <div><StatusBadge status={unterposition.status} /></div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Material</span>
                                <p className="text-sm font-bold text-foreground">{(unterposition as any).material || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gewicht</span>
                                <p className="text-sm font-bold text-foreground">{unterposition.gewicht || 0} kg</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Höhenkote OK</span>
                                <p className="text-sm font-black">{(unterposition as any).ifcMeta?.ok || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Höhenkote UK</span>
                                <p className="text-sm font-black">{(unterposition as any).ifcMeta?.uk || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Superficies (m²)</span>
                                <p className="text-sm font-bold">{(unterposition as any).ifcMeta?.area || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Color / Finish</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: String((unterposition as any).ifcMeta?.color || 'transparent') }} />
                                    <span className="text-xs font-bold">{(unterposition as any).ifcMeta?.color || '—'}</span>
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-4 grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Länge</span>
                                    <p className="text-xs font-bold">{(unterposition as any).ifcMeta?.dimensions?.length || '—'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Breite</span>
                                    <p className="text-xs font-bold">{(unterposition as any).ifcMeta?.dimensions?.width || '—'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Höhe</span>
                                    <p className="text-xs font-bold">{(unterposition as any).ifcMeta?.dimensions?.height || '—'}</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">IFC Typ</span>
                                <div className="text-sm font-bold flex items-center gap-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 h-5 px-1.5">{unterposition.ifcType || 'n/a'}</Badge>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">GlobalId</span>
                                <div className="text-[10px] font-mono font-bold bg-muted px-2 py-1 rounded truncate" title={unterposition.ifcChildGlobalId}>
                                    {unterposition.ifcChildGlobalId || '—'}
                                </div>
                            </div>

                            {unterposition.beschreibung && (
                                <div className="col-span-2 md:col-span-4 space-y-1">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Beschreibung / Notiz</span>
                                    <p className="text-sm font-medium italic text-muted-foreground">"{unterposition.beschreibung}"</p>
                                </div>
                            )}

                            {parentPosition && (
                                <div className="space-y-1 col-span-2 md:col-span-4 pt-2 border-t border-border/50">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hierarchy</span>
                                    <div className="flex items-center gap-2 overflow-hidden truncate">
                                        {teilsystem && (
                                            <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary shrink-0">
                                                TS: {teilsystem.teilsystemNummer || teilsystem.id}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="font-bold border-border bg-muted/30 shrink-0">
                                            POS: {parentPosition.posNummer || parentPosition.id}
                                        </Badge>
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {parentPosition.name}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-sm border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="py-3 px-4 bg-primary/10 border-b border-primary/10">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                                <UploadCloud className="h-3.5 w-3.5" />
                                IFC Raw Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                Acceda a los PropertySets originales extraídos del modelo IFC para auditoría técnica.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full font-black text-[10px] uppercase h-9 bg-white hover:bg-white/80"
                                onClick={() => {
                                    const win = window.open('', '_blank');
                                    if (win) {
                                        win.document.write(`<pre style="font-family:monospace;padding:20px;background:#f8f9fa;">${JSON.stringify(unterposition.rawPsets || {}, null, 2)}</pre>`);
                                        win.document.title = `Raw Psets: ${unterposition.name}`;
                                    }
                                }}
                            >
                                <Eye className="h-3 w-3 mr-2" />
                                Ver IFC Data (JSON)
                            </Button>
                        </CardContent>
                    </Card>

                    <DocumentViewer documents={[]} />
                </div>
            </div>
        </div>
    );
}
