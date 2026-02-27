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
import { Teilsystem, Position, Projekt } from '@/types';
import {
    ArrowLeft, Edit, ListTodo, Plus, FileText,
    Calendar, User as UserIcon, Clock, Link as LinkIcon,
    MapPin, Eye, Trash2, ShieldCheck, Hash, Briefcase, LayoutDashboard, Copy, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Share2, UploadCloud } from 'lucide-react';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
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

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ts, ks, pos] = await Promise.all([
                    SubsystemService.getTeilsystemById(id),
                    ProjectService.getProjektById(projektId),
                    PositionService.getPositionenByTeilsystem(id)
                ]);

                if (ts) setItem(ts);
                if (ks) setProject(ks);
                if (pos) setPositionen(pos);
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

    const detailFields = [
        { label: 'System-Nr.', value: item.teilsystemNummer, icon: Hash },
        { label: 'KS / Kostenstelle', value: item.ks, icon: Briefcase },
        { label: 'Bezeichnung', value: item.name, icon: FileText },
        { label: 'Gebäude', value: (item as any).gebäude || (item.beschreibung?.match(/Gebäude: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Abschnitt', value: (item as any).abschnitt || (item.beschreibung?.match(/Abschnitt: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Geschoss', value: (item as any).geschoss || (item.beschreibung?.match(/Geschoss: (.*?)(?: \||$)/)?.[1]), icon: MapPin },
        { label: 'Eröffnet am', value: item.eroeffnetAm, icon: Calendar },
        { label: 'Von', value: item.eroeffnetDurch, icon: UserIcon },
        { label: 'Montage', value: item.montagetermin, icon: Clock, color: 'text-orange-600' },
        { label: 'Frist (Wochen)', value: item.lieferfrist, icon: Clock },
        { label: 'Plan-Abgabe', value: item.abgabePlaner, icon: Calendar },
        { label: 'P-Status', value: item.planStatus, icon: ListTodo, color: item.planStatus === 'fertig' ? 'text-green-600' : 'text-muted-foreground' },
        { label: 'WEMA', value: item.wemaLink, icon: LinkIcon, isLink: true },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Project Context Header (Compact) */}
            {/* Project Context Header (Compact) */}
            {/* Project Context Header (Compact) */}
            {/* Navigation Buttons */}
            <div className="flex justify-end items-center gap-3 mb-4">
                <Link href={`/${projektId}/teilsysteme`}>
                    <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <ArrowLeft className="h-4 w-4" />
                        Zurück
                    </Button>
                </Link>
                {!isReadOnly && (
                    <Link href={`/${projektId}/teilsysteme/${item.id}/edit`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <Edit className="h-4 w-4" />
                            <span>Bearbeiten</span>
                        </Button>
                    </Link>
                )}
            </div>

            {/* Top Section: Details & BIM */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: System Details (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Header Card */}
                    <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black text-foreground tracking-tight select-none">TS {(item.teilsystemNummer || '').replace(/^ts\s?/i, '')}</span>
                                <h1 className="text-3xl font-black text-foreground tracking-tight">{item.name}</h1>
                            </div>
                        </div>

                        {/* Integrated QR Code */}
                        <div className="hidden md:flex items-center gap-4 border-x border-border/50 px-8 h-16">
                            <div className="bg-white p-1.5 rounded-lg border border-border">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`}
                                    size={56}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`;
                                        const printWindow = window.open('', '', 'width=600,height=600');
                                        if (printWindow) {
                                            printWindow.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-center;height:100vh;margin:0;text-align:center;font-family:sans-serif;">
                                                <div style="padding:40px;border:2px solid #000;border-radius:20px;">
                                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />
                                                    <h1>${item.name}</h1>
                                                    <p>TS ${item.teilsystemNummer || ''}</p>
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
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`;
                                        if (navigator.share) {
                                            navigator.share({ title: item.name, url });
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

                        <div className="text-right flex flex-col items-end gap-3">
                            <StatusBadge status={item.status} />
                            {isReadOnly && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                    Nur Lesezugriff
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Container */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <Card className="shadow-sm border-2 border-border h-full">
                                <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                                    <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">System Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                                        {detailFields.map((field, i) => (
                                            <div key={i} className={cn(
                                                "px-4 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors border-b border-border",
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-muted rounded-md">
                                                        <field.icon className={cn("h-3 w-3 text-muted-foreground", field.color)} />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">{field.label}</span>
                                                </div>
                                                <div className="text-right">
                                                    {field.isLink ? (
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            {String(field.value)?.match(/^[a-zA-Z]:\\/) || String(field.value)?.startsWith('\\\\') ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-1.5 text-[9px] font-black uppercase text-primary hover:bg-primary/10 flex items-center gap-1"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(String(field.value) || '');
                                                                        alert('Pfad kopiert!');
                                                                    }}
                                                                >
                                                                    <Copy className="h-2.5 w-2.5" />
                                                                    Copy
                                                                </Button>
                                                            ) : (
                                                                <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-primary truncate max-w-[100px] hover:underline flex items-center gap-1">
                                                                    <span>Link</span>
                                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className={cn("text-[11px] font-bold text-foreground", field.color)}>
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

                        <div className="flex flex-col gap-6">
                            {/* IFC Metadata */}
                            {item.ifcFileName && (
                                <Card className="shadow-sm border-2 border-primary/20 bg-primary/5">
                                    <CardHeader className="py-2 px-3 bg-primary/10 border-b border-primary/10">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                            <UploadCloud className="h-3 w-3" />
                                            IFC Info
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-2">
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Datei</p>
                                            <p className="text-[10px] font-bold truncate" title={item.ifcFileName}>{item.ifcFileName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Grouping</p>
                                            <Badge variant={item.fallbackUsed ? "error" : "outline"} className="text-[8px] h-3.5 px-1 font-black">
                                                {item.fallbackUsed ? "Fallback" : "Native"}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Remark */}
                            <div className="bg-orange-50/50 dark:bg-orange-950/10 border-2 border-primary/30 p-3 rounded-lg text-xs text-muted-foreground italic h-full">
                                <span className="font-bold text-primary not-italic text-[10px] uppercase block mb-1">Bemerkung:</span>
                                {item.bemerkung || 'Keine Bemerkung.'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & BIM Viewer (1/3 width) */}
                <div className="flex flex-col gap-4">
                    {/* Reorganized Quick Actions (Matching User Image) */}
                    <Card className="shadow-sm border-2 border-orange-200 rounded-3xl overflow-hidden bg-card">
                        <CardContent className="p-6 flex flex-col gap-4 items-center">
                            {/* Row 1: Kosten & Lager-Scan */}
                            <div className="flex items-center gap-4 w-full justify-center">
                                {canViewKosten && (
                                    <Link href={`/${projektId}/kosten?ts=${id}`} className="flex-1 max-w-[160px]">
                                        <Button variant="outline" className="w-full h-14 border-2 border-green-200 bg-green-50/30 hover:bg-green-100 text-green-700 font-black uppercase text-[11px] tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[2px]">
                                            <span className="text-xl">💰</span>
                                            <span>Kosten</span>
                                        </Button>
                                    </Link>
                                )}
                                <Link href={`/${projektId}/lager-scan`} className="flex-1 max-w-[160px]">
                                    <Button variant="outline" className="w-full h-14 border-2 border-blue-200 bg-blue-50/30 hover:bg-blue-100 text-blue-700 font-black uppercase text-[11px] tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[2px]">
                                        <span className="text-xl">📷</span>
                                        <span>Lager-Scan</span>
                                    </Button>
                                </Link>
                            </div>

                            {/* Row 2: Lagerorte (Centered) */}
                            {canManageLager && (
                                <Link href={`/${projektId}/lagerorte`} className="w-full max-w-[200px]">
                                    <Button variant="outline" className="w-full h-14 border-2 border-orange-200 bg-orange-50/30 hover:bg-orange-100 text-orange-700 font-black uppercase text-[11px] tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[2px]">
                                        <span className="text-xl">📦</span>
                                        <span>Lagerorte</span>
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    {/* BIM Viewer (Red Box in reference) */}
                    <div className="h-[430px] relative group shadow-md border-2 border-orange-600 rounded-3xl overflow-hidden bg-muted/20">
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                            <div className="bg-orange-600 text-white p-2 rounded-2xl shadow-lg ring-4 ring-orange-600/20">
                                <Video className="h-5 w-5" />
                            </div>
                            <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                                Model Viewer
                            </Badge>
                        </div>

                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-sm border-none hover:bg-white text-slate-600">
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-sm border-none hover:bg-white text-slate-600">
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>

                        <BimViewer modelName={`${item.name}${!item.ifcUrl ? '.ifc' : ''}`} modelUrl={item.ifcUrl} />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Positions */}
            <Card className="shadow-lg border-2 border-border">
                <CardHeader className="border-b border-border flex flex-row justify-between items-center py-4 bg-muted/30">
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
                                        <TableHead className="w-20 font-black text-foreground">Pos-Nr.</TableHead>
                                        <TableHead className="font-black text-foreground">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-foreground">Menge</TableHead>
                                        <TableHead className="font-black text-foreground">Status</TableHead>
                                        {!isReadOnly && <TableHead className="text-right font-black text-foreground">Aktionen</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positionen.map((pos) => (
                                        <TableRow key={pos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/${projektId}/positionen/${pos.id}`)}>
                                            <TableCell className="font-black text-primary py-4">{pos.posNummer || '—'}</TableCell>
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
                                                <Badge variant="outline" className="font-black">{pos.menge} {pos.einheit}</Badge>
                                            </TableCell>
                                            <TableCell><StatusBadge status={pos.status} /></TableCell>
                                            {!isReadOnly && (
                                                <TableCell className="text-right">
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
            <Card className="shadow-sm border-2 border-border">
                <CardHeader className="border-b border-border py-3 px-4 bg-muted/30">
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Dokumente & Pläne
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <React.Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Laden...</div>}>
                        <DokumentePanel entityId={id} entityType="teilsystem" projektId={projektId} readonly={isReadOnly} />
                    </React.Suspense>
                </CardContent>
            </Card>

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
