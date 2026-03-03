'use client';
import { showAlert } from '@/lib/alert';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ReservierungModal } from '@/components/shared/ReservierungModal';
import { FleetService } from '@/lib/services/fleetService';
import { ProjectService } from '@/lib/services/projectService';
// import { mockStore } from '@/lib/mock/store'; // Removed
import { Fahrzeug, FahrzeugReservierung, Projekt } from '@/types';
import {
    Plus, Search, Eye, Edit, Trash2, CalendarPlus,
    Car, Wrench, AlertTriangle, CheckCircle2, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    raupenkran: 'Raupenkran',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' }> = {
    verfuegbar: { label: 'Verfügbar', variant: 'success' },
    reserviert: { label: 'Reserviert', variant: 'warning' },
    in_wartung: { label: 'In Wartung', variant: 'info' },
    ausser_betrieb: { label: 'Ausser Betrieb', variant: 'error' },
};

export default function FuhrparkPage() {
    const { projektId } = useParams() as { projektId: string };
    const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
    const [reservierungen, setReservierungen] = useState<FahrzeugReservierung[]>([]);
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('fahrzeuge');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('Alle');
    const [selectedKategorie, setSelectedKategorie] = useState('Alle');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFahrzeug, setSelectedFahrzeug] = useState<Fahrzeug | undefined>();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [veh, res, projs] = await Promise.all([
                    FleetService.getFahrzeuge(),
                    FleetService.getReservierungen(),
                    ProjectService.getProjekte()
                ]);
                setFahrzeuge(veh);
                setReservierungen(res);
                setProjekte(projs);
            } catch (error) {
                console.error("Failed to load fleet data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleDeleteFahrzeug = async (id: string) => {
        if (!confirm('Sind Sie sicher, dass Sie dieses Fahrzeug löschen möchten?')) return;
        try {
            await FleetService.deleteFahrzeug(id);
            setFahrzeuge(prev => prev.filter(f => f.id !== id));

            // Also cleanup related reservations (optional but good practice)
            const relatedRes = reservierungen.filter(r => r.fahrzeugId === id);
            for (const r of relatedRes) {
                await FleetService.deleteReservierung(r.id);
            }
            setReservierungen(prev => prev.filter(r => r.fahrzeugId !== id));

        } catch (error) {
            console.error("Failed to delete vehicle", error);
            showAlert("Fehler beim Löschen des Fahrzeugs");
        }
    };

    const handleDeleteReservierung = async (id: string) => {
        if (!confirm('Reservierung wirklich löschen?')) return;
        try {
            await FleetService.deleteReservierung(id);
            const deletedRes = reservierungen.find(r => r.id === id);
            setReservierungen(prev => prev.filter(r => r.id !== id));

            // If deleting a reservation,- [x] Create project deletion functionality <!-- id: 28 -->
            // - [x] Add delete button to project cards <!-- id: 29 -->
            // - [x] Implement confirmation dialog <!-- id: 30 -->
            // - [x] Implement deletion logic in `ProjectService` <!-- id: 31 -->

            // Check if vehicle needs status update to 'verfuegbar'
            if (deletedRes) {
                const fzId = deletedRes.fahrzeugId;
                const otherRes = reservierungen.filter(r => r.id !== id && r.fahrzeugId === fzId);
                // Logic: if no other *active* reservation, set to available?
                // active means today is within from-to.
                // This logic is complex. For now, user manages status manually or via add reservation.
            }

        } catch (error) {
            console.error("Failed to delete reservation", error);
            showAlert("Fehler beim Löschen der Reservierung");
        }
    };

    const handleReserve = (fahrzeug: Fahrzeug) => {
        setSelectedFahrzeug(fahrzeug);
        setModalOpen(true);
    };

    const handleSaveReservierung = async (newRes: FahrzeugReservierung) => {
        try {
            const savedRes = await FleetService.createReservierung(newRes);
            setReservierungen(prev => [...prev, savedRes]);

            const vehicle = fahrzeuge.find(f => f.id === newRes.fahrzeugId);
            if (vehicle) {
                const updatedVehicle = { ...vehicle, status: 'reserviert' as const };
                await FleetService.updateFahrzeug(vehicle.id, { status: 'reserviert' });
                setFahrzeuge(prev => prev.map(f => f.id === vehicle.id ? updatedVehicle : f));
            }
        } catch (err) {
            console.error(err);
            showAlert('Fehler beim Speichern der Reservierung: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
        }
    };

    const uniqueGroups = React.useMemo(() => {
        const groups = new Set(fahrzeuge.map(f => f.gruppe || 'Sonstige'));
        return Array.from(groups).sort();
    }, [fahrzeuge]);

    const filteredFahrzeuge = fahrzeuge.filter(f => {
        if (selectedGroup !== 'Alle' && (f.gruppe || 'Sonstige') !== selectedGroup) return false;
        if (selectedKategorie !== 'Alle' && f.kategorie !== selectedKategorie) return false;

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

    return (
        <div className="flex flex-col h-full -mt-6"> {/* Full height container to manage sticky better */}
            {/* --- FIXED/STICKY HEADER SECTION --- */}
            <div className="sticky top-0 z-50 bg-background pt-6 pb-2 space-y-6 shadow-sm border-b -mx-6 px-6">
                {/* Title and Action Button */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-primary tracking-tight">Fuhrpark</h1>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Bühnen und Baumaschinen – Verwaltung und Disposition.</p>
                    </div>
                    <Link href={`/${projektId}/fuhrpark/erfassen`}>
                        <Button className="font-bold shadow-lg shadow-[#FF6B35]/20 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white">
                            <Plus className="h-5 w-5 mr-2" />
                            Neue Maschine
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards Row (Horizontal Scroll on Mobile) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <Card className="border-[#FF6B35]/20 min-w-[150px]">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground">{fahrzeuge.filter(f => f.status === 'verfuegbar').length}</p>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Verfügbar</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-[#FF6B35]/20 min-w-[150px]">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground">{fahrzeuge.filter(f => f.status === 'reserviert').length}</p>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Reserviert</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-[#FF6B35]/20 min-w-[150px]">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Wrench className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground">{fahrzeuge.filter(f => f.status === 'in_wartung').length}</p>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">In Wartung</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-[#FF6B35]/20 min-w-[150px]">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center">
                                <Car className="h-5 w-5 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground">{fahrzeuge.length}</p>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Gesamt</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Controls Section (Tabs, Search, Categories, Groups) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <TabsList className="bg-slate-100/50">
                            <TabsTrigger
                                active={activeTab === 'fahrzeuge'}
                                onClick={() => setActiveTab('fahrzeuge')}
                                className={activeTab === 'fahrzeuge' ? "bg-white shadow-sm" : ""}
                            >
                                <Car className="h-4 w-4 mr-2" />
                                Fahrzeuge
                            </TabsTrigger>
                            <TabsTrigger
                                active={activeTab === 'reservierungen'}
                                onClick={() => setActiveTab('reservierungen')}
                                className={activeTab === 'reservierungen' ? "bg-white shadow-sm" : ""}
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                Reservierungen ({reservierungen.length})
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'fahrzeuge' && (
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Suchen nach Bezeichnung oder Inventarnummer..."
                                    className="pl-10 rounded-xl h-11 border-[#FF6B35]/10 bg-white"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {activeTab === 'fahrzeuge' && (
                        <div className="space-y-4">
                            {/* ORANGE CATEGORY MENU - ENSURING VISIBILITY */}
                            <div className="bg-[#FF6B35]/5 p-1 rounded-2xl border-2 border-[#FF6B35]/20 h-14 flex items-center">
                                <div className="flex gap-2 overflow-x-auto w-full px-2 scrollbar-hide py-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "rounded-xl whitespace-nowrap text-xs font-black transition-all h-9 px-5",
                                            selectedKategorie === 'Alle'
                                                ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20 hover:bg-[#FF6B35]"
                                                : "text-[#FF6B35] hover:bg-[#FF6B35]/10"
                                        )}
                                        onClick={() => setSelectedKategorie('Alle')}
                                    >
                                        Alle
                                    </Button>
                                    {Object.entries(KATEGORIE_LABELS).map(([key, label]) => (
                                        <Button
                                            key={key}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "rounded-xl whitespace-nowrap text-xs font-black transition-all h-9 px-5",
                                                selectedKategorie === key
                                                    ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20 hover:bg-[#FF6B35]"
                                                    : "text-[#FF6B35] hover:bg-[#FF6B35]/10"
                                            )}
                                            onClick={() => setSelectedKategorie(key)}
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* FOLDERS / GROUPS NAVIGATION */}
                            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                                <Button
                                    variant={selectedGroup === 'Alle' ? 'primary' : 'outline'}
                                    onClick={() => setSelectedGroup('Alle')}
                                    size="sm"
                                    className={cn(
                                        "h-8 rounded-full text-[11px] font-black uppercase tracking-wider px-5",
                                        selectedGroup === 'Alle' ? "bg-[#FF6B35] text-white" : "text-muted-foreground"
                                    )}
                                >
                                    Alle Gruppen
                                </Button>
                                {uniqueGroups.map(grp => (
                                    <Button
                                        key={grp}
                                        variant={selectedGroup === grp ? 'primary' : 'outline'}
                                        onClick={() => setSelectedGroup(grp)}
                                        size="sm"
                                        className={cn(
                                            "h-8 rounded-full text-[11px] font-black uppercase tracking-wider px-5",
                                            selectedGroup === grp ? "bg-[#FF6B35] text-white" : "text-muted-foreground"
                                        )}
                                    >
                                        {grp}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto pt-6">
                <Tabs>
                    <TabsContent active={activeTab === 'fahrzeuge'}>
                        <div className="rounded-2xl border-2 border-[#FF6B35]/10 overflow-hidden bg-white shadow-sm mb-12">
                            {loading ? (
                                <div className="py-20 flex justify-center">
                                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent" />
                                </div>
                            ) : filteredFahrzeuge.length === 0 ? (
                                <div className="py-20 flex flex-col items-center gap-3 text-center">
                                    <Car className="h-12 w-12 text-slate-200" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Keine Maschinen im Fuhrpark gefunden</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/50 sticky top-0 z-20 shadow-sm border-b">
                                        <TableRow className="hover:bg-transparent h-14">
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 pl-6">Bezeichnung</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Inv.-Nr.</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Gruppe / Typ</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Standort</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Fabrikat / Modell</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right pr-6">Aktionen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredFahrzeuge.map(item => {
                                            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.verfuegbar;
                                            return (
                                                <TableRow key={item.id} className="group hover:bg-slate-50/80 transition-colors h-16 border-b border-slate-100 last:border-0">
                                                    <TableCell className="pl-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{item.bezeichnung}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                {KATEGORIE_LABELS[item.kategorie] || item.kategorie}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-bold text-slate-600">
                                                        {item.inventarnummer}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-700 uppercase">{item.gruppe || 'Standard'}</span>
                                                            {item.typ && <span className="text-[9px] text-slate-400">{item.typ}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-500">—</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">{item.fabrikat || '—'}</span>
                                                            <span className="text-[10px] text-slate-400">{item.typ || '—'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={statusCfg.variant} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                                                            {statusCfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Link href={`/${projektId}/fuhrpark/${item.id}`}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-full"
                                                                onClick={() => handleReserve(item)}
                                                            >
                                                                <CalendarPlus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
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
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent active={activeTab === 'reservierungen'}>
                        <div className="flex justify-end mb-4">
                            <Button
                                className="font-bold shadow-lg shadow-[#FF6B35]/20 bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                                onClick={() => { setSelectedFahrzeug(undefined); setModalOpen(true); }}
                            >
                                <CalendarPlus className="h-5 w-5 mr-2" />
                                Neue Reservierung
                            </Button>
                        </div>
                        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                                ) : reservierungen.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center gap-2">
                                        <Calendar className="h-10 w-10 text-slate-200" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Keine Reservierungen gefunden</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow className="h-12">
                                                <TableHead className="font-bold text-[10px] pl-6">FAHRZEUG</TableHead>
                                                <TableHead className="font-bold text-[10px]">PROJEKT</TableHead>
                                                <TableHead className="font-bold text-[10px]">BAUSTELLE</TableHead>
                                                <TableHead className="font-bold text-[10px]">ZEITRAUM</TableHead>
                                                <TableHead className="font-bold text-[10px]">VON - BIS</TableHead>
                                                <TableHead className="text-right font-bold text-[10px] pr-6">AKTIONEN</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reservierungen.map(res => (
                                                <TableRow key={res.id} className="h-14">
                                                    <TableCell className="pl-6 font-bold text-slate-900">{getFahrzeugName(res.fahrzeugId)}</TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-600">{res.projektName || res.projektId}</TableCell>
                                                    <TableCell className="text-xs font-bold text-primary">{res.baustelle}</TableCell>
                                                    <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{res.reserviertAb}</TableCell>
                                                    <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{res.reserviertBis || 'offen'}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-300 hover:text-red-500"
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
            </div>

            {/* Reservation Modal */}
            <ReservierungModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedFahrzeug(undefined); }}
                onSave={handleSaveReservierung}
                fahrzeug={selectedFahrzeug}
                projektId={projektId}
            />
        </div>
    );
}
