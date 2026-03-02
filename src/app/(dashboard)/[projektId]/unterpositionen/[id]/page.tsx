'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SubPositionService } from '@/lib/services/subPositionService';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Unterposition, Position, Teilsystem, Lagerort } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileSpreadsheet, ListTodo, Printer, Share2, ShieldCheck, X, Download, Plus, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { LagerortBadge } from '@/components/shared/LagerortBadge';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { TrackingTimeline } from '@/components/shared/TrackingTimeline';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useProjekt } from '@/lib/context/ProjektContext';

export default function UnterpositionDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readOnly';
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);
    const [parentPosition, setParentPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [loading, setLoading] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const { can } = usePermissions();
    const { activeProjekt } = useProjekt();
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const uposData = await SubPositionService.getUnterpositionById(id);
                if (uposData) {
                    const [posData, loData] = await Promise.all([
                        PositionService.getPositionById(uposData.positionId),
                        LagerortService.getLagerorte(projektId)
                    ]);
                    setUnterposition(uposData);
                    if (loData) setLagerorte(loData);
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
    }, [id, projektId]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!unterposition) return <div className="p-10 text-center text-red-500">Unterposition nicht gefunden</div>;

    const lagerortObj = unterposition.lagerortId ? lagerorte.find(lo => lo.id === unterposition.lagerortId) : null;
    const loBezeichnung = lagerortObj?.bezeichnung || (unterposition as any).lagerortName || unterposition.lagerortId || 'Nicht zugewiesen';
    const loPlanUrl = lagerortObj?.planUrl;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Navigation Section */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-4">
                    <Link href={`/${projektId}/positionen/${unterposition.positionId}`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </Link>
                </div>

                {!isReadOnly && (
                    <Link href={`/${projektId}/unterpositionen/${unterposition.id}/edit`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <Edit className="h-4 w-4" />
                            <span>Bearbeiten</span>
                        </Button>
                    </Link>
                )}
            </div>

            {/* Banner Section (Matching Position Style) */}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_1fr] items-center bg-card py-4 px-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1 w-full text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                        {teilsystem && (
                            <Badge variant="outline" className="h-5 text-[10px] font-black border-primary/30 bg-primary/5 text-primary">
                                {teilsystem.teilsystemNummer || ''}
                            </Badge>
                        )}
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] ml-2">POSITION</span>
                        {parentPosition && (
                            <Badge variant="outline" className="h-5 text-[10px] font-black border-orange-300 bg-orange-50 text-orange-600">
                                {parentPosition.posNummer || ''}
                            </Badge>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">UNTERPOSITION</span>
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">{unterposition.posNummer || '—'}</span>
                        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{unterposition.name}</h1>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:border-l border-border/50 md:pl-8 md:pr-4 h-16 justify-center">
                    <div
                        className="bg-white p-1.5 rounded-lg border border-border cursor-pointer hover:shadow-md transition-all active:scale-95"
                        onClick={() => setShowQrModal(true)}
                    >
                        <QRCodeSVG
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/unterposition/${unterposition.id}`}
                            size={56}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-start md:border-r border-border/50 md:pl-4 md:pr-8 h-16 justify-center">
                    <div className="flex items-center gap-2">
                        {loPlanUrl ? (
                            <a
                                href={loPlanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group transition-all"
                            >
                                <LagerortBadge lagerort={lagerortObj} fallbackName={loBezeichnung} />
                            </a>
                        ) : (
                            <div
                                title={unterposition.lagerortId ? "Kein Plan hinterlegt" : undefined}
                                className="transition-all"
                            >
                                <LagerortBadge lagerort={lagerortObj} fallbackName={loBezeichnung} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center md:text-right flex flex-col items-center md:items-end gap-3 w-full">
                    <StatusBadge status={unterposition.status} className="px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4 border-green-600/20 ring-4 ring-green-50/50" />
                    {isReadOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            Nur Lesezugriff
                        </div>
                    )}
                </div>
            </div>

            {/* TOP ROW: Details & Info, Bemerkung */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 items-stretch">
                <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Details & Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Menge & Einheit</span>
                                <span className="text-xs font-black text-foreground">{unterposition.menge} {unterposition.einheit}</span>
                            </div>
                            {unterposition.gewicht && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Gewicht</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.gewicht} kg</span>
                                </div>
                            )}
                            <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">IFC Typ</span>
                                <Badge variant="outline" className="font-bold text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200">{unterposition.ifcType || 'n/a'}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-2 border-primary/20 bg-orange-50/10 dark:bg-slate-900/50 overflow-hidden flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/10">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Beschreibung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                            {unterposition.beschreibung || 'Keine Beschreibung vorhanden.'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card h-full flex flex-col">
                        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] h-4 border-orange-200 bg-orange-50 text-orange-700">IFC Extrakt</Badge>
                                Technische Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            <div className="space-y-4">
                                {((unterposition as any).ifcMeta?.ok || (unterposition as any).ifcMeta?.uk) && (
                                    <div className="flex gap-4 pb-2 border-b border-border">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote OK</span>
                                            <span className="text-sm font-black text-foreground">{(unterposition as any).ifcMeta.ok || '—'}</span>
                                        </div>
                                        <div className="flex flex-col flex-1 text-right">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote UK</span>
                                            <span className="text-sm font-black text-foreground">{(unterposition as any).ifcMeta.uk || '—'}</span>
                                        </div>
                                    </div>
                                )}

                                {(unterposition as any).ifcMeta?.dimensions && (
                                    <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Länge</span>
                                            <span className="text-xs font-bold text-foreground">{(unterposition as any).ifcMeta.dimensions.length || '—'}</span>
                                        </div>
                                        <div className="flex flex-col text-center">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Breite</span>
                                            <span className="text-xs font-bold text-foreground">{(unterposition as any).ifcMeta.dimensions.width || '—'}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhe/Dicke</span>
                                            <span className="text-xs font-bold text-foreground">{(unterposition as any).ifcMeta.dimensions.height || '—'}</span>
                                        </div>
                                    </div>
                                )}

                                {((unterposition as any).ifcMeta?.area || (unterposition as any).ifcMeta?.color) && (
                                    <div className="flex gap-4 pb-2 border-b border-border">
                                        {(unterposition as any).ifcMeta.area && (
                                            <div className="flex flex-col flex-1">
                                                <span className="text-[9px] font-black text-orange-600 uppercase">Oberfläche</span>
                                                <span className="text-xs font-bold text-foreground">{(unterposition as any).ifcMeta.area} m²</span>
                                            </div>
                                        )}
                                        {(unterposition as any).ifcMeta.color && (
                                            <div className="flex flex-col flex-1 text-right">
                                                <span className="text-[9px] font-black text-orange-600 uppercase">Farbe</span>
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <div className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: (unterposition as any).ifcMeta.color }} />
                                                    <span className="text-xs font-bold text-foreground">{(unterposition as any).ifcMeta.color}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase block mb-1">Hierarchy & IDs</span>
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2 items-baseline">
                                            <div className="h-1 w-1 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                                            <span className="text-[10px] font-bold text-muted-foreground">GlobalId: </span>
                                            <span className="text-[10px] font-medium text-foreground truncate">{unterposition.ifcChildGlobalId || '—'}</span>
                                        </div>
                                        {teilsystem && (
                                            <div className="flex gap-2 items-baseline">
                                                <div className="h-1 w-1 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                                                <span className="text-[10px] font-bold text-muted-foreground">Teilsystem: </span>
                                                <span className="text-[10px] font-medium text-foreground">{teilsystem.name} ({teilsystem.teilsystemNummer})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-7 flex flex-col gap-6">
                    <TrackingTimeline
                        entityId={id}
                        projektId={projektId}
                        entityType="unterposition"
                    />

                    <Card className="shadow-sm border-2 border-border overflow-hidden">
                        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border text-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Dokumente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DocumentViewer documents={[]} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ItemQrModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title={unterposition.name}
                subtitle={`UP ${unterposition.posNummer || ''} | POS ${parentPosition?.posNummer || ''} | TS ${(teilsystem?.teilsystemNummer || '').replace(/^ts\s?/i, '')}`}
                qrValue={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/unterposition/${unterposition.id}`}
                countLabel="Menge"
                count={unterposition.menge}
                filePrefix=""
                id={unterposition.id}
                projectNumber={activeProjekt?.projektnummer}
                projectName={activeProjekt?.projektname}
            />
        </div>
    );
}
