'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { Teilsystem, Mitarbeiter, TsStunden, TsMaterialkosten, Abteilung, ABTEILUNGEN_CONFIG } from '@/types';
import { Clock, Package2, Plus, Trash2, Download, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjekt } from '@/lib/context/ProjektContext';

const ABTEILUNGEN: Abteilung[] = ['Blechabteilung', 'Schlosserei', 'AVOR', 'Einkauf', 'Zimmerei', 'Montage', 'Planung', 'Bau'];

export default function KostenPage() {
    const { projektId } = useParams<{ projektId: string }>();
    const { currentUser } = useProjekt();
    const searchParams = useSearchParams();
    const tsFilter = searchParams.get('ts');

    const [activeTab, setActiveTab] = useState<'stunden' | 'material'>('stunden');
    const [teilsysteme, setTeilsysteme] = useState<Teilsystem[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [selectedTs, setSelectedTs] = useState(tsFilter || '');
    const [stunden, setStunden] = useState<TsStunden[]>([]);
    const [material, setMaterial] = useState<TsMaterialkosten[]>([]);
    const [loading, setLoading] = useState(true);
    const [showStundenForm, setShowStundenForm] = useState(false);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [stundenForm, setStundenForm] = useState({
        mitarbeiterId: '', datum: new Date().toISOString().split('T')[0],
        stunden: '', abteilung: '', taetigkeit: '', bemerkung: '',
    });

    // Auto-set department from user profile
    useEffect(() => {
        if (currentUser?.department && !stundenForm.abteilung && showStundenForm) {
            setStundenForm(prev => ({ ...prev, abteilung: currentUser.department as string }));
        }
    }, [currentUser, showStundenForm]);

    const [materialForm, setMaterialForm] = useState({
        bezeichnung: '', menge: '1', einheit: 'Stk', einzelpreis: '', bestelldatum: '', bemerkung: '',
    });

    useEffect(() => {
        const loadInit = async () => {
            const [ts, ma] = await Promise.all([
                SubsystemService.getTeilsysteme(projektId),
                EmployeeService.getMitarbeiter(),
            ]);
            setTeilsysteme(ts);
            setMitarbeiter(ma);
            if (tsFilter && !selectedTs) setSelectedTs(tsFilter);
            setLoading(false);
        };
        loadInit();
    }, [projektId]);

    useEffect(() => {
        if (!selectedTs) { setStunden([]); setMaterial([]); return; }
        loadKosten();
    }, [selectedTs]);

    async function loadKosten() {
        if (!selectedTs) return;
        const [s, m] = await Promise.all([
            fetch(`/api/kosten/stunden?teilsystemId=${selectedTs}`).then(r => r.ok ? r.json() : []),
            fetch(`/api/kosten/material?teilsystemId=${selectedTs}`).then(r => r.ok ? r.json() : []),
        ]);
        setStunden(s);
        setMaterial(m);
    }

    async function submitStunden(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTs) return;
        setSaving(true);
        try {
            const ma = mitarbeiter.find(m => m.id === stundenForm.mitarbeiterId);
            const deptConfig = ABTEILUNGEN.find(a => a === stundenForm.abteilung);
            const abteilungId = ABTEILUNGEN_CONFIG.find(c => c.name === stundenForm.abteilung)?.id;

            await fetch('/api/kosten/stunden', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...stundenForm,
                    stunden: parseFloat(stundenForm.stunden),
                    teilsystemId: selectedTs,
                    projektId,
                    abteilungId, // Enviar el ID del departamento
                    mitarbeiterName: ma ? `${ma.vorname} ${ma.nachname}` : stundenForm.mitarbeiterId,
                }),
            });
            setStundenForm({ mitarbeiterId: '', datum: new Date().toISOString().split('T')[0], stunden: '', abteilung: '', taetigkeit: '', bemerkung: '' });
            setShowStundenForm(false);
            await loadKosten();
        } finally {
            setSaving(false);
        }
    }

    async function submitMaterial(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTs) return;
        setSaving(true);
        try {
            await fetch('/api/kosten/material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...materialForm,
                    menge: parseFloat(materialForm.menge),
                    einzelpreis: parseFloat(materialForm.einzelpreis),
                    teilsystemId: selectedTs,
                    projektId,
                }),
            });
            setMaterialForm({ bezeichnung: '', menge: '1', einheit: 'Stk', einzelpreis: '', bestelldatum: '', bemerkung: '' });
            setShowMaterialForm(false);
            await loadKosten();
        } finally {
            setSaving(false);
        }
    }

    async function deleteStunden(id: string) {
        if (!confirm('Eintrag löschen?')) return;
        await fetch(`/api/kosten/stunden/${id}`, { method: 'DELETE' });
        await loadKosten();
    }

    async function deleteMaterial(id: string) {
        if (!confirm('Eintrag löschen?')) return;
        await fetch(`/api/kosten/material/${id}`, { method: 'DELETE' });
        await loadKosten();
    }

    function exportCsv() {
        const ts = teilsysteme.find(t => t.id === selectedTs);
        const rows: string[] = [];
        rows.push('=== STUNDEN ===');
        rows.push('Datum;Mitarbeiter;Stunden;Abteilung;Tätigkeit;Bemerkung');
        stunden.forEach(s => rows.push(
            [s.datum, s.mitarbeiterName || s.mitarbeiterId, s.stunden, s.abteilung || '', s.taetigkeit || '', s.bemerkung || ''].join(';')
        ));
        rows.push('', '=== MATERIAL ===');
        rows.push('Bezeichnung;Menge;Einheit;Einzelpreis;Gesamtpreis;Bestelldatum');
        material.forEach(m => rows.push(
            [m.bezeichnung, m.menge, m.einheit, m.einzelpreis, m.gesamtpreis || '', m.bestelldatum || ''].join(';')
        ));
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Kosten_${ts?.teilsystemNummer || selectedTs}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    const totalStunden = stunden.reduce((a, s) => a + (s.stunden || 0), 0);
    const totalMaterial = material.reduce((a, m) => a + (m.gesamtpreis || m.einzelpreis * m.menge || 0), 0);
    const cstsName = teilsysteme.find(t => t.id === selectedTs)?.name;

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Kostenerfassung</h1>
                    <p className="text-muted-foreground font-medium mt-1">Stunden und Material pro Teilsystem erfassen</p>
                </div>
                {selectedTs && (
                    <Button variant="outline" onClick={exportCsv} className="font-bold gap-2">
                        <Download className="h-4 w-4" />
                        CSV Export
                    </Button>
                )}
            </div>

            {/* Teilsystem selector */}
            <Card className="border-2 border-primary/50 shadow-md bg-primary/5">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Select
                                label="Teilsystem auswählen"
                                value={selectedTs}
                                onChange={e => setSelectedTs(e.target.value)}
                                options={[
                                    { label: '— Teilsystem wählen —', value: '' },
                                    ...teilsysteme.map(t => ({ label: `TS ${t.teilsystemNummer} — ${t.name}`, value: t.id }))
                                ]}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Totals overview */}
            {selectedTs && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Card className="border-2 border-border shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Stunden Total</p>
                            <p className="text-2xl font-black text-foreground">{totalStunden.toFixed(1)} <span className="text-sm font-bold text-muted-foreground">h</span></p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-border shadow-sm">
                        <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Material Total</p>
                            <p className="text-2xl font-black text-foreground">
                                {totalMaterial.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-muted-foreground">CHF</span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-border shadow-sm sm:col-span-1 col-span-2">
                        <CardContent className="p-4">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">Teilsystem</p>
                            <p className="text-base font-black text-foreground truncate">{cstsName || '—'}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            {selectedTs && (
                <>
                    <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
                        {(['stunden', 'material'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all uppercase tracking-wider',
                                    activeTab === tab
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                        : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                                )}
                            >
                                {tab === 'stunden' ? <Clock className="h-4 w-4" /> : <Package2 className="h-4 w-4" />}
                                {tab === 'stunden' ? 'Stunden' : 'Material'}
                                <Badge variant={activeTab === tab ? 'default' : 'outline'} className={cn("text-[10px] h-4 px-1.5 transition-colors", activeTab === tab ? "bg-white text-primary hover:bg-white" : "")}>
                                    {tab === 'stunden' ? stunden.length : material.length}
                                </Badge>
                            </button>
                        ))}
                    </div>

                    {/* STUNDEN Tab */}
                    {activeTab === 'stunden' && (
                        <Card className="border-2 border-border shadow-sm">
                            <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-black flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Stundenerfassung
                                </CardTitle>
                                <Button onClick={() => setShowStundenForm(!showStundenForm)} size="sm" className="font-bold gap-2">
                                    {showStundenForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    Erfassen
                                </Button>
                            </CardHeader>

                            {showStundenForm && (
                                <div className="border-b border-border bg-muted/10 p-6">
                                    <form onSubmit={submitStunden} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Select
                                            label="Mitarbeiter *"
                                            value={stundenForm.mitarbeiterId}
                                            onChange={e => setStundenForm(s => ({ ...s, mitarbeiterId: e.target.value }))}
                                            options={[{ label: 'Mitarbeiter wählen...', value: '' }, ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: m.id }))]}
                                            required
                                        />
                                        <Input label="Datum *" type="date" value={stundenForm.datum} onChange={e => setStundenForm(s => ({ ...s, datum: e.target.value }))} required />
                                        <Input label="Stunden *" type="number" step="0.5" min="0.5" value={stundenForm.stunden} onChange={e => setStundenForm(s => ({ ...s, stunden: e.target.value }))} placeholder="z.B. 8" required />
                                        <Select label="Abteilung" value={stundenForm.abteilung} onChange={e => setStundenForm(s => ({ ...s, abteilung: e.target.value }))} options={[{ label: '— Abteilung —', value: '' }, ...ABTEILUNGEN.map(a => ({ label: a, value: a }))]} />
                                        <Input label="Tätigkeit" value={stundenForm.taetigkeit} onChange={e => setStundenForm(s => ({ ...s, taetigkeit: e.target.value }))} placeholder="z.B. Schweissen, Montage..." />
                                        <Input label="Bemerkung" value={stundenForm.bemerkung} onChange={e => setStundenForm(s => ({ ...s, bemerkung: e.target.value }))} />
                                        <div className="md:col-span-3 flex justify-end gap-3">
                                            <Button type="button" variant="ghost" onClick={() => setShowStundenForm(false)}>Abbrechen</Button>
                                            <Button type="submit" disabled={saving}>{saving ? 'Speichert...' : 'Speichern'}</Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <CardContent className="p-0">
                                {stunden.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-muted-foreground">Keine Stundenerfassungen für dieses TS</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="font-black">Datum</TableHead>
                                                <TableHead className="font-black">Mitarbeiter</TableHead>
                                                <TableHead className="font-black text-right">Stunden</TableHead>
                                                <TableHead className="font-black">Abteilung</TableHead>
                                                <TableHead className="font-black">Tätigkeit</TableHead>
                                                <TableHead className="w-10" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stunden.map(s => (
                                                <TableRow key={s.id} className="hover:bg-muted/30">
                                                    <TableCell className="font-bold text-sm">{s.datum}</TableCell>
                                                    <TableCell className="font-bold">{s.mitarbeiterName || s.mitarbeiterId}</TableCell>
                                                    <TableCell className="font-black text-right text-primary">{s.stunden}h</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{s.abteilung || '—'}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{s.taetigkeit || '—'}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-red-600" onClick={() => deleteStunden(s.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/50 font-black">
                                                <TableCell colSpan={2} className="font-black uppercase text-xs text-muted-foreground tracking-wider">Total</TableCell>
                                                <TableCell className="font-black text-right text-primary">{totalStunden.toFixed(1)}h</TableCell>
                                                <TableCell colSpan={3} />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* MATERIAL Tab */}
                    {activeTab === 'material' && (
                        <Card className="border-2 border-border shadow-sm">
                            <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-black flex items-center gap-2">
                                    <Package2 className="h-4 w-4 text-primary" />
                                    Materialkosten
                                </CardTitle>
                                <Button onClick={() => setShowMaterialForm(!showMaterialForm)} size="sm" className="font-bold gap-2">
                                    {showMaterialForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                    Erfassen
                                </Button>
                            </CardHeader>

                            {showMaterialForm && (
                                <div className="border-b border-border bg-muted/10 p-6">
                                    <form onSubmit={submitMaterial} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <Input label="Bezeichnung *" value={materialForm.bezeichnung} onChange={e => setMaterialForm(s => ({ ...s, bezeichnung: e.target.value }))} placeholder="z.B. Stahlprofil HEA 200" required />
                                        </div>
                                        <Input label="Bestelldatum" type="date" value={materialForm.bestelldatum} onChange={e => setMaterialForm(s => ({ ...s, bestelldatum: e.target.value }))} />
                                        <Input label="Menge *" type="number" min="0.01" step="0.01" value={materialForm.menge} onChange={e => setMaterialForm(s => ({ ...s, menge: e.target.value }))} required />
                                        <Input label="Einheit" value={materialForm.einheit} onChange={e => setMaterialForm(s => ({ ...s, einheit: e.target.value }))} placeholder="Stk, m, kg..." />
                                        <Input label="Einzelpreis (CHF) *" type="number" min="0" step="0.01" value={materialForm.einzelpreis} onChange={e => setMaterialForm(s => ({ ...s, einzelpreis: e.target.value }))} placeholder="0.00" required />
                                        <div className="md:col-span-3">
                                            <Input label="Bemerkung" value={materialForm.bemerkung} onChange={e => setMaterialForm(s => ({ ...s, bemerkung: e.target.value }))} />
                                        </div>
                                        <div className="md:col-span-3 flex justify-end gap-3">
                                            <Button type="button" variant="ghost" onClick={() => setShowMaterialForm(false)}>Abbrechen</Button>
                                            <Button type="submit" disabled={saving}>{saving ? 'Speichert...' : 'Speichern'}</Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <CardContent className="p-0">
                                {material.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <Package2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-muted-foreground">Keine Materialkosten für dieses TS</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="font-black">Bezeichnung</TableHead>
                                                <TableHead className="font-black text-right">Menge</TableHead>
                                                <TableHead className="font-black text-right">Einzelpreis</TableHead>
                                                <TableHead className="font-black text-right">Gesamt</TableHead>
                                                <TableHead className="font-black">Bestelldatum</TableHead>
                                                <TableHead className="w-10" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {material.map(m => {
                                                const gesamt = m.gesamtpreis ?? m.einzelpreis * m.menge;
                                                return (
                                                    <TableRow key={m.id} className="hover:bg-muted/30">
                                                        <TableCell className="font-bold">{m.bezeichnung}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{m.menge} {m.einheit}</TableCell>
                                                        <TableCell className="text-right text-muted-foreground">{m.einzelpreis.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-black text-primary">{gesamt.toFixed(2)} CHF</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{m.bestelldatum || '—'}</TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-red-600" onClick={() => deleteMaterial(m.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            <TableRow className="bg-muted/50">
                                                <TableCell colSpan={3} className="font-black uppercase text-xs text-muted-foreground tracking-wider">Total Materialkosten</TableCell>
                                                <TableCell className="text-right font-black text-primary">{totalMaterial.toLocaleString('de-CH', { minimumFractionDigits: 2 })} CHF</TableCell>
                                                <TableCell colSpan={2} />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Empty state if no TS selected */}
            {!selectedTs && !loading && (
                <Card className="border-2 border-dashed border-border">
                    <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
                        <div className="p-4 rounded-full bg-muted">
                            <DollarSign className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <div>
                            <h3 className="font-black text-foreground">Teilsystem auswählen</h3>
                            <p className="text-sm text-muted-foreground mt-1">Wählen Sie ein Teilsystem, um die Kostenerfassung anzuzeigen.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
