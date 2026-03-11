'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerbewegungService } from '@/lib/services/lagerbewegungService';
import { BestellService } from '@/lib/services/bestellService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { PositionService } from '@/lib/services/positionService';
import { Lagerort, Lagerbewegung, MaterialBestellung, Teilsystem, Position } from '@/types';
import {
    Warehouse, Package, ArrowDownToLine, ArrowUpFromLine, MapPin, Clock, Truck, AlertTriangle,
    Plus, ChevronUp, ChevronDown, ArrowRightLeft, History, BarChart3, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { toast } from '@/lib/toast';

type DashboardTab = 'uebersicht' | 'eingang' | 'ausgang' | 'bewegungen';

export default function WerkhofLagerPage() {
    const { projektId } = useParams<{ projektId: string }>();
    const { currentUser } = useProjekt();

    const [activeTab, setActiveTab] = useState<DashboardTab>('uebersicht');
    const [loading, setLoading] = useState(true);

    // Data
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [bewegungen, setBewegungen] = useState<Lagerbewegung[]>([]);
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);
    const [teilsysteme, setTeilsysteme] = useState<Teilsystem[]>([]);
    const [positionen, setPositionen] = useState<Position[]>([]);

    // Forms
    const [showEingangForm, setShowEingangForm] = useState(false);
    const [showAusgangForm, setShowAusgangForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [eingangForm, setEingangForm] = useState({
        entityType: 'position' as 'position' | 'unterposition',
        entityId: '',
        nachLagerortId: '',
        bemerkung: '',
    });

    const [ausgangForm, setAusgangForm] = useState({
        entityType: 'position' as 'position' | 'unterposition',
        entityId: '',
        vonLagerortId: '',
        nachLagerortId: '',
        bemerkung: '',
    });

    useEffect(() => {
        loadAll();
    }, [projektId]);

    async function loadAll() {
        setLoading(true);
        try {
            const [lo, bew, best, ts] = await Promise.all([
                LagerortService.getLagerorte(projektId),
                LagerbewegungService.getLagerbewegungen({ projektId }),
                BestellService.getBestellungen(projektId),
                SubsystemService.getTeilsysteme(projektId),
            ]);
            // Load all positions, then filter to this project's TS
            const allPos = await PositionService.getPositionen();
            const tsIds = new Set(ts.map(t => t.id));
            const pos = allPos.filter(p => p.teilsystemId && tsIds.has(p.teilsystemId));
            setLagerorte(lo);
            setBewegungen(bew);
            setBestellungen(best);
            setTeilsysteme(ts);
            setPositionen(pos);
        } catch (err) {
            console.error('Lager: load error', err);
        } finally {
            setLoading(false);
        }
    }

    // KPIs
    const totalLagerorte = lagerorte.length;
    const totalBewegungen = bewegungen.length;
    const einlagerungen = bewegungen.filter(b => b.typ === 'einlagerung').length;
    const auslagerungen = bewegungen.filter(b => b.typ === 'auslagerung').length;
    const offeneBestellungen = bestellungen.filter(b => b.status !== 'versendet' && b.status !== 'geliefert').length;

    // Resolve entity name
    function resolveEntityName(entityId: string, entityType: string): string {
        if (entityType === 'position') {
            const pos = positionen.find(p => p.id === entityId);
            return pos ? pos.name : entityId.slice(0, 8);
        }
        const ts = teilsysteme.find(t => t.id === entityId);
        return ts ? `${ts.teilsystemNummer} ${ts.name}` : entityId.slice(0, 8);
    }

    // Resolve lagerort name
    function resolveLagerortName(id?: string): string {
        if (!id) return '—';
        const lo = lagerorte.find(l => l.id === id);
        return lo ? lo.bezeichnung : id.slice(0, 8);
    }

    // Submit Eingang
    async function submitEingang(e: React.FormEvent) {
        e.preventDefault();
        if (!eingangForm.entityId || !eingangForm.nachLagerortId) return;
        setSaving(true);
        try {
            await LagerbewegungService.registriereBewegung({
                entityType: eingangForm.entityType,
                entityId: eingangForm.entityId,
                nachLagerortId: eingangForm.nachLagerortId,
                typ: 'einlagerung',
                durchgefuehrtVon: currentUser?.id || 'system',
                durchgefuehrtVonName: currentUser ? `${currentUser.vorname} ${currentUser.nachname}` : 'System',
                projektId,
                bemerkung: eingangForm.bemerkung || undefined,
            });
            toast.success('Einlagerung erfasst');
            setEingangForm({ entityType: 'position', entityId: '', nachLagerortId: '', bemerkung: '' });
            setShowEingangForm(false);
            await loadAll();
        } catch {
            toast.error('Fehler bei Einlagerung');
        } finally {
            setSaving(false);
        }
    }

    // Submit Ausgang
    async function submitAusgang(e: React.FormEvent) {
        e.preventDefault();
        if (!ausgangForm.entityId || !ausgangForm.nachLagerortId) return;
        setSaving(true);
        try {
            await LagerbewegungService.registriereBewegung({
                entityType: ausgangForm.entityType,
                entityId: ausgangForm.entityId,
                vonLagerortId: ausgangForm.vonLagerortId || undefined,
                nachLagerortId: ausgangForm.nachLagerortId,
                typ: 'auslagerung',
                durchgefuehrtVon: currentUser?.id || 'system',
                durchgefuehrtVonName: currentUser ? `${currentUser.vorname} ${currentUser.nachname}` : 'System',
                projektId,
                bemerkung: ausgangForm.bemerkung || undefined,
            });
            toast.success('Auslagerung erfasst');
            setAusgangForm({ entityType: 'position', entityId: '', vonLagerortId: '', nachLagerortId: '', bemerkung: '' });
            setShowAusgangForm(false);
            await loadAll();
        } catch {
            toast.error('Fehler bei Auslagerung');
        } finally {
            setSaving(false);
        }
    }

    // Position options for selects
    const entityOptions = [
        { label: '— Element waehlen —', value: '' },
        ...positionen.map(p => ({ label: `Pos: ${p.name}`, value: p.id })),
    ];

    const lagerortOptions = [
        { label: '— Lagerort waehlen —', value: '' },
        ...lagerorte.map(l => ({ label: l.bezeichnung, value: l.id })),
    ];

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Warehouse}
                title="Lager Dashboard"
                backHref={`/${projektId}/werkhof`}
                showBackButton
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Lagerorte</p>
                        </div>
                        <p className="text-2xl font-black text-foreground">{totalLagerorte}</p>
                    </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Einlagerungen</p>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">{einlagerungen}</p>
                    </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" />
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Auslagerungen</p>
                        </div>
                        <p className="text-2xl font-black text-red-600">{auslagerungen}</p>
                    </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Bewegungen</p>
                        </div>
                        <p className="text-2xl font-black text-foreground">{totalBewegungen}</p>
                    </CardContent>
                </Card>
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck className="h-3.5 w-3.5 text-orange-600" />
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Offene Bestellungen</p>
                        </div>
                        <p className="text-2xl font-black text-orange-600">{offeneBestellungen}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
                {([
                    { key: 'uebersicht' as const, label: 'Uebersicht', icon: BarChart3 },
                    { key: 'eingang' as const, label: 'Materialeingang', icon: ArrowDownToLine },
                    { key: 'ausgang' as const, label: 'Materialausgang', icon: ArrowUpFromLine },
                    { key: 'bewegungen' as const, label: 'Bewegungshistorie', icon: History },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all uppercase tracking-wider',
                            activeTab === tab.key
                                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== UEBERSICHT TAB ===== */}
            {activeTab === 'uebersicht' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lagerorte Grid */}
                    <Card className="border-2 border-border shadow-sm dark:bg-card">
                        <CardHeader className="border-b bg-muted/30 py-3 px-6">
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Lagerorte
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">{totalLagerorte}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {lagerorte.length === 0 ? (
                                <div className="py-12 text-center">
                                    <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-muted-foreground">Keine Lagerorte definiert</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                                    {lagerorte.map(lo => {
                                        const itemCount = bewegungen.filter(b => b.nachLagerortId === lo.id && b.typ === 'einlagerung').length;
                                        return (
                                            <div key={lo.id} className="px-5 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <MapPin className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-foreground">{lo.bezeichnung}</p>
                                                        {lo.bereich && (
                                                            <p className="text-[10px] text-muted-foreground font-bold">{lo.bereich}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-black">
                                                    {itemCount} Eingaenge
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Offene Bestellungen Quick View */}
                    <Card className="border-2 border-border shadow-sm dark:bg-card">
                        <CardHeader className="border-b bg-muted/30 py-3 px-6">
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <Truck className="h-4 w-4 text-orange-600" />
                                Offene Bestellungen
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1 border-orange-200 bg-orange-50 text-orange-700">{offeneBestellungen}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {offeneBestellungen === 0 ? (
                                <div className="py-12 text-center">
                                    <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-muted-foreground">Keine offenen Bestellungen</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                                    {bestellungen
                                        .filter(b => b.status !== 'versendet' && b.status !== 'geliefert')
                                        .slice(0, 10)
                                        .map(b => (
                                            <div key={b.id} className="px-5 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-foreground">{b.containerBez}</p>
                                                    <p className="text-[10px] text-muted-foreground font-bold">
                                                        {b.items.length} Positionen · {b.bestelltVon}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm",
                                                    b.status === 'angefragt' ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                    b.status === 'in_bearbeitung' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                    b.status === 'bereit' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                    "bg-slate-100 text-slate-600 border-slate-200"
                                                )}>
                                                    {b.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Letzte Bewegungen */}
                    <Card className="border-2 border-border shadow-sm dark:bg-card lg:col-span-2">
                        <CardHeader className="border-b bg-muted/30 py-3 px-6">
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <History className="h-4 w-4 text-primary" />
                                Letzte Bewegungen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {bewegungen.length === 0 ? (
                                <div className="py-12 text-center">
                                    <ArrowRightLeft className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-muted-foreground">Keine Lagerbewegungen vorhanden</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-black">Zeitpunkt</TableHead>
                                            <TableHead className="font-black">Typ</TableHead>
                                            <TableHead className="font-black">Element</TableHead>
                                            <TableHead className="font-black">Lagerort</TableHead>
                                            <TableHead className="font-black">Durchgefuehrt von</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bewegungen.slice(0, 8).map(b => (
                                            <TableRow key={b.id} className="hover:bg-muted/30">
                                                <TableCell className="font-bold text-sm">
                                                    {new Date(b.zeitpunkt).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                                        b.typ === 'einlagerung' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                        b.typ === 'auslagerung' ? "bg-red-50 text-red-700 border-red-200" :
                                                        "bg-blue-50 text-blue-700 border-blue-200"
                                                    )}>
                                                        {b.typ === 'einlagerung' ? 'Eingang' : b.typ === 'auslagerung' ? 'Ausgang' : 'Umlagerung'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-bold text-sm">{resolveEntityName(b.entityId, b.entityType)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{resolveLagerortName(b.nachLagerortId)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{b.durchgefuehrtVonName || b.durchgefuehrtVon}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ===== EINGANG TAB ===== */}
            {activeTab === 'eingang' && (
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-black flex items-center gap-2">
                            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                            Materialeingang
                        </CardTitle>
                        <Button onClick={() => setShowEingangForm(!showEingangForm)} size="sm" className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700">
                            {showEingangForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            Einlagerung erfassen
                        </Button>
                    </CardHeader>

                    {showEingangForm && (
                        <div className="border-b border-border bg-emerald-50/30 p-6">
                            <form onSubmit={submitEingang} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Select
                                    label="Element *"
                                    value={eingangForm.entityId}
                                    onChange={e => setEingangForm(s => ({ ...s, entityId: e.target.value }))}
                                    options={entityOptions}
                                    required
                                />
                                <Select
                                    label="Ziel-Lagerort *"
                                    value={eingangForm.nachLagerortId}
                                    onChange={e => setEingangForm(s => ({ ...s, nachLagerortId: e.target.value }))}
                                    options={lagerortOptions}
                                    required
                                />
                                <Input
                                    label="Bemerkung"
                                    value={eingangForm.bemerkung}
                                    onChange={e => setEingangForm(s => ({ ...s, bemerkung: e.target.value }))}
                                    placeholder="Optional..."
                                />
                                <div className="md:col-span-3 flex justify-end gap-3">
                                    <Button type="button" variant="ghost" onClick={() => setShowEingangForm(false)}>Abbrechen</Button>
                                    <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Speichert...' : 'Einlagern'}</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <CardContent className="p-0">
                        {(() => {
                            const eingaenge = bewegungen.filter(b => b.typ === 'einlagerung');
                            return eingaenge.length === 0 ? (
                                <div className="py-16 text-center">
                                    <ArrowDownToLine className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-muted-foreground">Keine Einlagerungen vorhanden</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-black">Zeitpunkt</TableHead>
                                            <TableHead className="font-black">Element</TableHead>
                                            <TableHead className="font-black">Lagerort</TableHead>
                                            <TableHead className="font-black">Durchgefuehrt von</TableHead>
                                            <TableHead className="font-black">Bemerkung</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {eingaenge.map(b => (
                                            <TableRow key={b.id} className="hover:bg-muted/30">
                                                <TableCell className="font-bold text-sm">
                                                    {new Date(b.zeitpunkt).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="font-bold">{resolveEntityName(b.entityId, b.entityType)}</TableCell>
                                                <TableCell className="text-muted-foreground">{resolveLagerortName(b.nachLagerortId)}</TableCell>
                                                <TableCell className="text-muted-foreground">{b.durchgefuehrtVonName || '—'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{b.bemerkung || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* ===== AUSGANG TAB ===== */}
            {activeTab === 'ausgang' && (
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-black flex items-center gap-2">
                            <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                            Materialausgang
                        </CardTitle>
                        <Button onClick={() => setShowAusgangForm(!showAusgangForm)} size="sm" className="font-bold gap-2 bg-red-600 hover:bg-red-700 text-white">
                            {showAusgangForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            Auslagerung erfassen
                        </Button>
                    </CardHeader>

                    {showAusgangForm && (
                        <div className="border-b border-border bg-red-50/30 p-6">
                            <form onSubmit={submitAusgang} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="Element *"
                                    value={ausgangForm.entityId}
                                    onChange={e => setAusgangForm(s => ({ ...s, entityId: e.target.value }))}
                                    options={entityOptions}
                                    required
                                />
                                <Select
                                    label="Von Lagerort"
                                    value={ausgangForm.vonLagerortId}
                                    onChange={e => setAusgangForm(s => ({ ...s, vonLagerortId: e.target.value }))}
                                    options={lagerortOptions}
                                />
                                <Select
                                    label="Ziel-Lagerort *"
                                    value={ausgangForm.nachLagerortId}
                                    onChange={e => setAusgangForm(s => ({ ...s, nachLagerortId: e.target.value }))}
                                    options={lagerortOptions}
                                    required
                                />
                                <Input
                                    label="Bemerkung"
                                    value={ausgangForm.bemerkung}
                                    onChange={e => setAusgangForm(s => ({ ...s, bemerkung: e.target.value }))}
                                    placeholder="Optional..."
                                />
                                <div className="md:col-span-2 flex justify-end gap-3">
                                    <Button type="button" variant="ghost" onClick={() => setShowAusgangForm(false)}>Abbrechen</Button>
                                    <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">{saving ? 'Speichert...' : 'Auslagern'}</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    <CardContent className="p-0">
                        {(() => {
                            const ausgaenge = bewegungen.filter(b => b.typ === 'auslagerung');
                            return ausgaenge.length === 0 ? (
                                <div className="py-16 text-center">
                                    <ArrowUpFromLine className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-muted-foreground">Keine Auslagerungen vorhanden</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-black">Zeitpunkt</TableHead>
                                            <TableHead className="font-black">Element</TableHead>
                                            <TableHead className="font-black">Von</TableHead>
                                            <TableHead className="font-black">Nach</TableHead>
                                            <TableHead className="font-black">Durchgefuehrt von</TableHead>
                                            <TableHead className="font-black">Bemerkung</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ausgaenge.map(b => (
                                            <TableRow key={b.id} className="hover:bg-muted/30">
                                                <TableCell className="font-bold text-sm">
                                                    {new Date(b.zeitpunkt).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="font-bold">{resolveEntityName(b.entityId, b.entityType)}</TableCell>
                                                <TableCell className="text-muted-foreground">{resolveLagerortName(b.vonLagerortId)}</TableCell>
                                                <TableCell className="text-muted-foreground">{resolveLagerortName(b.nachLagerortId)}</TableCell>
                                                <TableCell className="text-muted-foreground">{b.durchgefuehrtVonName || '—'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{b.bemerkung || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* ===== BEWEGUNGEN TAB ===== */}
            {activeTab === 'bewegungen' && (
                <Card className="border-2 border-border shadow-sm dark:bg-card">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6">
                        <CardTitle className="text-base font-black flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" />
                            Alle Lagerbewegungen
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">{totalBewegungen}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {bewegungen.length === 0 ? (
                            <div className="py-16 text-center">
                                <ArrowRightLeft className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm font-bold text-muted-foreground">Keine Lagerbewegungen vorhanden</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="font-black">Zeitpunkt</TableHead>
                                        <TableHead className="font-black">Typ</TableHead>
                                        <TableHead className="font-black">Entitaet</TableHead>
                                        <TableHead className="font-black">Element</TableHead>
                                        <TableHead className="font-black">Von</TableHead>
                                        <TableHead className="font-black">Nach</TableHead>
                                        <TableHead className="font-black">Von</TableHead>
                                        <TableHead className="font-black">Bemerkung</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bewegungen.map(b => (
                                        <TableRow key={b.id} className="hover:bg-muted/30">
                                            <TableCell className="font-bold text-sm">
                                                {new Date(b.zeitpunkt).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                                    b.typ === 'einlagerung' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    b.typ === 'auslagerung' ? "bg-red-50 text-red-700 border-red-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                                )}>
                                                    {b.typ === 'einlagerung' ? 'Eingang' : b.typ === 'auslagerung' ? 'Ausgang' : 'Umlagerung'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-black uppercase text-muted-foreground">{b.entityType}</TableCell>
                                            <TableCell className="font-bold">{resolveEntityName(b.entityId, b.entityType)}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{resolveLagerortName(b.vonLagerortId)}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{resolveLagerortName(b.nachLagerortId)}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{b.durchgefuehrtVonName || '—'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{b.bemerkung || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
