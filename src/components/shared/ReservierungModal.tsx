'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/lib/services/projectService';
import { FleetService } from '@/lib/services/fleetService';
import { EmployeeService } from '@/lib/services/employeeService';
import { Fahrzeug, FahrzeugReservierung, Projekt } from '@/types';
import { X, CalendarDays, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjekt } from '@/lib/context/ProjektContext';

interface ReservierungModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reservierung: FahrzeugReservierung) => void;
    fahrzeug?: Fahrzeug;
    projektId?: string;
    defaultMachineId?: string;
}

export function ReservierungModal({ isOpen, onClose, onSave, fahrzeug, projektId, defaultMachineId }: ReservierungModalProps) {
    const { currentUser } = useProjekt();
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [fahrzeugeList, setFahrzeugeList] = useState<Fahrzeug[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
    const [existingReservierungen, setExistingReservierungen] = useState<FahrzeugReservierung[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const [form, setForm] = useState({
        fahrzeugId: fahrzeug?.id || defaultMachineId || '',
        projektId: projektId || '',
        baustelle: '',
        reserviertAb: '',
        reserviertBis: '',
        reserviertDurch: currentUser?.email?.split('@')[0] || '',
        bemerkung: '',
    });

    useEffect(() => {
        if (isOpen) {
            setLoadingData(true);
            Promise.all([
                ProjectService.getProjekte(),
                FleetService.getFahrzeuge(),
                EmployeeService.getMitarbeiter(),
                FleetService.getReservierungen()
            ]).then(([p, f, m, r]) => {
                setProjekte(p);
                setFahrzeugeList(f);
                setMitarbeiter(m);
                setExistingReservierungen(r);
            }).catch(err => {
                console.error('Failed to load dropdown data', err);
            }).finally(() => {
                setLoadingData(false);
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setForm(prev => ({
                ...prev,
                fahrzeugId: fahrzeug?.id || defaultMachineId || prev.fahrzeugId || '',
                projektId: projektId || prev.projektId || '',
                reserviertDurch: prev.reserviertDurch || currentUser?.email?.split('@')[0] || ''
            }));
        }
    }, [isOpen, fahrzeug, projektId, defaultMachineId, currentUser]);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const isDateConflict = (start: string, end: string, vehicleId: string) => {
        if (!start || !end || !vehicleId) return false;

        const newStart = new Date(start);
        const newEnd = new Date(end);

        return existingReservierungen.some(res => {
            if (res.fahrzeugId !== vehicleId) return false;

            const resStart = new Date(res.reserviertAb);
            const resEnd = new Date(res.reserviertBis);

            return (newStart <= resEnd && newEnd >= resStart);
        });
    };

    const hasConflict = isDateConflict(form.reserviertAb, form.reserviertBis, form.fahrzeugId);

    // Calculate technical today and the min reservation date (3 days from now)
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const minResDateObj = new Date();
    minResDateObj.setDate(now.getDate() + 3);
    const minReservationDate = minResDateObj.toISOString().split('T')[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!form.fahrzeugId || !form.projektId || !form.reserviertAb || !form.reserviertBis || !form.reserviertDurch) {
            setErrorMsg('Bitte füllen Sie alle Pflichtfelder aus (Projekt, Zeitraum und Name).');
            return;
        }

        if (hasConflict) {
            setErrorMsg('Das Fahrzeug ist in diesem Zeitraum bereits reserviert.');
            return;
        }

        if (form.reserviertAb < minReservationDate) {
            setErrorMsg(`Reservierungen sind erst ab dem ${new Date(minResDateObj).toLocaleDateString('de-CH')} möglich (mindestens 3 Tage im Voraus).`);
            return;
        }

        if (form.reserviertBis < form.reserviertAb) {
            setErrorMsg('Das Enddatum muss nach dem Startdatum liegen.');
            return;
        }

        const selectedProjekt = projekte.find(p => p.id === form.projektId);
        const selectedMitarbeiter = mitarbeiter.find(m => m.id === form.reserviertDurch);

        const newReservierung: any = {
            fahrzeugId: form.fahrzeugId,
            projektId: form.projektId,
            projektName: selectedProjekt ? `${selectedProjekt.projektnummer} – ${selectedProjekt.projektname}` : undefined,
            baustelle: selectedProjekt ? selectedProjekt.projektname : 'Unbekannt',
            reserviertAb: form.reserviertAb,
            reserviertBis: form.reserviertBis,
            reserviertDurch: selectedMitarbeiter ? `${selectedMitarbeiter.vorname} ${selectedMitarbeiter.nachname}` : form.reserviertDurch,
            bemerkung: form.bemerkung || undefined,
        };
        onSave(newReservierung);
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
        <div className="fixed inset-0 z-[150] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative bg-white dark:bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl border-2 border-primary/20 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner border-2 border-primary/10">
                            <CalendarDays className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1 block leading-none">FLOTTENMANAGEMENT</span>
                            <h2 className="text-2xl font-black text-foreground tracking-tighter leading-none">Reservierung</h2>
                            {fahrzeug && (
                                <p className="text-xs font-bold text-muted-foreground mt-1.5 opacity-60 uppercase">{fahrzeug.bezeichnung} – {fahrzeug.inventarnummer}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    {loadingData && (
                        <div className="text-center py-4 text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                            Daten werden geladen...
                        </div>
                    )}

                    <div className="space-y-6">
                        {!fahrzeug && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Fahrzeug</label>
                                <Select
                                    options={fahrzeugOptions}
                                    value={form.fahrzeugId}
                                    onChange={e => setForm({ ...form, fahrzeugId: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Baustelle / Projekt</label>
                            <Select
                                options={projektOptions}
                                value={form.projektId}
                                onChange={e => setForm({ ...form, projektId: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Ab Datum</label>
                                <Input
                                    type="date"
                                    min={minReservationDate}
                                    value={form.reserviertAb}
                                    onChange={e => setForm({ ...form, reserviertAb: e.target.value })}
                                    className={cn(
                                        "h-12 rounded-xl text-sm font-bold border-2",
                                        hasConflict ? "border-red-500 focus-visible:ring-red-500" : "border-border/60"
                                    )}
                                />
                                <p className="text-[9px] font-black text-muted-foreground/60 px-1 uppercase tracking-wider">Min. 3 Tage Vorlauf erforderlich</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Bis Datum</label>
                                <Input
                                    type="date"
                                    min={form.reserviertAb || minReservationDate}
                                    value={form.reserviertBis}
                                    onChange={e => setForm({ ...form, reserviertBis: e.target.value })}
                                    className={cn(
                                        "h-12 rounded-xl text-sm font-bold border-2",
                                        hasConflict ? "border-red-500 focus-visible:ring-red-500" : "border-border/60"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Reserviert durch</label>
                            <Select
                                options={mitarbeiterOptions}
                                value={form.reserviertDurch}
                                onChange={e => setForm({ ...form, reserviertDurch: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Bemerkung</label>
                            <Input
                                placeholder="Zusatzinformationen..."
                                value={form.bemerkung}
                                onChange={e => setForm({ ...form, bemerkung: e.target.value })}
                                className="h-12 rounded-xl text-sm font-bold border-2 border-border/60"
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                                <p className="text-xs font-black text-red-600 uppercase tracking-tight leading-tight">
                                    {errorMsg}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Abbrechen
                        </button>
                        <Button
                            type="submit"
                            className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                            disabled={!form.fahrzeugId || !form.projektId || !form.reserviertAb || !form.reserviertBis || !form.reserviertDurch || loadingData || hasConflict}
                        >
                            Reservierung Erstellen
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
