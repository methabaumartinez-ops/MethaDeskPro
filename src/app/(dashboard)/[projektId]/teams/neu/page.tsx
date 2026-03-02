'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamService } from '@/lib/services/teamService';
import { ABTEILUNGEN_CONFIG, Mitarbeiter } from '@/types';
import Link from 'next/link';

export default function TeamCreatePage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser } = useProjekt();
    const router = useRouter();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [abteilung, setAbteilung] = useState('');
    const [color, setColor] = useState('#f97316'); // Default orange
    const [availableMitarbeiter, setAvailableMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<{ mitarbeiterId: string, role: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMitarbeiter = async () => {
            try {
                const res = await fetch(`/api/data/mitarbeiter`);
                if (res.ok) {
                    setAvailableMitarbeiter(await res.json());
                }
            } catch (err) {
                console.error("Failed to load mitarbeiter", err);
            }
        };
        loadMitarbeiter();
    }, [projektId]);

    const handleToggleMember = (mitarbeiterId: string) => {
        const existing = selectedMembers.find(m => m.mitarbeiterId === mitarbeiterId);
        if (existing) {
            setSelectedMembers(selectedMembers.filter(m => m.mitarbeiterId !== mitarbeiterId));
        } else {
            setSelectedMembers([...selectedMembers, { mitarbeiterId, role: 'Mitglied' }]);
        }
    };

    const handleRoleChange = (mitarbeiterId: string, newRole: string) => {
        setSelectedMembers(selectedMembers.map(m =>
            m.mitarbeiterId === mitarbeiterId ? { ...m, role: newRole } : m
        ));
    };

    const handleSave = async () => {
        if (!name.trim()) return alert('Bitte Teamnamen eingeben');
        if (selectedMembers.length === 0) return alert('Bitte wählen Sie mindestens ein Mitglied aus.');

        setLoading(true);
        try {
            const newTeam = await TeamService.createTeam({
                projektId,
                name: name.trim(),
                description: description.trim(),
                abteilung,
                color
            });

            // Assuming we augment TeamService or use Promise.all to add members
            for (const member of selectedMembers) {
                await TeamService.addMember(newTeam.id, member.mitarbeiterId, member.role);
            }

            // Also check if any of the members missing Stundensatz and need to be updated? 
            // Cost calculation usually uses current user data, so if the user wants to set price per hour, 
            // those updates should be routed to the mitarbeiter collection. 
            // In MethaDesk, Stundensatz is a property of Mitarbeiter.

            router.push(`/${projektId}/ausfuehrung?tab=teams_aufgaben`);
        } catch (error) {
            console.error(error);
            alert('Fehler beim Speichern des Teams');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-orange-500" /> Neues Team erstellen
                    </h2>
                    <p className="text-slate-500 font-medium text-xs">Gruppiere Arbeiter für Aufgaben und Kostenerfassung.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                <Card className="md:col-span-1 shadow-sm border-2 border-primary/20 bg-orange-50/10 overflow-hidden flex flex-col">
                    <CardHeader className="py-2.5 px-4 bg-primary/5 border-b border-primary/10">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">Team Details</h3>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Team Name</label>
                            <Input
                                placeholder="z.B. Montage Team Alpha..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="font-bold border-input bg-background"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Abteilung</label>
                            <select
                                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
                                value={abteilung}
                                onChange={e => setAbteilung(e.target.value)}
                            >
                                <option value="">Gewerk / Abteilung wählen...</option>
                                {ABTEILUNGEN_CONFIG.map(abt => (
                                    <option key={abt.id} value={abt.name}>{abt.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Beschreibung / Aufgabe (optional)</label>
                            <textarea
                                className="w-full text-sm p-3 rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all resize-none min-h-[80px]"
                                placeholder="Zusätzliche Infos zum Team..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-1.5 block">Erkennungsfarbe</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    className="h-10 w-14 rounded cursor-pointer border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-slate-400">{color}</span>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Card className="md:col-span-2 shadow-sm border-2 border-border overflow-hidden flex flex-col bg-white dark:bg-card">
                    <CardHeader className="bg-muted/30 border-b pb-4 border-border shrink-0 flex flex-row justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mitglieder & Stundensatz ({selectedMembers.length})</h3>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <div className="divide-y divide-slate-100">
                            {availableMitarbeiter.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                                    Keine Mitarbeiter im Projekt gefunden.
                                </div>
                            ) : availableMitarbeiter.map(ma => {
                                const isSelected = selectedMembers.some(sm => sm.mitarbeiterId === ma.id);
                                const memberData = selectedMembers.find(sm => sm.mitarbeiterId === ma.id);

                                return (
                                    <div key={ma.id} className={cn("p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors hover:bg-slate-50", isSelected ? "bg-orange-50/30" : "")}>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleToggleMember(ma.id)}
                                                className={cn(
                                                    "h-6 w-6 shrink-0 rounded border-2 flex items-center justify-center transition-all",
                                                    isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 bg-white hover:border-orange-400"
                                                )}
                                            >
                                                {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                            </button>
                                            <div>
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {ma.vorname} {ma.nachname}
                                                    {ma.abteilung && <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{ma.abteilung}</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">{ma.rolle || 'Mitarbeiter'}</div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="flex items-center gap-4 pl-9 sm:pl-0 animate-in fade-in slide-in-from-left-2 duration-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Rolle im Team:</span>
                                                    <select
                                                        className="bg-background border border-input rounded-lg text-xs py-1 px-2 font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                                        value={memberData?.role}
                                                        onChange={e => handleRoleChange(ma.id, e.target.value)}
                                                    >
                                                        <option value="Vorarbeiter">Vorarbeiter</option>
                                                        <option value="Polier">Polier</option>
                                                        <option value="Monteur">Monteur</option>
                                                        <option value="Mitglied">Mitglied</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight truncate">CHF/h:</span>
                                                    <Input
                                                        disabled
                                                        value={ma.stundensatz || '0'}
                                                        className="w-16 h-7 text-xs text-center font-mono opacity-60 rounded-lg bg-muted border-input"
                                                        title="Stundensatz in Einstellungen anpassen"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-card flex justify-end">
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 rounded-full px-8 h-11 font-black uppercase text-xs tracking-widest gap-2 flex items-center transition-all hover:scale-105 active:scale-95"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Speichern...' : 'Team Erstellen'}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
