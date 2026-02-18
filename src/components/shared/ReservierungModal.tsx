'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/lib/services/projectService';
import { FleetService } from '@/lib/services/fleetService';
import { EmployeeService } from '@/lib/services/employeeService';
import { Fahrzeug, FahrzeugReservierung, Projekt } from '@/types';
import { X, CalendarDays } from 'lucide-react';

interface ReservierungModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reservierung: FahrzeugReservierung) => void;
    fahrzeug?: Fahrzeug;
    projektId?: string;
}

export function ReservierungModal({ isOpen, onClose, onSave, fahrzeug, projektId }: ReservierungModalProps) {
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [fahrzeugeList, setFahrzeugeList] = useState<Fahrzeug[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [form, setForm] = useState({
        fahrzeugId: fahrzeug?.id || '',
        projektId: projektId || '',
        baustelle: '',
        reserviertAb: '',
        reserviertBis: '',
        reserviertDurch: '',
        bemerkung: '',
    });

    useEffect(() => {
        if (isOpen) {
            setLoadingData(true);
            Promise.all([
                ProjectService.getProjekte(),
                FleetService.getFahrzeuge(),
                EmployeeService.getMitarbeiter()
            ]).then(([p, f, m]) => {
                setProjekte(p);
                setFahrzeugeList(f);
                setMitarbeiter(m);
            }).catch(err => {
                console.error('Failed to load dropdown data', err);
            }).finally(() => {
                setLoadingData(false);
            });
        }
    }, [isOpen]);

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            fahrzeugId: fahrzeug?.id || prev.fahrzeugId || '',
            projektId: projektId || prev.projektId || ''
        }));
    }, [fahrzeug, projektId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fahrzeugId || !form.projektId || !form.reserviertAb || !form.reserviertBis || !form.reserviertDurch) {
            alert('Bitte füllen Sie alle Pflichtfelder aus (Projekt, Zeitrum und Name).');
            return;
        }

        // Note: ProjectService/FleetService usage here is just for data referencing
        // Actual save logic is handled by parent via onSave
        const selectedProjekt = projekte.find(p => p.id === form.projektId);
        const selectedMitarbeiter = mitarbeiter.find(m => m.id === form.reserviertDurch);

        // Construct object - ID handled by backend/service usually, but here we pass object stricture
        const newReservierung: any = {
            fahrzeugId: form.fahrzeugId,
            projektId: form.projektId,
            projektName: selectedProjekt ? `${selectedProjekt.projektnummer} – ${selectedProjekt.projektname}` : undefined,
            baustelle: selectedProjekt ? selectedProjekt.projektname : 'Unbekannt',
            reserviertAb: form.reserviertAb,
            reserviertBis: form.reserviertBis,
            reserviertDurch: selectedMitarbeiter ? `${selectedMitarbeiter.vorname} ${selectedMitarbeiter.nachname}` : form.reserviertDurch,
            bemerkung: form.bemerkung || undefined,
            // createdAt handled by DB or Service
        };
        onSave(newReservierung);
        // We don't close here, parent handles it after successful save
    };

    const projektOptions = [
        { label: 'Projekt wählen...', value: '' },
        ...projekte.map(p => ({ label: `${p.projektnummer} – ${p.projektname}`, value: p.id })),
    ];

    const fahrzeugOptions = [
        { label: 'Fahrzeug wählen...', value: '' },
        ...fahrzeugeList.map(f => ({ label: `${f.bezeichnung} (${f.inventarnummer})`, value: f.id })),
    ];

    const mitarbeiterOptions = [
        { label: 'Mitarbeiter wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: m.id })),
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white border border-slate-200 rounded-2xl shadow-strong w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Neue Reservierung</h2>
                            {fahrzeug && (
                                <p className="text-sm text-muted-foreground">{fahrzeug.bezeichnung} – {fahrzeug.inventarnummer}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {loadingData && (
                        <div className="text-center py-2 text-sm text-muted-foreground">Lade Daten...</div>
                    )}

                    {!fahrzeug && (
                        <Select
                            label="Fahrzeug"
                            options={fahrzeugOptions}
                            value={form.fahrzeugId}
                            onChange={e => setForm({ ...form, fahrzeugId: e.target.value })}
                        />
                    )}

                    <Select
                        label="Projekt"
                        options={projektOptions}
                        value={form.projektId}
                        onChange={e => setForm({ ...form, projektId: e.target.value })}
                    />

                    {/* Baustelle input removed as requested */}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Reserviert ab"
                            type="date"
                            value={form.reserviertAb}
                            onChange={e => setForm({ ...form, reserviertAb: e.target.value })}
                        />
                        <Input
                            label="Reserviert bis"
                            type="date"
                            value={form.reserviertBis}
                            onChange={e => setForm({ ...form, reserviertBis: e.target.value })}
                        />
                    </div>

                    <Select
                        label="Reserviert durch"
                        options={mitarbeiterOptions}
                        value={form.reserviertDurch}
                        onChange={e => setForm({ ...form, reserviertDurch: e.target.value })}
                    />

                    <Input
                        label="Bemerkung"
                        placeholder="Optional"
                        value={form.bemerkung}
                        onChange={e => setForm({ ...form, bemerkung: e.target.value })}
                    />

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" type="button" onClick={onClose}>
                            Abbrechen
                        </Button>
                        <Button
                            type="submit"
                            className="font-bold shadow-lg shadow-primary/20"
                            disabled={!form.fahrzeugId || !form.projektId || !form.reserviertAb || !form.reserviertBis || !form.reserviertDurch || loadingData}
                        >
                            Reservierung erstellen
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
