'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SubPositionService } from '@/lib/services/subPositionService';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { LagerortService } from '@/lib/services/lagerortService';
import { ProjectService } from '@/lib/services/projectService';
import { Unterposition, Position, Teilsystem, Lagerort, Mitarbeiter } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileSpreadsheet, ListTodo, Printer, Share2, ShieldCheck, X, Download, Plus, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, getAppUrl } from '@/lib/utils';
import { getStatusBorderRing, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import Link from 'next/link';
import { ChangeHistoryPanel } from '@/components/shared/ChangeHistoryPanel';

import { QRCodeSVG } from 'qrcode.react';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { LagerortBadge } from '@/components/shared/LagerortBadge';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useProjekt } from '@/lib/context/ProjektContext';

export default function UnterpositionDetailPage() {
    const params = useParams() as { id: string, projektId?: string };
    const id = params.id;
    const [projektId, setProjektId] = useState<string>((params.projektId || '') as string);
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readOnly';
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);
    const [parentPosition, setParentPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [verantwortlicherId, setVerantwortlicherId] = useState<string>('');
    const [savingVerantwortlicher, setSavingVerantwortlicher] = useState(false);
    const { can } = usePermissions();
    const { activeProjekt } = useProjekt();
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const uposData = await SubPositionService.getUnterpositionById(id);
                if (uposData) {
                    setUnterposition(uposData);

                    const pId = (params.projektId as string) || uposData.projektId || '';
                    if (pId !== projektId) setProjektId(pId);

                    const [posData, loData, projectData] = await Promise.all([
                        PositionService.getPositionById(uposData.positionId),
                        LagerortService.getLagerorte(pId),
                        ProjectService.getProjektById(pId)
                    ]);

                    if (loData) setLagerorte(loData);
                    setProject(projectData);
                    if (posData) {
                        setParentPosition(posData);
                        const tsData = await SubsystemService.getTeilsystemById(posData.teilsystemId);
                        setTeilsystem(tsData);
                    }
                }

                // Cargar lista de Mitarbeiter
                const mitRes = await fetch('/api/data/mitarbeiter');
                if (mitRes.ok) {
                    const mitData = await mitRes.json();
                    setMitarbeiter(Array.isArray(mitData) ? mitData : []);
                }
            } catch (error) {
                console.error("Failed to load sub-position hierarchy", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, params.projektId, projektId]);

    // Sync verantwortlicherId cuando carga la unterposition
    useEffect(() => {
        if (unterposition) {
            setVerantwortlicherId(unterposition.verantwortlicherId || '');
        }
    }, [unterposition]);

    const handleVerantwortlicherChange = async (newId: string) => {
        if (savingVerantwortlicher) return;
        setSavingVerantwortlicher(true);
        setVerantwortlicherId(newId);
        try {
            const mit = mitarbeiter.find(m => m.id === newId);
            const name = mit ? `${mit.vorname} ${mit.nachname}` : '';
            await SubPositionService.updateUnterposition(id, {
                verantwortlicherId: newId || undefined,
                verantwortlicherName: name || undefined,
            } as any);
            setUnterposition(prev => prev ? { ...prev, verantwortlicherId: newId, verantwortlicherName: name } : prev);
        } catch (e) {
            console.error('Fehler beim Speichern des Verantwortlichen', e);
        } finally {
            setSavingVerantwortlicher(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!unterposition) return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="text-red-500 font-bold">Unterposition nicht gefunden (ID: {id})</div>
            <p className="text-sm text-muted-foreground">Die gesuchte Unterposition existiert in der aktuellen Datenbank nicht.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
                Seite aktualisieren
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/${projektId}/positionen/${unterposition?.positionId}`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
            </Button>
        </div>
    );

    const lagerortObj = unterposition.lagerortId ? lagerorte.find(lo => lo.id === unterposition.lagerortId) : null;
    const loBezeichnung = lagerortObj?.bezeichnung || (unterposition as any).lagerortName || unterposition.lagerortId || 'Nicht zugewiesen';
    const loPlanUrl = lagerortObj?.planUrl;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Navigation Section */}
            <div className="flex justify-between items-center -mt-2 mb-2 px-2">
                <div className="flex items-center gap-4">
                    <Link href={`/${projektId}/positionen/${unterposition.positionId}`}>
                        <Button variant="metha-orange" className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </Link>
                </div>

                {!isReadOnly && (
                    <Link href={`/${projektId}/unterpositionen/${unterposition.id}/edit`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
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
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">UNT.POS</span>
                    <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 flex-wrap">
                        {(unterposition as any).untPosNummer && (
                            <span className="text-3xl font-black text-indigo-600 tracking-tight select-none">{(unterposition as any).untPosNummer}</span>
                        )}
                        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{unterposition.name}</h1>
                        {/* Mitarbeiter inline select */}
                        {!isReadOnly && mitarbeiter.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-0 md:ml-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">Zustaendig</span>
                                <select
                                    value={verantwortlicherId}
                                    onChange={e => handleVerantwortlicherChange(e.target.value)}
                                    disabled={savingVerantwortlicher}
                                    className={cn(
                                        'h-8 px-2 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-800 text-[11px] font-bold',
                                        'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all',
                                        savingVerantwortlicher && 'opacity-60 cursor-wait'
                                    )}
                                >
                                    <option value="">— Nicht zugewiesen —</option>
                                    {mitarbeiter.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.vorname} {m.nachname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isReadOnly && unterposition.verantwortlicherName && (
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                                {unterposition.verantwortlicherName}
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
                            value={`${getAppUrl()}/share/unterposition/${id}`}
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
                    {/* Abteilung badge a la izquierda del status */}
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {unterposition.abteilung && (
                            <span className={cn(
                                'px-3 py-1 rounded-xl text-xs font-black border-b-4 shadow-sm',
                                getAbteilungColorClasses(unterposition.abteilung)
                            )}>
                                {unterposition.abteilung}
                            </span>
                        )}
                        <StatusBadge status={unterposition.status} className={cn('px-5 py-1.5 text-sm rounded-xl shadow-md border-b-4', getStatusBorderRing(unterposition.status))} />
                    </div>
                    {isReadOnly && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            Nur Lesezugriff
                        </div>
                    )}
                </div>
            </div>
            {/* TOP ROW: 3+1 cols — Details, Beschreibung, Historia | Aktionen+Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">

                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Details &amp; Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        <div className="divide-y divide-border">
                            {/* Menge destacada */}
                            <div className="px-4 py-3 flex items-center justify-between bg-primary/5">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Menge</span>
                                <span className="text-lg font-black text-primary tracking-tight">{unterposition.menge} <span className="text-sm">{unterposition.einheit}</span></span>
                            </div>
                            {unterposition.gewicht && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Gewicht</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.gewicht} kg</span>
                                </div>
                            )}
                            {/* Offen durch */}
                            <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Offen durch</span>
                                <span className="text-xs font-bold text-foreground">{(unterposition as any).createdByName || (unterposition as any).eroeffnetDurch || '—'}</span>
                            </div>
                            {/* METHABAU fields */}
                            {unterposition.teileart && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Teileart</span>
                                    <Badge variant="outline" className="font-bold text-[9px] h-5 bg-orange-50 text-orange-700 border-orange-200">{unterposition.teileart}</Badge>
                                </div>
                            )}
                            {unterposition.materialProp && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Werkstoff</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.materialProp}</span>
                                </div>
                            )}
                            {unterposition.dimensions?.laenge != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Laenge</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.dimensions.laenge} mm</span>
                                </div>
                            )}
                            {unterposition.dimensions?.breite != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Breite</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.dimensions.breite} mm</span>
                                </div>
                            )}
                            {unterposition.dimensions?.hoehe != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Hoehe</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.dimensions.hoehe} mm</span>
                                </div>
                            )}
                            {unterposition.dimensions?.blechdicke != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Blechdicke</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.dimensions.blechdicke} mm</span>
                                </div>
                            )}
                            {unterposition.dimensions?.oberflaecheGesamt != null && (
                                <div className="px-4 py-2 flex items-center justify-between hover:bg-orange-50/50 transition-colors">
                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Oberflaeche gesamt</span>
                                    <span className="text-xs font-black text-foreground">{unterposition.dimensions.oberflaecheGesamt} m²</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ListTodo className="h-3 w-3" />
                            Beschreibung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-hidden">
                        <div className="text-[10px] text-muted-foreground leading-relaxed italic whitespace-pre-wrap line-clamp-[10]">
                            {unterposition.beschreibung || 'Keine Beschreibung vorhanden.'}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Aenderungshistorie ─── */}
                <ChangeHistoryPanel entityId={id} className="border-2 border-border shadow-sm rounded-xl" />

                {/* ─── Columna derecha: Aktionen + Dokumente apilados ─── */}
                <div className="flex flex-col gap-4">
                    <Card className="border-2 border-border shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border shrink-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aktionen</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center p-5">
                            <div className="grid grid-cols-2 gap-3 w-full max-w-[220px]">
                                <Link href={`/${projektId}/lager-scan?type=unterposition&id=${id}&action=einlagerung&qr=UNTERPOSITION:${id}`}>
                                    <Button variant="outline" className="w-full h-10 border-2 border-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-4 active:border-b-2 active:translate-y-[1px]">
                                        <div className="p-0.5 bg-blue-100 dark:bg-slate-900 rounded-full">
                                            <ArrowLeft className="h-3 w-3 text-blue-600 dark:text-blue-400 rotate-[-90deg]" />
                                        </div>
                                        <span>Einlagern</span>
                                    </Button>
                                </Link>
                                <Link href={`/${projektId}/lager-scan?type=unterposition&id=${id}&action=auslagerung&qr=UNTERPOSITION:${id}`}>
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

                    {/* IFC Upload / Dokumente — aligned with Aktionen */}
                    <Card className="shadow-sm border-2 border-border overflow-hidden bg-white dark:bg-card flex-1">
                        <CardHeader className="py-2.5 px-4 bg-muted border-b border-border">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
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
                title={`${parentPosition?.name} / ${unterposition.name}`}
                subtitle={`TS ${(teilsystem?.teilsystemNummer || '').replace(/^ts\s?/i, '')}`}
                qrValue={`${getAppUrl()}/share/unterposition/${unterposition.id}`}
                countLabel="Menge"
                count={unterposition.menge}
                filePrefix=""
                id={unterposition.id}
                projectNumber={project?.projektnummer || activeProjekt?.projektnummer}
                projectName={project?.projektname || activeProjekt?.projektname}
            />
        </div >
    );
}
