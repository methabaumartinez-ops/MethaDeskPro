'use client';

import React, { useEffect, useState } from 'react';
import { Position, Unterposition, Teilsystem, Lagerort } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, FileSpreadsheet, ListTodo, Printer, Share2, ShieldCheck, X, Download, MapPin, BadgeDollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, getAppUrl } from '@/lib/utils';
import Link from 'next/link';
import { ChangeHistoryPanel } from '@/components/shared/ChangeHistoryPanel';

import { QRCodeSVG } from 'qrcode.react';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { ProjectService } from '@/lib/services/projectService';
import { LagerortBadge } from '@/components/shared/LagerortBadge';
import DokumentePanel from '@/components/shared/DokumentePanel';
import { TrackingTimeline } from '@/components/shared/TrackingTimeline';
import { useSearchParams, useParams, useRouter, usePathname } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { useProjekt } from '@/lib/context/ProjektContext';

export default function PositionDetailPage() {
    const params = useParams() as { id: string, projektId?: string };
    const id = params.id;
    const [projektId, setProjektId] = useState<string>((params.projektId || '') as string);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { can, role } = usePermissions();
    const isReadOnly = searchParams.get('mode') === 'readOnly' || !can('update');
    const [position, setPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [project, setProject] = useState<any>(null);
    const [unterpositionen, setUnterpositionen] = useState<Unterposition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const { activeProjekt } = useProjekt();
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const posData = await PositionService.getPositionById(id);
                if (posData) {
                    const pId = (params.projektId as string) || posData.projektId || '';
                    if (pId !== projektId) setProjektId(pId);

                    const [subPosData, tsData, loData, projectData] = await Promise.all([
                        SubPositionService.getUnterpositionen(id),
                        SubsystemService.getTeilsystemById(posData.teilsystemId),
                        LagerortService.getLagerorte(pId),
                        ProjectService.getProjektById(pId)
                    ]);
                    setPosition(posData);
                    setUnterpositionen(subPosData);
                    setTeilsystem(tsData);
                    setProject(projectData);
                    if (loData) setLagerorte(loData);
                }
            } catch (error) {
                console.error("Failed to load position data", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, params.projektId, projektId]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!position) return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="text-red-500 font-bold">Position nicht gefunden (ID: {id})</div>
            <p className="text-sm text-muted-foreground">Die gesuchte Position existiert in der aktuellen Datenbank nicht.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
                Seite aktualisieren
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${projektId}/positionen`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
            </Button>
        </div>
    );

    const lagerortObj = position.lagerortId ? lagerorte.find(lo => lo.id === position.lagerortId) : null;
    const loBezeichnung = lagerortObj?.bezeichnung || (position as any).lagerortName || position.lagerortId || 'Nicht zugewiesen';
    const loPlanUrl = lagerortObj?.planUrl;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Navigation Section */}
            <div className="flex justify-between items-center -mt-2 mb-2 px-2">
                <div className="flex items-center gap-4">
                    <Button onClick={() => router.back()} className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <ArrowLeft className="h-4 w-4" />
                        Zurück
                    </Button>
                </div>

                {!isReadOnly && (
                    <Link href={`/${projektId}/positionen/${position.id}/edit`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <Edit className="h-4 w-4" />
                            <span>Bearbeiten</span>
                        </Button>
                    </Link>
                )}
            </div>

            {/* Banner Section (Matching Teilsystem Style) */}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_1fr] items-center bg-card py-4 px-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1 w-full text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                        {teilsystem && (
                            <Badge variant="outline" className="h-5 text-[10px] font-black border-primary/30 bg-primary/5 text-primary">
                                {teilsystem.teilsystemNummer || ''}
                            </Badge>
                        )}
                    </div>
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">POSITION</span>
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">{position.posNummer || '—'}</span>
                        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{position.name}</h1>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:border-l border-border/50 md:pl-8 md:pr-4 h-16 justify-center">
                    <div
                        className="bg-white p-1.5 rounded-lg border border-border cursor-pointer hover:shadow-md transition-all active:scale-95"
                        onClick={() => setShowQrModal(true)}
                    >
                        <QRCodeSVG
                            value={`${getAppUrl()}/share/position/${id}`}
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
                                title={position.lagerortId ? "Kein Plan hinterlegt" : undefined}
                                className="transition-all"
                            >
                                <LagerortBadge lagerort={lagerortObj} fallbackName={loBezeichnung} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center md:text-right flex flex-col items-center md:items-end gap-3 w-full">
                    <StatusBadge status={position.status} className="px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4 border-green-600/20 ring-4 ring-green-50/50" />
                    {isReadOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            Nur Lesezugriff
                        </div>
                    )}
                </div>
            </div>

            {/* TOP ROW: 4 cols — shared geometry system (Termine reference) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">


                {/* ─── 1) Details & Info ─── */}
                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Details & Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <div className="divide-y divide-border">
                            <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Menge & Einheit</span>
                                <span className="text-xs font-black text-foreground">{position.menge} {position.einheit}</span>
                            </div>
                            {position.gewicht && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Gewicht</span>
                                    <span className="text-xs font-black text-foreground">{position.gewicht} kg</span>
                                </div>
                            )}
                            {position.beschichtung && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Beschichtung</span>
                                    <Badge variant="outline" className="font-bold text-[9px] h-4 bg-orange-50 text-orange-700 border-orange-200">{position.beschichtung}</Badge>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── 2) Bemerkung ─── */}
                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Bemerkung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-hidden">
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic whitespace-pre-wrap line-clamp-[10]">
                            {position.beschreibung || 'Keine Bemerkung vorhanden.'}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── 3) Aenderungshistorie ─── */}
                <ChangeHistoryPanel entityId={id} className="border-2 border-border shadow-sm rounded-xl" />

                {/* ─── 4) Aktionen ─── */}
                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aktionen</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center p-5">
                        <div className="grid grid-cols-2 gap-3 w-full max-w-[220px]">
                            {can('viewKosten') && (
                                <Link href={`/${projektId}/kosten?pos=${id}`} className="col-span-2">
                                    <Button className="w-full h-10 border-2 border-green-400 bg-green-50/50 hover:bg-green-100/70 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                        <div className="p-1 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                            <BadgeDollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span>Kosten erfassen</span>
                                    </Button>
                                </Link>
                            )}
                            <Link href={`/${projektId}/lager-scan?type=position&id=${id}&action=einlagerung&qr=POSITION:${id}`}>
                                <Button variant="outline" className="w-full h-10 border-2 border-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-0.5 bg-blue-100 dark:bg-slate-900 rounded-full">
                                        <ArrowLeft className="h-3 w-3 text-blue-600 dark:text-blue-400 rotate-[-90deg]" />
                                    </div>
                                    <span>Einlagern</span>
                                </Button>
                            </Link>
                            <Link href={`/${projektId}/lager-scan?type=position&id=${id}&action=auslagerung&qr=POSITION:${id}`}>
                                <Button variant="outline" className="w-full h-10 border-2 border-red-400 bg-white dark:bg-slate-808 hover:bg-red-50 dark:hover:bg-slate-700 text-red-700 dark:text-red-400 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-0.5 bg-red-100 dark:bg-slate-900 rounded-full">
                                        <ArrowLeft className="h-3 w-3 text-red-600 dark:text-red-400 rotate-[90deg]" />
                                    </div>
                                    <span>Auslagern</span>
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
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
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all hover:scale-105">
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


            {/* MAIN CONTENT AREA: Details on the Left, Timeline/Docs on the Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Side: Advanced IFC Metadata & IFC Details (5 cols) */}
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
                                {(position.ifcMeta as any)?.ok || (position.ifcMeta as any)?.uk ? (
                                    <div className="flex gap-4 pb-2 border-b border-border">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote OK</span>
                                            <span className="text-sm font-black text-foreground">{(position.ifcMeta as any).ok || '—'}</span>
                                        </div>
                                        <div className="flex flex-col flex-1 text-right">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhenkote UK</span>
                                            <span className="text-sm font-black text-foreground">{(position.ifcMeta as any).uk || '—'}</span>
                                        </div>
                                    </div>
                                ) : null}

                                {(position.ifcMeta as any)?.dimensions ? (
                                    <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Länge</span>
                                            <span className="text-xs font-bold text-foreground">{(position.ifcMeta as any).dimensions.length || '—'}</span>
                                        </div>
                                        <div className="flex flex-col text-center">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Breite</span>
                                            <span className="text-xs font-bold text-foreground">{(position.ifcMeta as any).dimensions.width || '—'}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-black text-orange-600 uppercase">Höhe/Dicke</span>
                                            <span className="text-xs font-bold text-foreground">{(position.ifcMeta as any).dimensions.height || '—'}</span>
                                        </div>
                                    </div>
                                ) : null}

                                {(position.ifcMeta as any)?.area || (position.ifcMeta as any)?.color ? (
                                    <div className="flex gap-4 pb-2 border-b border-border">
                                        {(position.ifcMeta as any).area && (
                                            <div className="flex flex-col flex-1">
                                                <span className="text-[9px] font-black text-orange-600 uppercase">Oberfläche</span>
                                                <span className="text-xs font-bold text-foreground">{(position.ifcMeta as any).area} m²</span>
                                            </div>
                                        )}
                                        {(position.ifcMeta as any).color && (
                                            <div className="flex flex-col flex-1 text-right">
                                                <span className="text-[9px] font-black text-orange-600 uppercase">Farbe</span>
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <div className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: (position.ifcMeta as any).color }} />
                                                    <span className="text-xs font-bold text-foreground">{(position.ifcMeta as any).color}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                <div>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase block mb-1">METHABAU Info</span>
                                    <div className="space-y-1.5">
                                        {position.beschreibung?.split(' | ').map((line, idx) => (
                                            <div key={idx} className="flex gap-2 items-baseline">
                                                <div className="h-1 w-1 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                                                <span className="text-[10px] font-medium text-foreground leading-tight">{line}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Timeline and Documents (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <TrackingTimeline
                        entityId={id}
                        projektId={projektId}
                        entityType="position"
                    />

                    <Card className="shadow-sm border-2 border-border overflow-hidden">
                        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Dokumente
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
                </div>
            </div>

            {/* Position QR Modal */}
            <ItemQrModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title={position.name}
                subtitle={`TS ${(teilsystem?.teilsystemNummer || '').replace(/^ts\s?/i, '')}`}
                qrValue={`${getAppUrl()}/share/position/${position.id}`}
                countLabel="Anzahl Unterpositionen"
                count={unterpositionen.length}
                filePrefix=""
                id={position.id}
                projectNumber={project?.projektnummer || activeProjekt?.projektnummer}
                projectName={project?.projektname || activeProjekt?.projektname}
            />
        </div>
    );
}
