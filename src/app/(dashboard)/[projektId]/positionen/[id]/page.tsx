'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Position, Unterposition, Teilsystem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, FileSpreadsheet, ListTodo, Printer, Share2, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import DokumentePanel from '@/components/shared/DokumentePanel';
import { TrackingTimeline } from '@/components/shared/TrackingTimeline';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function PositionDetailPage() {
    const { id, projektId } = useParams() as { id: string, projektId: string };
    const searchParams = useSearchParams();
    const { can, role } = usePermissions();
    const isReadOnly = searchParams.get('mode') === 'readOnly' || !can('update');
    const [position, setPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [unterpositionen, setUnterpositionen] = useState<Unterposition[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const posData = await PositionService.getPositionById(id);
                if (posData) {
                    const [subPosData, tsData] = await Promise.all([
                        SubPositionService.getUnterpositionen(id),
                        SubsystemService.getTeilsystemById(posData.teilsystemId)
                    ]);
                    setPosition(posData);
                    setUnterpositionen(subPosData);
                    setTeilsystem(tsData);
                }
            } catch (error) {
                console.error("Failed to load position data", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!position) return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="text-red-500 font-bold">Position nicht gefunden</div>
            <p className="text-sm text-muted-foreground">Die gesuchte Position existiert in der aktuellen Datenbank nicht.</p>
            <Button variant="outline" onClick={() => router.push(`/${projektId}/positionen`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
            </Button>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Navigation */}
            <div className="flex justify-end gap-3 shrink-0">
                <Button variant="secondary" size="sm" className="font-bold h-9 text-xs bg-background text-foreground hover:bg-muted border border-border shadow-sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Zurück
                </Button>
            </div>

            {/* STICKY HEADER - MATCHING TS STYLE */}
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md pt-2 pb-4 -mx-2 px-2">
                <div className="bg-card p-6 rounded-2xl shadow-sm border-2 border-border flex items-center justify-between transition-all">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="space-y-1">
                            {teilsystem && (
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                                    <Badge variant="outline" className="h-5 text-[10px] font-black border-primary/30 bg-primary/5 text-primary">
                                        TS {(teilsystem.teilsystemNummer || '').replace(/^ts\s?/i, '')}
                                    </Badge>
                                    <span className="text-xs font-bold text-muted-foreground">{teilsystem.name}</span>
                                </div>
                            )}
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">POSITION</span>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black text-foreground tracking-tight select-none">POS {position.posNummer || '—'}</span>
                                <h1 className="text-3xl font-black text-foreground tracking-tight">{position.name}</h1>
                            </div>
                        </div>

                        {/* Integrated QR Code */}
                        <div className="hidden md:flex items-center gap-4 border-x border-border/50 px-8 h-16">
                            <div className="bg-white p-1.5 rounded-lg border border-border">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/position/${position.id}`}
                                    size={56}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/position/${position.id}`;
                                        const printWindow = window.open('', '', 'width=600,height=600');
                                        if (printWindow) {
                                            printWindow.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-center;height:100vh;margin:0;text-align:center;font-family:sans-serif;">
                                                <div style="padding:40px;border:2px solid #000;border-radius:20px;">
                                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />
                                                    <h1>${position.name}</h1>
                                                    <p>POS ${position.posNummer || ''}</p>
                                                </div>
                                                <script>window.onload=()=>{window.print();window.close();};</script>
                                            </body></html>`);
                                            printWindow.document.close();
                                        }
                                    }}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/position/${position.id}`;
                                        if (navigator.share) {
                                            navigator.share({ title: position.name, url });
                                        } else {
                                            navigator.clipboard.writeText(url);
                                            alert('Link kopiert!');
                                        }
                                    }}
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end gap-3">
                            <StatusBadge status={position.status} />
                            {(!isReadOnly && can('update')) && (
                                <Link href={`/${projektId}/positionen/${position.id}/edit`}>
                                    <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                                        <Edit className="h-4 w-4" />
                                        <span>Bearbeiten</span>
                                    </Button>
                                </Link>
                            )}
                            {isReadOnly && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                    Nur Lesezugriff
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Section: Split 50/50 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Details */}
                <div className="flex flex-col gap-6">
                    <Card className="shadow-sm border-2 border-border overflow-hidden h-full">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Details & Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                <div className="px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menge & Einheit</span>
                                    <p className="text-sm font-black text-foreground">{position.menge} {position.einheit}</p>
                                </div>
                                <div className="px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                                    <StatusBadge status={position.status} />
                                </div>
                                {position.planStatus && (
                                    <div className="px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan-Status</span>
                                        <Badge variant="outline" className="font-black text-xs">{position.planStatus}</Badge>
                                    </div>
                                )}
                                {position.beschichtung && (
                                    <div className="px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Beschichtung</span>
                                        <Badge variant="outline" className="font-bold text-xs">{position.beschichtung}</Badge>
                                    </div>
                                )}
                                {position.gewicht && (
                                    <div className="px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gewicht</span>
                                        <span className="text-sm font-bold">{position.gewicht} kg</span>
                                    </div>
                                )}
                                <div className="px-4 py-4 bg-slate-50/50 dark:bg-slate-900/20">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Bezeichnung</span>
                                    <p className="text-sm font-bold text-foreground">
                                        {position.name}
                                    </p>
                                </div>
                                <div className="px-4 py-4 bg-orange-50/30 dark:bg-orange-900/10 border-l-2 border-orange-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Metadaten / Details</span>
                                        <Badge variant="outline" className="text-[9px] h-4 border-orange-200 bg-orange-50 text-orange-700">IFC Extrakt</Badge>
                                    </div>
                                    <div className="text-xs text-foreground leading-relaxed font-medium space-y-2">
                                        {position.beschichtung && (
                                            <div className="flex justify-between items-center text-[10px] font-bold pb-1 border-b border-orange-100">
                                                <span className="text-orange-600 uppercase">Beschichtung:</span>
                                                <span className="bg-orange-100 px-1.5 rounded">{position.beschichtung}</span>
                                            </div>
                                        )}

                                        {(position.ifcMeta as any)?.ok || (position.ifcMeta as any)?.uk ? (
                                            <div className="flex gap-4 pb-1 border-b border-orange-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote OK</span>
                                                    <span className="text-sm font-black">{(position.ifcMeta as any).ok || '—'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote UK</span>
                                                    <span className="text-sm font-black">{(position.ifcMeta as any).uk || '—'}</span>
                                                </div>
                                            </div>
                                        ) : null}

                                        {(position.ifcMeta as any)?.dimensions ? (
                                            <div className="grid grid-cols-3 gap-2 pb-1 border-b border-orange-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase">Länge</span>
                                                    <span className="text-xs font-bold">{(position.ifcMeta as any).dimensions.length || (position as any).length || '—'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase">Breite</span>
                                                    <span className="text-xs font-bold">{(position.ifcMeta as any).dimensions.width || (position as any).width || '—'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-orange-600 uppercase">Höhe/Dicke</span>
                                                    <span className="text-xs font-bold">{(position.ifcMeta as any).dimensions.height || (position as any).height || '—'}</span>
                                                </div>
                                            </div>
                                        ) : null}

                                        {(position.ifcMeta as any)?.area || (position.ifcMeta as any)?.color ? (
                                            <div className="flex gap-4 pb-1 border-b border-orange-100">
                                                {(position.ifcMeta as any).area && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-orange-600 uppercase">Oberfläche</span>
                                                        <span className="text-xs font-bold">{(position.ifcMeta as any).area} m²</span>
                                                    </div>
                                                )}
                                                {(position.ifcMeta as any).color && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-orange-600 uppercase">Farbe</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-2 w-2 rounded-full border border-orange-200" style={{ backgroundColor: (position.ifcMeta as any).color }} />
                                                            <span className="text-xs font-bold">{(position.ifcMeta as any).color}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                        <div className="pt-1">
                                            <span className="text-[9px] font-black text-orange-600 uppercase block mb-1">METHABAU Info</span>
                                            <div className="space-y-1">
                                                {position.beschreibung?.split(' | ').map((line, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-orange-400">•</span>
                                                        <span>{line}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {position.groupingMethod && (
                                            <div className="pt-2 mt-2 border-t border-orange-200 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-orange-600 uppercase">Gruppe-Method:</span>
                                                    <span className="bg-orange-100 px-1.5 rounded">{position.groupingMethod}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-orange-600 uppercase">Gruppe-Key:</span>
                                                    <span className="bg-orange-100 px-1.5 rounded truncate max-w-[150px]">{position.groupingKey}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Dokumente & Tracking */}
                <div className="flex flex-col gap-6">
                    <Card className="shadow-sm border-2 border-border overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                📎 Dokumente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DokumentePanel
                                entityId={id}
                                entityType="position"
                                projektId={projektId}
                                readonly={isReadOnly}
                            />
                        </CardContent>
                    </Card>

                    <TrackingTimeline
                        entityId={id}
                        projektId={projektId}
                        entityType="position"
                    />
                </div>
            </div>

            {/* Bottom: Unterpositionen (Full Width) */}
            <Card className="shadow-lg border-2 border-border overflow-hidden">
                <CardHeader className="py-4 px-6 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-black flex items-center gap-3">
                        <ListTodo className="h-5 w-5 text-primary" />
                        Unterpositionen / Komponenten
                    </CardTitle>
                    {(!isReadOnly && can('create')) && (
                        <Link href={`/${projektId}/positionen/${id}/unterpositionen/erfassen`}>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 px-6 rounded-full shadow-md flex items-center gap-2 transition-all hover:scale-105">
                                <Plus className="h-4 w-4" />
                                <span>Hinzufügen</span>
                            </Button>
                        </Link>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="border-none">
                            <TableHeader className="bg-background">
                                <TableRow className="border-b-2 border-border hover:bg-transparent">
                                    <TableHead className="w-24 px-6 py-4 font-black text-foreground">Pos-Nr.</TableHead>
                                    <TableHead className="px-6 py-4 font-black text-foreground">Bezeichnung</TableHead>
                                    <TableHead className="w-32 px-6 py-4 font-black text-foreground">Menge</TableHead>
                                    <TableHead className="w-32 px-6 py-4 font-black text-foreground">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unterpositionen.length > 0 ? (
                                    unterpositionen.map((upos) => (
                                        <TableRow key={upos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50" onClick={() => router.push(`/${projektId}/unterpositionen/${upos.id}`)}>
                                            <TableCell className="px-6 py-4 font-black text-primary">{upos.posNummer || '—'}</TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-foreground">{upos.name}</TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-muted-foreground">
                                                <Badge variant="outline" className="font-black border-slate-300 bg-slate-50">{upos.menge} {upos.einheit}</Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4"><StatusBadge status={upos.status} /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                                                <FileSpreadsheet className="h-8 w-8" />
                                                <p className="text-sm font-bold uppercase tracking-wider">Keine Unterpositionen vorhanden</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="h-10" />
        </div>
    );
}
