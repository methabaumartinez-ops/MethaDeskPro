'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lagerort } from '@/types';
import { LagerortService } from '@/lib/services/lagerortService';
import QrCodeGenerator from '@/components/shared/QrCodeGenerator';
import { Plus, QrCode, MapPin, Package, Pencil, Trash2, X, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const BEREICHE = ['Werkhof', 'Baustelle', 'Extern', 'Lager', 'Produktion'];

export default function LagerorteSeite() {
    const { projektId } = useParams<{ projektId: string }>();
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedQr, setSelectedQr] = useState<Lagerort | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({ bezeichnung: '', beschreibung: '', bereich: '' });

    useEffect(() => { loadLagerorte(); }, [projektId]);

    async function loadLagerorte() {
        setLoading(true);
        try {
            const data = await LagerortService.getLagerorte(projektId);
            setLagerorte(data);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await LagerortService.updateLagerort(editingId, { ...form, projektId });
            } else {
                await LagerortService.createLagerort({ ...form, projektId });
            }
            setForm({ bezeichnung: '', beschreibung: '', bereich: '' });
            setShowForm(false);
            setEditingId(null);
            await loadLagerorte();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Lagerort wirklich löschen?')) return;
        await LagerortService.deleteLagerort(id);
        await loadLagerorte();
    }

    function startEdit(l: Lagerort) {
        setEditingId(l.id);
        setForm({ bezeichnung: l.bezeichnung, beschreibung: l.beschreibung || '', bereich: l.bereich || '' });
        setShowForm(true);
        setSelectedQr(null);
    }

    function openCreate() {
        setEditingId(null);
        setForm({ bezeichnung: '', beschreibung: '', bereich: '' });
        setShowForm(true);
        setSelectedQr(null);
    }

    const bereichColor = (b?: string) => {
        if (b === 'Baustelle') return 'bg-orange-100 text-orange-700';
        if (b === 'Werkhof') return 'bg-blue-100 text-blue-700';
        if (b === 'Extern') return 'bg-purple-100 text-purple-700';
        if (b === 'Produktion') return 'bg-green-100 text-green-700';
        return 'bg-muted text-muted-foreground';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Lagerorte</h1>
                    <p className="text-muted-foreground font-medium mt-1">QR-Codes für Lagerorte verwalten</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/${projektId}/lager-scan`}>
                        <Button variant="outline" className="font-bold gap-2">
                            <ScanLine className="h-4 w-4" />
                            QR Scan
                        </Button>
                    </Link>
                    <Button onClick={openCreate} className="font-bold gap-2">
                        <Plus className="h-4 w-4" />
                        Lagerort hinzufügen
                    </Button>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <Card className="border-2 border-primary/30 shadow-xl">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-black">
                            {editingId ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Bezeichnung *"
                                value={form.bezeichnung}
                                onChange={e => setForm(s => ({ ...s, bezeichnung: e.target.value }))}
                                placeholder="z.B. Lager A — Regal 3"
                                required
                            />
                            <Select
                                label="Bereich"
                                value={form.bereich}
                                onChange={e => setForm(s => ({ ...s, bereich: e.target.value }))}
                                options={[
                                    { label: '— Bereich auswählen —', value: '' },
                                    ...BEREICHE.map(b => ({ label: b, value: b }))
                                ]}
                            />
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                                <textarea
                                    value={form.beschreibung}
                                    onChange={e => setForm(s => ({ ...s, beschreibung: e.target.value }))}
                                    className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                                    placeholder="Optionale Beschreibung..."
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Abbrechen</Button>
                                <Button type="submit" disabled={saving} className="font-bold min-w-[120px]">
                                    {saving ? 'Speichert...' : editingId ? 'Aktualisieren' : 'Erstellen'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* QR Modal */}
            {selectedQr && (
                <Card className="border-2 border-primary/30 shadow-xl max-w-sm mx-auto">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-black flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-primary" />
                            {selectedQr.bezeichnung}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedQr(null)} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <QrCodeGenerator
                            content={selectedQr.qrCode || `LAGERORT:${selectedQr.id}`}
                            label={selectedQr.bezeichnung}
                            size={220}
                            showDownload={true}
                        />
                        <code className="text-xs bg-muted px-3 py-1.5 rounded-lg font-mono text-muted-foreground">
                            {selectedQr.qrCode || `LAGERORT:${selectedQr.id}`}
                        </code>
                    </CardContent>
                </Card>
            )}

            {/* Lagerorte Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : lagerorte.length === 0 ? (
                <Card className="border-2 border-dashed border-border">
                    <CardContent className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="p-4 rounded-full bg-muted">
                            <Package className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <div>
                            <h3 className="font-black text-foreground">Keine Lagerorte vorhanden</h3>
                            <p className="text-sm text-muted-foreground mt-1">Erstellen Sie den ersten Lagerort für dieses Projekt.</p>
                        </div>
                        <Button onClick={openCreate} className="font-bold gap-2">
                            <Plus className="h-4 w-4" /> Ersten Lagerort erstellen
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lagerorte.map(l => (
                        <Card key={l.id} className="border-2 border-border hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
                            <CardHeader className="py-4 px-4 border-b border-border/50 bg-muted/20">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm font-black text-foreground truncate">{l.bezeichnung}</CardTitle>
                                        {l.bereich && (
                                            <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold', bereichColor(l.bereich))}>
                                                {l.bereich}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-xs font-bold shrink-0 gap-1.5"
                                        onClick={() => setSelectedQr(selectedQr?.id === l.id ? null : l)}
                                    >
                                        <QrCode className="h-3.5 w-3.5" />
                                        QR
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 py-3">
                                {l.beschreibung ? (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{l.beschreibung}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground/50 italic mb-3">Keine Beschreibung</p>
                                )}
                                <code className="block text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md truncate mb-3">
                                    {l.qrCode || `LAGERORT:${l.id}`}
                                </code>
                                <div className="flex gap-1.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex-1"
                                        onClick={() => startEdit(l)}
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Bearbeiten
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(l.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
