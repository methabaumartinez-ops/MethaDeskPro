'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ReservierungModal } from '@/components/shared/ReservierungModal';
import { FleetService } from '@/lib/services/fleetService';
import { Fahrzeug, FahrzeugReservierung } from '@/types';
import {
    Plus, Search, Eye, Trash2, CalendarPlus,
    Car, Wrench, CheckCircle2, Calendar, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const KATEGORIE_LABELS: Record<string, string> = {
    scherenbuehne: 'Scherenbühne',
    teleskopbuehne: 'Teleskopbühne',
    vertikalmastbuehne: 'Vertikalmastbühne',
    mauerbuehne: 'Mauerbühne',
    teleskop_frontlader: 'Teleskop Frontlader',
    kleinbagger: 'Kleinbagger',
    baggerlader: 'Baggerlader',
    raupendumper: 'Raupendumper',
    minikran: 'Minikran',
    turmdrehkran: 'Turmdrehkran',
    sonstiges: 'Sonstiges',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
    verfuegbar: { label: 'Verfügbar', variant: 'success' },
    reserviert: { label: 'Reserviert', variant: 'warning' },
    in_wartung: { label: 'In Wartung', variant: 'info' },
    ausser_betrieb: { label: 'Außer Betrieb', variant: 'error' },
};

export default function FuhrparkPage() {
    const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
    const [reservierungen, setReservierungen] = useState<FahrzeugReservierung[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('fahrzeuge');
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFahrzeug, setSelectedFahrzeug] = useState<Fahrzeug | undefined>();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [fzData, resData] = await Promise.all([
                FleetService.getFahrzeuge(),
                FleetService.getReservierungen()
            ]);
            setFahrzeuge(fzData);
            setReservierungen(resData);
        } catch (err) {
            console.error('Error loading Fuhrpark data:', err);
            setError('Fehler beim Laden der Daten. Bitte prüfen Sie Ihre Verbindung.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDeleteFahrzeug = async (id: string) => {
        if (!confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) return;
        try {
            await FleetService.deleteFahrzeug(id);
            setFahrzeuge(prev => prev.filter(f => f.id !== id));
        } catch (err) {
            console.error(err);
            alert('Fehler beim Löschen des Fahrzeugs.');
        }
    };

    const handleDeleteReservierung = async (id: string) => {
        if (!confirm('Reservierung wirklich löschen?')) return;
        try {
            const res = reservierungen.find(r => r.id === id);
            await FleetService.deleteReservierung(id);
            if (res) {
                await FleetService.updateFahrzeug(res.fahrzeugId, { status: 'verfuegbar' });
                setFahrzeuge(prev => prev.map(f => f.id === res.fahrzeugId ? { ...f, status: 'verfuegbar' } : f));
            }
            setReservierungen(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error(err);
            alert('Fehler beim Löschen der Reservierung.');
        }
    };

    const handleReserve = (fahrzeug: Fahrzeug) => {
        setSelectedFahrzeug(fahrzeug);
        setModalOpen(true);
    };

    const handleSaveReservierung = async (newRes: FahrzeugReservierung) => {
        try {
            // 1. Create Reservation
            const createdRes = await FleetService.createReservierung({
                fahrzeugId: newRes.fahrzeugId,
                projektId: newRes.projektId,
                baustelle: newRes.baustelle,
                reserviertAb: newRes.reserviertAb,
                reserviertBis: newRes.reserviertBis,
                reserviertDurch: newRes.reserviertDurch,
                bemerkung: newRes.bemerkung
            });

            // 2. Update Vehicle Status
            await FleetService.updateFahrzeug(newRes.fahrzeugId, { status: 'reserviert' });

            // 3. Refresh UI
            setReservierungen(prev => [...prev, createdRes]);
            setFahrzeuge(prev => prev.map(f => f.id === newRes.fahrzeugId ? { ...f, status: 'reserviert' } : f));

            setModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Fehler beim Speichern der Reservierung.');
        }
    };

    const filteredFahrzeuge = fahrzeuge.filter(f => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            f.bezeichnung.toLowerCase().includes(term) ||
            f.inventarnummer.toLowerCase().includes(term) ||
            (f.fabrikat || '').toLowerCase().includes(term) ||
            (f.typ || '').toLowerCase().includes(term) ||
            (f.kennzeichen || '').toLowerCase().includes(term)
        );
    });

    const getFahrzeugName = (fahrzeugId: string) => {
        const fz = fahrzeuge.find(f => f.id === fahrzeugId);
        return fz ? `${fz.bezeichnung} (${fz.inventarnummer})` : fahrzeugId;
    };

    if (error) {
        return (
            <div className="flex h-64 items-center justify-center flex-col gap-4">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="font-bold">Es ist ein Fehler aufgetreten</span>
                </div>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={loadData}>Erneut versuchen</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Fuhrpark</h1>
                    <p className="text-muted-foreground font-medium mt-1">Bühnen und Baumaschinen – Verwaltung und Disposition.</p>
                </div>
                <Link href="/fuhrpark/erfassen">
                    <Button className="font-bold shadow-lg shadow-primary/20">
                        <Plus className="h-5 w-5 mr-2" />
                        Neue Maschine
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground">{fahrzeuge.filter(f => f.status === 'verfuegbar').length}</p>
                            <p className="text-xs font-semibold text-muted-foreground">Verfügbar</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground">{fahrzeuge.filter(f => f.status === 'reserviert').length}</p>
                            <p className="text-xs font-semibold text-muted-foreground">Reserviert</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground">{fahrzeuge.filter(f => f.status === 'in_wartung').length}</p>
                            <p className="text-xs font-semibold text-muted-foreground">In Wartung</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Car className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-foreground">{fahrzeuge.length}</p>
                            <p className="text-xs font-semibold text-muted-foreground">Gesamt</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            {/* Tabs - Fixed props for build */}
            <Tabs>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <TabsList>
                        <TabsTrigger active={activeTab === 'fahrzeuge'} onClick={() => setActiveTab('fahrzeuge')}>
                            <Car className="h-4 w-4 mr-2" />
                            Fahrzeuge
                        </TabsTrigger>
                        <TabsTrigger active={activeTab === 'reservierungen'} onClick={() => setActiveTab('reservierungen')}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Reservierungen ({reservierungen.length})
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'fahrzeuge' && (
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Suchen..."
                                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Tab: Fahrzeuge */}
                <TabsContent active={activeTab === 'fahrzeuge'}>
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="py-20 flex justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : filteredFahrzeuge.length === 0 ? (
                                <div className="py-20 flex flex-col items-center gap-2">
                                    <Car className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-muted-foreground font-bold">Keine Maschinen gefunden</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="border-none rounded-none">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Bezeichnung</TableHead>
                                                <TableHead>Inv.-Nr.</TableHead>
                                                <TableHead>Gruppe / Typ</TableHead>
                                                <TableHead>Standort</TableHead>
                                                <TableHead>Fabrikat / Modell</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Aktionen</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredFahrzeuge.map(item => {
                                                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.verfuegbar;
                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div>
                                                                <span className="font-bold text-foreground">{item.bezeichnung}</span>
                                                                <p className="text-xs text-muted-foreground mt-0.5">{KATEGORIE_LABELS[item.kategorie] || item.kategorie}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-semibold text-foreground">{item.inventarnummer}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-semibold text-foreground text-xs uppercase tracking-tight">{item.gruppe || '–'}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-muted-foreground font-medium text-xs">{item.standort || '–'}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-muted-foreground font-medium">
                                                                {item.fabrikat && <span>{item.fabrikat}</span>}
                                                                {item.typ && <span className="text-xs ml-1">/ {item.typ}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Link href={`/fuhrpark/${item.id}`}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted hover:shadow-sm">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:shadow-sm"
                                                                    onClick={() => handleReserve(item)}
                                                                    title="Reservieren"
                                                                >
                                                                    <CalendarPlus className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm"
                                                                    onClick={() => handleDeleteFahrzeug(item.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Reservierungen */}
                <TabsContent active={activeTab === 'reservierungen'}>
                    <div className="flex justify-end mb-4">
                        <Button
                            className="font-bold shadow-lg shadow-primary/20"
                            onClick={() => { setSelectedFahrzeug(undefined); setModalOpen(true); }}
                        >
                            <CalendarPlus className="h-5 w-5 mr-2" />
                            Neue Reservierung
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="py-20 flex justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : reservierungen.length === 0 ? (
                                <div className="py-20 flex flex-col items-center gap-2">
                                    <Calendar className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-muted-foreground font-bold">Keine Reservierungen vorhanden</p>
                                </div>
                            ) : (
                                <Table className="border-none rounded-none">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fahrzeug</TableHead>
                                            <TableHead>Projekt</TableHead>
                                            <TableHead>Baustelle</TableHead>
                                            <TableHead>Von</TableHead>
                                            <TableHead>Bis</TableHead>
                                            <TableHead>Durch</TableHead>
                                            <TableHead className="text-right">Aktionen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reservierungen.map(res => (
                                            <TableRow key={res.id}>
                                                <TableCell>
                                                    <span className="font-bold text-foreground">{getFahrzeugName(res.fahrzeugId)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-muted-foreground font-medium">{res.projektName || res.projektId || '–'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-foreground">{res.baustelle}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-semibold text-muted-foreground">{res.reserviertAb}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-semibold text-muted-foreground">{res.reserviertBis || 'offen'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-muted-foreground font-medium">{res.reserviertDurch || '–'}</span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm"
                                                        onClick={() => handleDeleteReservierung(res.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Reservation Modal */}
            <ReservierungModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedFahrzeug(undefined); }}
                onSave={handleSaveReservierung}
                fahrzeug={selectedFahrzeug}
            />
        </div>
    );
}
