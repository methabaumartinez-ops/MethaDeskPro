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
import { SupplierService } from '@/lib/services/supplierService';
import { Teilsystem, Position, Projekt, Lagerort, Lieferant, ABTEILUNGEN_CONFIG } from '@/types';
import {
    ArrowLeft, Edit, ListTodo, Plus, FileText, Truck,
    Calendar, User as UserIcon, Clock, Link as LinkIcon,
    MapPin, Eye, Trash2, ShieldCheck, Hash, Briefcase, LayoutDashboard, Copy, ExternalLink,
    Video, Maximize2, Printer, Share2, UploadCloud, Download, X
} from 'lucide-react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, cleanBemerkung, getAppUrl } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LagerortBadge } from '@/components/shared/LagerortBadge';
import DokumentePanel from '@/components/shared/DokumentePanel';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal';

export default function TeilsystemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Fallback if projektId is missing from params (Public Share view)
    const [projektId, setProjektId] = useState<string>((params?.projektId || '') as string);
    const id = params?.id as string;
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
    const [assignedLieferanten, setAssignedLieferanten] = useState<Lieferant[]>([]);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string } | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch Item First to get true projektId if missing
                const ts = await SubsystemService.getTeilsystemById(id);
                if (!ts) {
                    setLoading(false);
                    return;
                }
                setItem(ts);

                // Update projektId if it was not in params
                const pId = (params?.projektId as string) || ts.projektId;
                if (pId !== projektId) setProjektId(pId);

                // 2. Fetch other related data
                const [ks, pos, lo] = await Promise.all([
                    ProjectService.getProjektById(pId),
                    PositionService.getPositionenByTeilsystem(id),
                    LagerortService.getLagerorte(pId)
                ]);

                if (ts.lieferantenIds?.length) {
                    const allL = await SupplierService.getLieferanten();
                    setAssignedLieferanten(allL.filter(l => ts.lieferantenIds!.includes(l.id)));
                }

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
    }, [id, params?.projektId, projektId]);


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
        { label: 'KS / Kostenstelle', value: item.ks === '1' ? '1 Baumeister' : item.ks === '2' ? '2 Produktion' : item.ks === '3' ? '3 Extern' : item.ks, icon: Briefcase },
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
            <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_1fr] items-center bg-card py-4 px-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1 w-full text-center md:text-left">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-2">
                        <span className="text-xl font-black text-foreground tracking-tight select-none">{(item.teilsystemNummer || '').replace(/^ts\s?/i, '')}</span>
                        <h1 className="text-lg md:text-xl font-bold text-foreground tracking-tight">{item.name}</h1>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 md:border-l border-border/50 md:pl-8 md:pr-4 h-16 justify-center">
                    <div
                        className="bg-white p-1.5 rounded-lg border border-border cursor-pointer hover:shadow-md transition-all active:scale-95"
                        onClick={() => setShowQrModal(true)}
                    >
                        <QRCodeSVG
                            value={`${getAppUrl()}/share/teilsystem/${id}`}
                            size={56}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center md:items-start md:border-r border-border/50 md:pl-4 md:pr-8 h-16 justify-center">
                    <div className="flex items-center gap-2">
                        {loPlanUrl ? (
                            <LagerortBadge
                                lagerort={lagerortObj}
                                fallbackName={loBezeichnung}
                                onClick={() => setPreviewDoc({ url: loPlanUrl, title: `Lageplan: ${loBezeichnung}` })}
                            />
                        ) : (
                            <div
                                title={item.lagerortId ? "Kein Plan hinterlegt" : undefined}
                                className="transition-all"
                            >
                                <LagerortBadge lagerort={lagerortObj} fallbackName={loBezeichnung} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center md:text-right flex flex-col md:flex-row items-center md:items-center justify-center md:justify-end gap-3 w-full">
                    {/* Abteilung Badge */}
                    {(() => {
                        const dept = ABTEILUNGEN_CONFIG.find(a => a.name === item.abteilung);
                        return (
                            <Badge
                                variant={dept?.color as any || 'outline'}
                                className={cn(
                                    "px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4 font-bold tracking-tight transition-all",
                                    dept
                                        ? "border-primary/10 ring-4 ring-primary/5"
                                        : "border-slate-200 ring-4 ring-slate-50 text-muted-foreground/60"
                                )}
                            >
                                {item.abteilung || 'Nicht zugewiesen'}
                            </Badge>
                        );
                    })()}

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
                <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card">
                    <CardHeader className="py-2.5 px-4 bg-muted/30 border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Termine u. Fristen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                {
                                    label: 'Planabgabe',
                                    value: item.abgabePlaner,
                                    color: 'text-blue-600',
                                    status: item.planStatus
                                },
                                {
                                    label: 'Lieferdatum',
                                    value: item.lieferfrist,
                                    color: 'text-amber-600',
                                    status: item.status === 'geliefert' || item.status === 'verbaut' || item.status === 'abgeschlossen' ? 'fertig' : item.status
                                },
                                {
                                    label: 'Montage',
                                    value: item.montagetermin,
                                    color: 'text-green-600',
                                    status: item.status === 'verbaut' || item.status === 'abgeschlossen' ? 'fertig' : item.status
                                },
                            ].map((d, i) => {
                                const getStatusInfo = (s: string | undefined) => {
                                    const val = s?.toLowerCase() || 'offen';
                                    if (val === 'offen') return { text: 'Offen', cls: 'bg-green-100 text-green-700 border-green-200' };
                                    if (['in arbeit', 'in_bearbeitung', 'in_produktion', 'bestellt', 'geliefert'].includes(val))
                                        return { text: 'In Arbeit', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
                                    if (['fertig', 'verbaut', 'abgeschlossen'].includes(val))
                                        return { text: 'Fertig', cls: 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200' };
                                    return { text: s, cls: 'bg-muted text-muted-foreground border-border' };
                                };
                                const statusInfo = getStatusInfo(d.status);

                                return (
                                    <div key={i} className="flex flex-col items-center text-center">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight mb-1">{d.label}</span>
                                        <span className={cn("text-lg font-black tracking-tight leading-none mb-2", d.value ? d.color : "text-muted-foreground/40")}>
                                            {d.value || '—'}
                                        </span>
                                        {d.value ? (
                                            <div className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-black uppercase border leading-tight shadow-sm",
                                                statusInfo.cls
                                            )}>
                                                {statusInfo.text}
                                            </div>
                                        ) : (
                                            <div className="text-[9px] text-muted-foreground/30 font-bold">—</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 2) Bemerkung */}
                <Card className="shadow-sm border-2 border-primary/20 bg-orange-50/10 dark:bg-slate-900/50 overflow-hidden flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/10">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Bemerkung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                            {cleanBemerkung(item.bemerkung) || 'Keine Bemerkung vorhanden.'}
                        </div>
                    </CardContent>
                </Card>

                {/* 3) Actions card */}
                <Card className="shadow-lg border-2 border-orange-600/30 rounded-3xl overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
                    <CardContent className="p-4 flex flex-col gap-3 items-center justify-center h-full">
                        {canViewKosten && (
                            <Link href={`/${projektId}/kosten?ts=${id}`} className="w-full max-w-[240px]">
                                <Button className="w-full h-10 border-2 border-green-400 bg-green-50/50 hover:bg-green-100/70 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-1 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                        <Briefcase className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span>Kosten erfassen</span>
                                </Button>
                            </Link>
                        )}

                        <div className="flex items-center gap-3 w-full max-w-[240px]">
                            <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${id}&action=einlagerung&qr=TEILSYSTEM:${id}`} className="flex-1">
                                <Button variant="outline" className="w-full h-10 border-2 border-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                    <div className="p-0.5 bg-blue-100 dark:bg-slate-900 rounded-full">
                                        <ArrowLeft className="h-3 w-3 text-blue-600 dark:text-blue-400 rotate-[-90deg]" />
                                    </div>
                                    <span>Einlagern</span>
                                </Button>
                            </Link>
                            <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${id}&action=auslagerung&qr=TEILSYSTEM:${id}`} className="flex-1">
                                <Button variant="outline" className="w-full h-10 border-2 border-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-slate-700 text-red-700 dark:text-red-400 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
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

            {/* MAIN CONTENT AREA: Positions Table (Left) + IFC Viewer (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Positions Table (Left - 5 columns) */}
                <div className="lg:col-span-5 flex flex-col">
                    <Card className="shadow-lg border-2 border-border overflow-hidden rounded-3xl flex flex-col h-full">
                        <CardHeader className="border-b border-border flex flex-row justify-between items-center py-3 bg-muted/30 px-4">
                            <CardTitle className="text-sm flex items-center gap-2 font-black uppercase tracking-wider text-muted-foreground">
                                <ListTodo className="h-4 w-4 text-primary" />
                                Positionen
                            </CardTitle>
                            {(!isReadOnly && can('create')) && (
                                <Link href={`/${projektId}/teilsysteme/${id}/positionen/erfassen`}>
                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-7 px-3 rounded-full shadow-md flex items-center gap-1.5 transition-all hover:scale-105 text-[10px]">
                                        <Plus className="h-3 w-3" />
                                        <span>Add</span>
                                    </Button>
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            {positionen.length > 0 ? (
                                <div className="overflow-auto max-h-[440px]">
                                    <Table className="border-none rounded-none">
                                        <TableHeader className="bg-background sticky top-0 z-10">
                                            <TableRow className="border-b-2 border-border">
                                                <TableHead className="pl-4 font-black text-foreground uppercase text-[9px] tracking-widest">Nr.</TableHead>
                                                <TableHead className="font-black text-foreground uppercase text-[9px] tracking-widest">Name</TableHead>
                                                <TableHead className="font-black text-foreground uppercase text-[9px] tracking-widest">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {positionen.map((pos) => (
                                                <TableRow key={pos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50" onClick={() => router.push(`/${projektId}/positionen/${pos.id}`)}>
                                                    <TableCell className="font-black text-primary py-3 pl-4 text-[10px]">{pos.posNummer || '—'}</TableCell>
                                                    <TableCell className="py-3">
                                                        <span className="font-bold text-foreground text-[11px] block truncate max-w-[120px]">{pos.name}</span>
                                                    </TableCell>
                                                    <TableCell className="py-3"><StatusBadge status={pos.status} className="scale-75 origin-left" /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="py-10 text-center">
                                    <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Keine Positionen</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Model Viewer (Right - 7 columns) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="flex-1 min-h-[500px] relative group shadow-xl border-4 border-orange-600/10 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900/50 ring-4 ring-orange-600/5">
                        {/* Custom Viewer Overlay */}
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                            <div className="bg-orange-600 text-white p-2 rounded-xl shadow-lg ring-4 ring-orange-600/20">
                                <Video className="h-4 w-4" />
                            </div>
                            <Badge className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-800 dark:text-slate-200 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md">
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

            {/* Bottom Row: System Details (Full Width) */}
            <Card className="shadow-sm border-2 border-border overflow-hidden rounded-3xl bg-white dark:bg-card">
                <CardHeader className="py-3 px-6 bg-muted/30 border-b border-border">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">System Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {detailFields.map((field, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <field.icon className={cn("h-3.5 w-3.5 text-muted-foreground", field.color)} />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{field.label}</span>
                                </div>
                                <div className="pl-5.5 font-bold text-xs truncate">
                                    {field.isLink ? (
                                        <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                            <span>Link öffnen</span>
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                    ) : (
                                        <span className={cn(field.color)}>{field.value || '—'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                            <Truck className="h-4 w-4" />
                            Zugeordnete Lieferanten (ss)
                        </CardTitle>
                        {assignedLieferanten.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {assignedLieferanten.map(l => (
                                    <Link key={l.id} href={`/${projektId}/lieferanten/${l.id}`}>
                                        <Badge variant="info" className="px-4 py-2 rounded-xl border-2 border-border bg-muted/20 text-xs font-black flex items-center gap-2 hover:bg-muted transition-all cursor-pointer">
                                            <Truck className="h-3 w-3 text-primary" />
                                            {l.name}
                                            <ExternalLink className="h-3 w-3 opacity-40" />
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-muted-foreground/50 italic">Keine Lieferanten zugewiesen.</p>
                        )}
                    </div>
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
                qrValue={`${getAppUrl()}/share/teilsystem/${item.id}`}
                countLabel="Anzahl Positionen"
                count={positionen.length}
                filePrefix=""
                id={item.id}
                projectNumber={project?.projektnummer}
                projectName={project?.projektname}
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
                title="Position loeschen"
                description={`Sind Sie sicher, dass Sie "${posToDelete?.name}" permanent loeschen moechten?`}
            />
            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                url={previewDoc?.url || ''}
                title={previewDoc?.title || ''}
            />
        </div>
    );
}
