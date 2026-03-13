'use client';

import React, { useEffect, useState } from 'react';
import { Position, Unterposition, Teilsystem, Lagerort, Mitarbeiter } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, FileSpreadsheet, ListTodo, Printer, Share2, ShieldCheck, X, Download, MapPin, BadgeDollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, getAppUrl } from '@/lib/utils';
import { getStatusBorderRing } from '@/lib/config/statusConfig';
import Link from 'next/link';
import { ChangeHistoryPanel } from '@/components/shared/ChangeHistoryPanel';

import { QRCodeSVG } from 'qrcode.react';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { ProjectService } from '@/lib/services/projectService';
import { LagerortBadge } from '@/components/shared/LagerortBadge';
import DokumentePanel from '@/components/shared/DokumentePanel';
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
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [verantwortlicherId, setVerantwortlicherId] = useState<string>('');
    const [savingVerantwortlicher, setSavingVerantwortlicher] = useState(false);
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
                // Cargar Mitarbeiter
                const mitRes = await fetch('/api/data/mitarbeiter');
                if (mitRes.ok) {
                    const mitData = await mitRes.json();
                    setMitarbeiter(Array.isArray(mitData) ? mitData : []);
                }
            } catch (error) {
                console.error("Failed to load position data", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, params.projektId, projektId]);

    // Sync verantwortlicherId al cargar position
    React.useEffect(() => {
        if (position) setVerantwortlicherId(position.verantwortlicherId || '');
    }, [position]);

    const handleVerantwortlicherChange = async (newId: string) => {
        if (savingVerantwortlicher) return;
        setSavingVerantwortlicher(true);
        setVerantwortlicherId(newId);
        try {
            const mit = mitarbeiter.find(m => m.id === newId);
            const name = mit ? `${mit.vorname} ${mit.nachname}` : '';
            await PositionService.updatePosition(id, {
                verantwortlicherId: newId || undefined,
                verantwortlicherName: name || undefined,
            } as any);
            setPosition(prev => prev ? { ...prev, verantwortlicherId: newId, verantwortlicherName: name } : prev);
        } catch (e) {
            console.error('Fehler beim Speichern des Verantwortlichen', e);
        } finally {
            setSavingVerantwortlicher(false);
        }
    };

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
                    <Button variant="metha-orange" onClick={() => router.push(`/${projektId}/teilsysteme/${position.teilsystemId}`)} className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
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
                    <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 flex-wrap">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">{position.posNummer || '—'}</span>
                        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{position.name}</h1>
                        {!isReadOnly && mitarbeiter.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-0 md:ml-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">Zustaendig</span>
                                <select
                                    value={verantwortlicherId}
                                    onChange={e => handleVerantwortlicherChange(e.target.value)}
                                    disabled={savingVerantwortlicher}
                                    className={cn(
                                        'h-8 px-2 rounded-lg border-2 border-orange-200 bg-orange-50 text-orange-800 text-[11px] font-bold',
                                        'focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all',
                                        savingVerantwortlicher && 'opacity-60 cursor-wait'
                                    )}
                                >
                                    <option value="">— Nicht zugewiesen —</option>
                                    {mitarbeiter.map(m => (
                                        <option key={m.id} value={m.id}>{m.vorname} {m.nachname}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isReadOnly && position.verantwortlicherName && (
                            <span className="text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-lg">
                                {position.verantwortlicherName}
                            </span>
                        )}
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
                    <StatusBadge status={position.status} className={cn('px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4', getStatusBorderRing(position.status))} />
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
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
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
                            {/* ── METHABAU fields ── */}
                            {position.teileart && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Teileart</span>
                                    <Badge variant="outline" className="font-bold text-[9px] h-5 bg-orange-50 text-orange-700 border-orange-200">{position.teileart}</Badge>
                                </div>
                            )}
                            {position.materialProp && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Werkstoff</span>
                                    <span className="text-xs font-black text-foreground">{position.materialProp}</span>
                                </div>
                            )}
                            {/* IFC Dimensions from ifcMeta.dimensions */}
                            {(position.ifcMeta as any)?.dimensions?.laenge != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Laenge</span>
                                    <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.laenge} mm</span>
                                </div>
                            )}
                            {(position.ifcMeta as any)?.dimensions?.breite != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Breite</span>
                                    <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.breite} mm</span>
                                </div>
                            )}
                            {(position.ifcMeta as any)?.dimensions?.hoehe != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Hoehe</span>
                                    <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.hoehe} mm</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── 2) Bemerkung ─── */}
                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
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
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
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

            <Card className="shadow-lg border-2 border-border overflow-hidden bg-white dark:bg-card">
                <CardHeader className="py-4 px-6 bg-muted border-b border-border flex flex-row items-center justify-between">
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
                            <TableHeader className="bg-white dark:bg-card">
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
                                        <TableRow key={upos.id} className="group hover:bg-muted transition-colors cursor-pointer border-b border-border/50" onClick={() => router.push(`/${projektId}/unterpositionen/${upos.id}`)}>
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

            {/* MAIN CONTENT AREA: Details on the Left, Timeline/Docs on the Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Side: Advanced IFC Metadata & IFC Details (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card h-full flex flex-col">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] h-4 border-orange-200 bg-orange-50 text-orange-700">IFC Extrakt</Badge>
                                Technische Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            <div className="divide-y divide-border">
                                {/* Gewicht */}
                                {position.gewicht != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Gewicht</span>
                                        <span className="text-xs font-black text-foreground">{position.gewicht} kg</span>
                                    </div>
                                )}
                                {/* Werkstoff */}
                                {position.materialProp && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Werkstoff</span>
                                        <span className="text-xs font-black text-foreground">{position.materialProp}</span>
                                    </div>
                                )}
                                {/* Teileart */}
                                {position.teileart && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Teileart</span>
                                        <Badge variant="outline" className="font-bold text-[9px] h-5 bg-orange-50 text-orange-700 border-orange-200">{position.teileart}</Badge>
                                    </div>
                                )}
                                {/* IFC-Masse aus METHABAU (IFCPROPERTYSINGLEVALUE) */}
                                {(position.ifcMeta as any)?.dimensions?.laenge != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Laenge</span>
                                        <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.laenge} mm</span>
                                    </div>
                                )}
                                {(position.ifcMeta as any)?.dimensions?.breite != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Breite</span>
                                        <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.breite} mm</span>
                                    </div>
                                )}
                                {(position.ifcMeta as any)?.dimensions?.hoehe != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Hoehe</span>
                                        <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.hoehe} mm</span>
                                    </div>
                                )}
                                {(position.ifcMeta as any)?.dimensions?.blechdicke != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Blechdicke</span>
                                        <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.blechdicke} mm</span>
                                    </div>
                                )}
                                {(position.ifcMeta as any)?.dimensions?.oberflaecheGesamt != null && (
                                    <div className="py-2 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-600 uppercase tracking-tight">Oberflaeche ges.</span>
                                        <span className="text-xs font-black text-foreground">{(position.ifcMeta as any).dimensions.oberflaecheGesamt}</span>
                                    </div>
                                )}
                                {/* Fallback: No IFC data at all */}
                                {!position.gewicht && !position.materialProp && !position.teileart &&
                                    !(position.ifcMeta as any)?.dimensions && (
                                    <div className="py-8 text-center text-[10px] text-muted-foreground/60 italic">
                                        Keine IFC-Daten vorhanden
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Timeline and Documents (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
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
