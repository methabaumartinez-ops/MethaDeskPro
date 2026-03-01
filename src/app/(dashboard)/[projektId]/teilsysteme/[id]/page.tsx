'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BimViewer } from '@/components/shared/BimViewer';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { PositionService } from '@/lib/services/positionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Teilsystem, Position, Projekt, Lagerort } from '@/types';
import {
    ArrowLeft, Edit, ListTodo, Plus, FileText,
    Calendar, User as UserIcon, Clock, Link as LinkIcon,
    MapPin, Eye, Trash2, ShieldCheck, Hash, Briefcase, LayoutDashboard, Copy, ExternalLink,
    Video, Maximize2, Printer, Share2, UploadCloud, Download, X
} from 'lucide-react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import DokumentePanel from '@/components/shared/DokumentePanel';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function TeilsystemDetailPage() {
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const { can, role } = usePermissions();
    const isReadOnly = searchParams.get('mode') === 'readOnly' || !can('update');
    const canManageLager = can('manageLagerorte');
    const canViewKosten = can('viewKosten');
    const canDelete = can('delete');

    const [item, setItem] = useState<Teilsystem | null>(null);
    const [project, setProject] = useState<Projekt | null>(null);
    const [positionen, setPositionen] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [posToDelete, setPosToDelete] = useState<Position | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ts, ks, pos, lo] = await Promise.all([
                    SubsystemService.getTeilsystemById(id),
                    ProjectService.getProjektById(projektId),
                    PositionService.getPositionenByTeilsystem(id),
                    LagerortService.getLagerorte(projektId)
                ]);

                if (ts) setItem(ts);
                if (ks) setProject(ks);
                if (pos) setPositionen(pos);
                if (lo) setLagerorte(lo);
            } catch (error) {
                console.error("Failed to load details:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, projektId]);


    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    if (!item || !project) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-center font-bold text-muted-foreground">
                {!item ? `Teilsystem nicht gefunden (ID: ${id})` : `Projekt nicht gefunden (ID: ${projektId})`}
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
                Seite aktualisieren
            </Button>
            <Link href={`/${projektId}/teilsysteme`}>
                <Button variant="ghost">Zurück zur Übersicht</Button>
            </Link>
        </div>
    );

    const lagerortObj = item.lagerortId ? lagerorte.find(lo => lo.id === item.lagerortId) : null;
    const loBezeichnung = lagerortObj?.bezeichnung || (item as any).lagerortName || item.lagerortId || 'Nicht zugewiesen';
    const loPlanUrl = lagerortObj?.planUrl;

    const detailFields = [
        { label: 'System-Nr.', value: item.teilsystemNummer, icon: Hash },
        { label: 'KS / Kostenstelle', value: item.ks, icon: Briefcase },
        { label: 'Bezeichnung', value: item.name, icon: FileText },
        { label: 'Gebäude', value: (item as any).gebäude || (item.beschreibung?.match(/Gebäude: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Abschnitt', value: (item as any).abschnitt || (item.beschreibung?.match(/Abschnitt: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Geschoss', value: (item as any).geschoss || (item.beschreibung?.match(/Geschoss: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Von', value: item.eroeffnetDurch, icon: UserIcon },
        { label: 'P-Status', value: item.planStatus, icon: ListTodo, color: item.planStatus === 'fertig' ? 'text-green-600' : 'text-muted-foreground' },
        { label: 'WEMA', value: item.wemaLink, icon: LinkIcon, isLink: true },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Navigation Section */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-4">
                    <Link href={`/${projektId}/teilsysteme`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </Link>
                </div>

                {!isReadOnly && (
                    <Link href={`/${projektId}/teilsysteme/${item.id}/edit`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <Edit className="h-4 w-4" />
                            <span>Bearbeiten</span>
                        </Button>
                    </Link>
                )}
            </div>

            {/* Banner Section */}
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_1fr] items-center bg-card p-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1 w-full text-center md:text-left">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">TS {(item.teilsystemNummer || '').replace(/^ts\s?/i, '')}</span>
                        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{item.name}</h1>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:border-l border-border/50 md:pl-8 md:pr-4 h-20 justify-center">
                    <div
                        className="bg-white p-1.5 rounded-lg border border-border cursor-pointer hover:shadow-md transition-all active:scale-95"
                        onClick={() => setShowQrModal(true)}
                    >
                        <QRCodeSVG
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`}
                            size={56}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-start gap-1 md:border-r border-border/50 md:pl-4 md:pr-8 h-20 justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Lagerort</span>
                    <div className="flex items-center gap-2">
                        {loPlanUrl ? (
                            <a
                                href={loPlanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 group hover:text-orange-600 transition-colors"
                            >
                                <MapPin className="h-4 w-4 text-orange-600 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-black text-foreground group-hover:text-orange-600 underline decoration-muted-foreground/30 underline-offset-4 decoration-dotted">
                                    {loBezeichnung}
                                </span>
                            </a>
                        ) : (
                            <div
                                className="flex items-center gap-2"
                                title={item.lagerortId ? "Kein Plan hinterlegt" : undefined}
                            >
                                <MapPin className={cn("h-4 w-4", item.lagerortId ? "text-orange-600/50" : "text-slate-300")} />
                                <span className={cn("text-sm font-black", item.lagerortId ? "text-foreground" : "text-muted-foreground/40")}>
                                    {loBezeichnung}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center md:text-right flex flex-col items-center md:items-end gap-3 w-full">
                    <StatusBadge status={item.status} className="px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4 border-green-600/20 ring-4 ring-green-50/50" />
                    {isReadOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            Nur Lesezugriff
                        </div>
                    )}
                </div>
            </div>

            {/* NEW ROW: Termine, Bemerkung, Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {/* 1) Termine u. Fristen */}
                <Card className="shadow-sm border-2 border-border overflow-hidden bg-white">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Termine u. Fristen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                            {[
                                { label: 'Eroeffnet am', value: item.eroeffnetAm, color: 'text-slate-900 dark:text-orange-400' },
                                { label: 'Planabgabe', value: item.abgabePlaner, color: 'text-blue-600' },
                                { label: 'Lieferdatum', value: item.lieferfrist, color: 'text-amber-600' },
                                { label: 'Montage', value: item.montagetermin, color: 'text-green-600' },
                            ].map((d, i) => (
                                <div key={i} className="flex flex-col">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight mb-1">{d.label}</span>
                                    <span className={cn("text-xl font-black tracking-tight leading-none", d.value ? d.color : "text-muted-foreground/40")}>
                                        {d.value || '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 2) Bemerkung */}
                <Card className="shadow-sm border-2 border-primary/20 bg-orange-50/10 overflow-hidden flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-primary/5 border-b border-primary/10">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Bemerkung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                            {item.bemerkung || 'Keine Bemerkung vorhanden.'}
                        </div>
                    </CardContent>
                </Card>

                {/* 3) Actions card */}
                <Card className="shadow-lg border-2 border-orange-600/30 rounded-3xl overflow-hidden bg-white/70 backdrop-blur-xl">
                    <CardContent className="p-4 flex flex-col gap-3 items-center justify-center h-full">
                        {canViewKosten && (
                            <Link href={`/${projektId}/kosten?ts=${id}`} className="w-full max-w-[240px]">
                                <Button className="w-full h-10 border-2 border-green-400 bg-green-50/50 hover:bg-green-100/70 text-green-700 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-1 bg-white rounded-full shadow-sm">
                                        <Briefcase className="h-3.5 w-3.5 text-green-600" />
                                    </div>
                                    <span>Kosten erfassen</span>
                                </Button>
                            </Link>
                        )}

                        <div className="flex items-center gap-3 w-full max-w-[240px]">
                            <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${id}&action=einlagerung&qr=TEILSYSTEM:${id}`} className="flex-1">
                                <Button variant="outline" className="w-full h-10 border-2 border-blue-400 bg-white hover:bg-blue-50 text-blue-700 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-0.5 bg-blue-100 rounded-full">
                                        <ArrowLeft className="h-3 w-3 text-blue-600 rotate-[-90deg]" />
                                    </div>
                                    <span>Einlagern</span>
                                </Button>
                            </Link>
                            <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${id}&action=auslagerung&qr=TEILSYSTEM:${id}`} className="flex-1">
                                <Button variant="outline" className="w-full h-10 border-2 border-red-400 bg-white hover:bg-red-50 text-red-700 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-0.5 bg-red-100 rounded-full">
                                        <ArrowLeft className="h-3 w-3 text-red-600 rotate-[90deg]" />
                                    </div>
                                    <span>Auslagern</span>
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* LOWER ROW: System Details + Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* System Details (Left) */}
                <div className="lg:col-span-5 flex flex-col">
                    <Card className="shadow-sm border-2 border-border overflow-hidden flex flex-col h-full">
                        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 bg-white">
                            <div className="flex flex-col h-full divide-y divide-border">
                                {detailFields.map((field, i) => (
                                    <div key={i} className="px-4 flex-1 flex items-center justify-between hover:bg-muted/5 transition-colors min-h-[40px]">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-muted rounded-md shrink-0">
                                                <field.icon className={cn("h-3 w-3 text-muted-foreground", field.color)} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{field.label}</span>
                                        </div>
                                        <div className="text-right">
                                            {field.isLink ? (
                                                <div className="flex items-center gap-2 justify-end">
                                                    {String(field.value)?.match(/^[a-zA-Z]:\\/) || String(field.value)?.startsWith('\\\\') ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 px-1.5 text-[8px] font-black uppercase text-primary hover:bg-primary/10 flex items-center gap-1"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(String(field.value) || '');
                                                                alert('Pfad kopiert!');
                                                            }}
                                                        >
                                                            <Copy className="h-2 w-2" />
                                                            Copy
                                                        </Button>
                                                    ) : (
                                                        <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary truncate max-w-[120px] hover:underline flex items-center gap-1">
                                                            <span>Link</span>
                                                            <ExternalLink className="h-2 w-2" />
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={cn("text-[10px] font-bold text-foreground", field.color)}>
                                                    {field.value || '—'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Model Viewer (Right) */}
                <div className="lg:col-span-7 flex flex-col">
                    <div className="flex-1 min-h-[500px] relative group shadow-xl border-4 border-orange-600/10 rounded-[2rem] overflow-hidden bg-slate-900/5 ring-4 ring-orange-600/5">
                        {/* Custom Viewer Overlay */}
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                            <div className="bg-orange-600 text-white p-2 rounded-xl shadow-lg ring-4 ring-orange-600/20">
                                <Video className="h-4 w-4" />
                            </div>
                            <Badge className="bg-white/95 backdrop-blur-md text-slate-800 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">
                                Model Viewer
                            </Badge>
                        </div>

                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border-none hover:bg-white text-slate-600">
                                <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl bg-white/90 backdrop-blur-md shadow-sm border-none hover:bg-white text-slate-600">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <BimViewer modelName={`${item.name}${!item.ifcUrl ? '.ifc' : ''}`} modelUrl={item.ifcUrl} />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Zugehörige Positionen Table */}
            <Card className="shadow-lg border-2 border-border overflow-hidden rounded-3xl">
                <CardHeader className="border-b border-border flex flex-row justify-between items-center py-4 bg-muted/30 px-6">
                    <CardTitle className="text-lg flex items-center gap-2 font-black">
                        <ListTodo className="h-5 w-5 text-primary" />
                        Zugehörige Positionen
                    </CardTitle>
                    {(!isReadOnly && can('create')) && (
                        <Link href={`/${projektId}/teilsysteme/${id}/positionen/erfassen`}>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9 px-6 rounded-full shadow-md flex items-center gap-2 transition-all hover:scale-105">
                                <Plus className="h-4 w-4" />
                                <span>Position hinzufügen</span>
                            </Button>
                        </Link>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {positionen.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table className="border-none rounded-none">
                                <TableHeader className="bg-background">
                                    <TableRow className="border-b-2 border-border">
                                        <TableHead className="w-24 pl-6 font-black text-foreground uppercase text-[10px] tracking-widest">Pos-Nr.</TableHead>
                                        <TableHead className="font-black text-foreground uppercase text-[10px] tracking-widest">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-foreground uppercase text-[10px] tracking-widest">Menge</TableHead>
                                        <TableHead className="font-black text-foreground uppercase text-[10px] tracking-widest">Status</TableHead>
                                        {!isReadOnly && <TableHead className="text-right pr-6 font-black text-foreground uppercase text-[10px] tracking-widest">Aktionen</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positionen.map((pos) => (
                                        <TableRow key={pos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50" onClick={() => router.push(`/${projektId}/positionen/${pos.id}`)}>
                                            <TableCell className="font-black text-primary py-4 pl-6">{pos.posNummer || '—'}</TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-foreground">{pos.name}</span>
                                                    {pos.beschreibung && (
                                                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[400px]" title={pos.beschreibung}>
                                                            {pos.beschreibung.replace(/ \| /g, ' • ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-muted-foreground">
                                                <Badge variant="outline" className="font-black h-6 px-2">{pos.menge} {pos.einheit}</Badge>
                                            </TableCell>
                                            <TableCell><StatusBadge status={pos.status} /></TableCell>
                                            {!isReadOnly && (
                                                <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-1">
                                                        <Link href={`/${projektId}/positionen/${pos.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-background hover:shadow-sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/${projektId}/positionen/${pos.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm",
                                                                !canDelete && "hidden"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPosToDelete(pos);
                                                                setConfirmOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <ListTodo className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-sm font-bold text-muted-foreground">Keine Positionen für dieses Teilsystem erfasst.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bottom Section: Dokumente (Full Width) */}
            <Card className="shadow-sm border-2 border-border rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-border py-4 px-6 bg-muted/30">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dokumente & Pläne
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Laden...</div>}>
                        <DokumentePanel entityId={id} entityType="teilsystem" projektId={projektId} readonly={isReadOnly} />
                    </React.Suspense>
                </CardContent>
            </Card>

            {/* Teilsystem QR Modal */}
            <ItemQrModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title={item.name}
                subtitle={`TS ${(item.teilsystemNummer || '').replace(/^ts\s?/i, '')}`}
                qrValue={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`}
                countLabel="Anzahl Positionen"
                count={positionen.length}
                filePrefix="TS"
                id={item.id}
            />

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={async () => {
                    if (!posToDelete) return;
                    try {
                        await PositionService.deletePosition(posToDelete.id);
                        setPositionen(prev => prev.filter(p => p.id !== posToDelete.id));
                    } catch (error) {
                        console.error("Failed to delete position:", error);
                        alert("Fehler beim Löschen der Position.");
                    }
                }}
                title="Position löschen"
                description={`Sind Sie sicher, dass Sie "${posToDelete?.name}" permanent löschen möchten?`}
            />
        </div>
    );
}
