'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FleetService } from '@/lib/services/fleetService';
import { FahrzeugKategorie, FahrzeugStatus } from '@/types';
import { ArrowLeft, Save, Car, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const KATEGORIE_OPTIONS = [
    { label: 'Kategorie wählen...', value: '' },
    { label: 'Scherenbühne', value: 'scherenbuehne' },
    { label: 'Teleskopbühne', value: 'teleskopbuehne' },
    { label: 'Vertikalmastbühne', value: 'vertikalmastbuehne' },
    { label: 'Mauerbühne', value: 'mauerbuehne' },
    { label: 'Teleskop Frontlader', value: 'teleskop_frontlader' },
    { label: 'Kleinbagger', value: 'kleinbagger' },
    { label: 'Baggerlader', value: 'baggerlader' },
    { label: 'Raupendumper', value: 'raupendumper' },
    { label: 'Minikran', value: 'minikran' },
    { label: 'Turmdrehkran', value: 'turmdrehkran' },
    { label: 'Sonstiges', value: 'sonstiges' },
];

const STATUS_OPTIONS = [
    { label: 'Verfügbar', value: 'verfuegbar' },
    { label: 'Reserviert', value: 'reserviert' },
    { label: 'In Wartung', value: 'in_wartung' },
    { label: 'Außer Betrieb', value: 'ausser_betrieb' },
];

const ANTRIEB_OPTIONS = [
    { label: 'Antrieb wählen...', value: '' },
    { label: 'Elektrisch', value: 'elektrisch' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Elektro / Diesel', value: 'Elektro / Diesel' },
];

export default function FahrzeugErfassenPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        bezeichnung: '',
        kategorie: '' as FahrzeugKategorie | '',
        inventarnummer: '',
        fabrikat: '',
        typ: '',
        seriennummer: '',
        farbe: '',
        kennzeichen: '',
        plattformhoehe: '',
        masse: '',
        leistung: '',
        gewicht: '',
        nutzlast: '',
        antrieb: '',
        baujahr: '',
        spezHinweis: '',
        kaufjahr: '',
        geprueftBis: '',
        abgaswartung: '',
        status: 'verfuegbar' as FahrzeugStatus,
        bemerkung: '',
        imageUrl: '',
        reichweite: '',
        gruppe: '',
        standort: '',
    });

    const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        if (!form.bezeichnung || !form.kategorie || !form.inventarnummer) return;
        setLoading(true);
        setError(null);

        try {
            await FleetService.createFahrzeug({
                bezeichnung: form.bezeichnung,
                kategorie: form.kategorie as FahrzeugKategorie,
                inventarnummer: form.inventarnummer,
                fabrikat: form.fabrikat || undefined,
                typ: form.typ || undefined,
                seriennummer: form.seriennummer || undefined,
                farbe: form.farbe || undefined,
                kennzeichen: form.kennzeichen || undefined,
                plattformhoehe: form.plattformhoehe || undefined,
                masse: form.masse || undefined,
                leistung: form.leistung || undefined,
                gewicht: form.gewicht || undefined,
                nutzlast: form.nutzlast || undefined,
                antrieb: form.antrieb || undefined,
                baujahr: form.baujahr ? parseInt(form.baujahr) : undefined,
                spezHinweis: form.spezHinweis || undefined,
                kaufjahr: form.kaufjahr || undefined,
                geprueftBis: form.geprueftBis || undefined,
                abgaswartung: form.abgaswartung || undefined,
                status: form.status,
                bemerkung: form.bemerkung || undefined,
                imageUrl: form.imageUrl || undefined,
                reichweite: form.reichweite || undefined,
                gruppe: form.gruppe || undefined,
                standort: form.standort || undefined,
            });
            router.push('/fuhrpark');
        } catch (err) {
            console.error('Error creating fahrzeug:', err);
            setError('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/fuhrpark">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Neue Maschine erfassen</h1>
                    <p className="text-muted-foreground font-medium mt-1">Bühne oder Baumaschine zum Fuhrpark hinzufügen.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-primary" />
                        Stammdaten
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Row 1: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Bezeichnung *" placeholder="z.B. Scherenbühne" value={form.bezeichnung} onChange={e => update('bezeichnung', e.target.value)} />
                        <Select label="Kategorie *" options={KATEGORIE_OPTIONS} value={form.kategorie} onChange={e => update('kategorie', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Inventar-Nr. *" placeholder="z.B. 4010 01" value={form.inventarnummer} onChange={e => update('inventarnummer', e.target.value)} />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Maschinenfoto</label>
                            <div className="flex gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="flex-1"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                update('imageUrl', reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                {form.imageUrl && (
                                    <div className="h-10 w-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                                        <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Manufacturer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Fabrikat" placeholder="z.B. Genie" value={form.fabrikat} onChange={e => update('fabrikat', e.target.value)} />
                        <Input label="Typ" placeholder="z.B. GS-3246" value={form.typ} onChange={e => update('typ', e.target.value)} />
                        <Input label="Serien-Nr." placeholder="" value={form.seriennummer} onChange={e => update('seriennummer', e.target.value)} />
                    </div>

                    {/* Row 3: Appearance & ID */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Farbe" placeholder="z.B. Blau" value={form.farbe} onChange={e => update('farbe', e.target.value)} />
                        <Input label="Kennzeichen" placeholder="z.B. TG 2265" value={form.kennzeichen} onChange={e => update('kennzeichen', e.target.value)} />
                        <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={e => update('status', e.target.value)} />
                    </div>

                    {/* Separator */}
                    <div className="border-t border-slate-200 dark:border-slate-800" />

                    {/* Row 4: Technical */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Plattformhöhe / Ausladung" placeholder="z.B. 9.75m" value={form.plattformhoehe} onChange={e => update('plattformhoehe', e.target.value)} />
                        <Input label="Masse (LxBxH)" placeholder="z.B. 2.41x1.17x2.39" value={form.masse} onChange={e => update('masse', e.target.value)} />
                        <Input label="Leistung" placeholder="z.B. 29.5 kW" value={form.leistung} onChange={e => update('leistung', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Gewicht" placeholder="z.B. 2812 kg" value={form.gewicht} onChange={e => update('gewicht', e.target.value)} />
                        <Input label="Nutzlast" placeholder="z.B. 310 kg" value={form.nutzlast} onChange={e => update('nutzlast', e.target.value)} />
                        <Select label="Antrieb" options={ANTRIEB_OPTIONS} value={form.antrieb} onChange={e => update('antrieb', e.target.value)} />
                    </div>

                    {/* Separator */}
                    <div className="border-t border-slate-200 dark:border-slate-800" />

                    {/* Row 5: Dates & Maintenance */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Baujahr" placeholder="z.B. 2008" type="number" value={form.baujahr} onChange={e => update('baujahr', e.target.value)} />
                        <Input label="Kaufjahr" placeholder="z.B. 2019" value={form.kaufjahr} onChange={e => update('kaufjahr', e.target.value)} />
                        <Input label="Geprüft bis" placeholder="z.B. 03.2025" value={form.geprueftBis} onChange={e => update('geprueftBis', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Abgaswartung" placeholder="z.B. bis 03.2026" value={form.abgaswartung} onChange={e => update('abgaswartung', e.target.value)} />
                        <Input label="Reichweite" placeholder="z.B. 7.50m" value={form.reichweite} onChange={e => update('reichweite', e.target.value)} />
                        <Input label="Standort" placeholder="z.B. Werkhof Beringen" value={form.standort} onChange={e => update('standort', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Gruppe / Typisierung" placeholder="z.B. Scherenbühne elektr." value={form.gruppe} onChange={e => update('gruppe', e.target.value)} />
                        <Input label="Spez. Hinweis" placeholder="z.B. Weissrad, Russpartikelfilter" value={form.spezHinweis} onChange={e => update('spezHinweis', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <Input label="Bemerkung" placeholder="Optional" value={form.bemerkung} onChange={e => update('bemerkung', e.target.value)} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Link href="/fuhrpark">
                            <Button variant="ghost" disabled={loading}>Abbrechen</Button>
                        </Link>
                        <Button
                            onClick={handleSave}
                            className="font-bold shadow-lg shadow-primary/20"
                            disabled={!form.bezeichnung || !form.kategorie || !form.inventarnummer || loading}
                        >
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Maschine speichern
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
