'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SubsystemService } from '@/lib/services/subsystemService';
import { FleetService } from '@/lib/services/fleetService';
import { TeamService } from '@/lib/services/teamService';
import { TaskService } from '@/lib/services/taskService';
import { Teilsystem, Fahrzeug, Team, TeamMember, Task, Subtask, Mitarbeiter } from '@/types';
import { cn, isMontageterminProvisional } from '@/lib/utils';
import {
    Search, Filter, Layers, Link as LinkIcon,
    Car, HardHat, Package, Truck, Plus, CheckCircle2, Clock, Inbox, Trash2, Send, Edit2, MessageSquare,
    Eye, CalendarPlus, Wrench, Camera, ArrowLeft, Users, CheckSquare, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { BestellService } from '@/lib/services/bestellService';
import { MaterialBestellung, BestellungItem, FahrzeugReservierung, ABTEILUNGEN_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';
import { AbteilungBadge } from '@/components/shared/AbteilungBadge';
import { ReservierungModal } from '@/components/shared/ReservierungModal';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { useSortableTable } from '@/lib/hooks/useSortableTable';
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

export default function AusfuehrungPage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser, activeProjekt } = useProjekt();
    const router = useRouter();
    const pathname = usePathname();

    let fromParam = '';
    if (pathname.includes('/produktion/avor')) fromParam = '?from=avor';
    else if (pathname.includes('/produktion/planung')) fromParam = '?from=planner';
    else if (pathname.includes('/produktion/einkauf')) fromParam = '?from=einkauf';
    else if (pathname.includes('/ausfuehrung')) fromParam = '?from=ausfuehrung';

    // Data States
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [vehicles, setVehicles] = useState<Fahrzeug[]>([]);
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // Form State for creating new Material Orders
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [newContainerBez, setNewContainerBez] = useState('');
    const [newBemerkung, setNewBemerkung] = useState('');
    const [newLiefertermin, setNewLiefertermin] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<{
        name: string,
        menge: string,
        einheit: string,
        tsnummer: string,
        attachmentUrl?: string,
        attachmentId?: string,
        attachmentName?: string,
        bemerkung?: string,
        showBemerkung?: boolean
    }[]>([{ name: '', menge: '', einheit: '', tsnummer: '', bemerkung: '', showBemerkung: false }]);

    // Fahrzeug Reservation States
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFahrzeug, setSelectedFahrzeug] = useState<Fahrzeug | undefined>();
    const [selectedKategorie, setSelectedKategorie] = useState('Alle');

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'projektleiter' || currentUser?.role === 'mitarbeiter';
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('teilsysteme');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Sync Bau Teilsysteme to Tasks
                await TaskService.syncBauTeilsysteme(projektId);

                const [subs, vehs, best, tms, fetchedTasks, mitsRes] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    FleetService.getFahrzeuge(),
                    BestellService.getBestellungen(projektId),
                    TeamService.getTeams(projektId),
                    TaskService.getTasks({ projektId }),
                    fetch(`/api/data/mitarbeiter`)
                ]);

                let mits = [];
                if (mitsRes.ok) mits = await mitsRes.json();

                setSubsystems(subs as Teilsystem[]);
                setVehicles(vehs);
                setBestellungen(best);
                setTeams(tms as any[]);
                setTasks(fetchedTasks as any[]);
                setMitarbeiter(mits);

                // Handle tab parameter
                const urlParams = new URLSearchParams(window.location.search);
                const tab = urlParams.get('tab');
                if (tab) {
                    setActiveTab(tab);
                }

                // Check for edit parameter in URL
                const editId = urlParams.get('edit');
                if (editId) {
                    const orderToEdit = best.find(b => b.id === editId);
                    if (orderToEdit) {
                        handleEditOrder(orderToEdit);
                        setActiveTab('logistik');
                    }
                }
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projektId]);

    // Filters
    const filteredSubsystems = subsystems.filter(item => {
        const matchesSearch = (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (item.name?.toLowerCase() || '').includes(search.toLowerCase());

        if (activeTab === 'ts_baustelle') {
            return matchesSearch && (item.abteilung === 'Bau' || item.status === 'geliefert' || item.status === 'verbaut');
        }
        return matchesSearch;
    });

    const filteredVehicles = vehicles.filter(veh => {
        const matchesSearch = (veh.bezeichnung?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.inventarnummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.kennzeichen?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesKategorie = selectedKategorie === 'Alle' || veh.kategorie === selectedKategorie;

        return matchesSearch && matchesKategorie;
    });

    const { sortedData: sortedSubsystems, handleSort: handleSortTS, getSortIcon: getSortIconTS, isSortActive: isSortActiveTS } = useSortableTable(filteredSubsystems, 'teilsystemNummer', 'asc');
    const { sortedData: sortedVehicles, handleSort: handleSortVeh, getSortIcon: getSortIconVeh, isSortActive: isSortActiveVeh } = useSortableTable(filteredVehicles, 'bezeichnung', 'asc');

    const filteredBestellungen = bestellungen.filter(b =>
        (b.containerBez?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (b.bestelltVon?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleAddOrderItem = () => {
        setNewOrderItems([...newOrderItems, { name: '', menge: '', einheit: '', tsnummer: '', bemerkung: '', showBemerkung: false }]);
    };

    const handleRemoveOrderItem = (index: number) => {
        setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
    };

    const handleReserve = (fahrzeug: Fahrzeug) => {
        setSelectedFahrzeug(fahrzeug);
        setModalOpen(true);
    };

    const handleSaveReservierung = async (newRes: FahrzeugReservierung) => {
        try {
            await FleetService.createReservierung(newRes);
            const vehicle = vehicles.find(f => f.id === newRes.fahrzeugId);
            if (vehicle) {
                const updatedVehicle = { ...vehicle, status: 'reserviert' as const };
                await FleetService.updateFahrzeug(vehicle.id, { status: 'reserviert' });
                setVehicles(prev => prev.map(f => f.id === vehicle.id ? updatedVehicle : f));
            }
            setModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Fehler beim Speichern der Reservierung');
        }
    };

    const handleUpdateOrderItem = (index: number, field: string, value: any) => {
        const updated = [...newOrderItems];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-add new row if user is typing in the last row (excluding auxiliary fields)
        if (index === newOrderItems.length - 1 && !['attachmentUrl', 'attachmentId', 'attachmentName', 'showBemerkung'].includes(field) && typeof value === 'string' && value.trim() !== '') {
            updated.push({ name: '', menge: '', einheit: '', tsnummer: '', bemerkung: '', showBemerkung: false });
        }

        setNewOrderItems(updated);
    };

    const handleFileUpload = async (index: number, file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projektId', projektId);
            formData.append('type', 'image');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            const updated = [...newOrderItems];
            updated[index] = {
                ...updated[index],
                attachmentUrl: data.url,
                attachmentId: data.id,
                attachmentName: file.name
            };
            setNewOrderItems(updated);
        } catch (err) {
            console.error("Upload error", err);
            toast.error('Fehler beim Hochladen des Bildes');
        }
    };

    const handleEditOrder = (order: MaterialBestellung) => {
        setEditingOrderId(order.id);
        setNewContainerBez(order.containerBez);
        setNewBemerkung(order.bemerkung || '');
        setNewLiefertermin(order.liefertermin || '');
        const mappedItems = order.items.map(item => ({
            name: item.materialName,
            menge: item.menge.toString(),
            einheit: item.einheit,
            tsnummer: item.tsnummer || '',
            attachmentUrl: item.attachmentUrl,
            attachmentId: item.attachmentId,
            attachmentName: item.attachmentName,
            bemerkung: item.bemerkung || '',
            showBemerkung: !!item.bemerkung
        }));
        // Add one empty row for easy entry
        mappedItems.push({
            name: '',
            menge: '',
            einheit: '',
            tsnummer: '',
            attachmentUrl: undefined,
            attachmentId: undefined,
            attachmentName: undefined,
            bemerkung: '',
            showBemerkung: false
        });
        setNewOrderItems(mappedItems);
        setIsCreatingOrder(true);
    };

    const handleSubmitOrder = async () => {
        if (!newContainerBez.trim()) return toast.error("Bitte Containerbezeichnung eingeben.");

        const validItems = newOrderItems.filter(item => item.name.trim() !== '' && item.menge.trim() !== '');
        if (validItems.length === 0) return toast.error("Bitte mindestens ein Material hinzufügen.");

        try {
            const items = validItems.map((item, idx) => ({
                id: `item-${Date.now()}-${idx}`,
                materialName: item.name,
                menge: parseFloat(item.menge),
                einheit: item.einheit || 'Stk',
                vorbereitet: false,
                tsnummer: item.tsnummer || undefined,
                attachmentUrl: item.attachmentUrl,
                attachmentId: item.attachmentId,
                attachmentName: item.attachmentName,
                bemerkung: item.bemerkung || undefined
            }));

            if (editingOrderId) {
                // Update existing order
                const updatedOrder = await BestellService.updateBestellung(editingOrderId, {
                    containerBez: newContainerBez,
                    bemerkung: newBemerkung,
                    liefertermin: newLiefertermin,
                    items
                });
                setBestellungen(bestellungen.map(b => b.id === editingOrderId ? updatedOrder : b));
            } else {
                // Create new order
                const newOrder = await BestellService.createBestellung({
                    projektId,
                    containerBez: newContainerBez,
                    bemerkung: newBemerkung,
                    liefertermin: newLiefertermin,
                    bestelldatum: new Date().toISOString(),
                    status: 'angefragt',
                    bestelltVon: currentUser?.vorname ? `${currentUser.vorname.charAt(0)}.${currentUser.nachname}` : 'Unbekannt',
                    items
                });
                setBestellungen([...bestellungen, newOrder]);
            }

            setIsCreatingOrder(false);
            setEditingOrderId(null);
            setNewContainerBez('');
            setNewBemerkung('');
            setNewLiefertermin('');
            setNewOrderItems([{ name: '', menge: '', einheit: '', tsnummer: '', bemerkung: '', showBemerkung: false }]);
        } catch (error) {
            console.error("Fehler beim Speichern der Bestellung", error);
        }
    };

    const isOrderEditable = (bestelldatum: string) => {
        const orderDate = new Date(bestelldatum);
        const now = new Date();

        // Check if it's the same day
        const isSameDay = orderDate.toDateString() === now.toDateString();

        // Return true if it's today and before 15:00
        if (isSameDay) {
            return now.getHours() < 15;
        }

        // If it's a future date (unlikely but possible), it's editable
        if (orderDate > now) return true;

        return false;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-3">
            <ModuleActionBanner
                icon={HardHat}
                title="Ausführung"
                searchPlaceholder={
                    activeTab === 'teilsysteme' ? "Suche nach Nummer o. Name..." :
                        activeTab === 'logistik' ? "Suche nach Container o. Besteller..." :
                            activeTab === 'teams_aufgaben' ? "Suche nach Team o. Aufgabe..." :
                                "Suche nach Bezeichnung o. Inventarnummer..."
                }
                onSearch={setSearch}
            />

            <Tabs className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <TabsList className="bg-transparent p-0 gap-2 h-auto flex-wrap">
                        <TabsTrigger
                            active={activeTab === 'teilsysteme'}
                            onClick={() => setActiveTab('teilsysteme')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'teilsysteme'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <Layers className="h-4 w-4" />
                            Teilsysteme (Alle)
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'ts_baustelle'}
                            onClick={() => setActiveTab('ts_baustelle')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'ts_baustelle'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <HardHat className="h-4 w-4" />
                            TS am Baustelle
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'logistik'}
                            onClick={() => setActiveTab('logistik')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'logistik'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <Truck className="h-4 w-4" />
                            Bestellung ({bestellungen.length})
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'fahrzeuge'}
                            onClick={() => setActiveTab('fahrzeuge')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'fahrzeuge'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <Car className="h-4 w-4" />
                            Fahrzeuge ({vehicles.length})
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'teams_aufgaben'}
                            onClick={() => setActiveTab('teams_aufgaben')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'teams_aufgaben'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            Teams & Aufgaben ({tasks.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">

                    <CardContent className="p-0 flex-1 overflow-auto bg-card border rounded-lg shadow-sm">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                <p className="text-sm font-bold text-slate-400">Daten werden geladen...</p>
                            </div>
                        ) : (
                            <>
                                <TabsContent active={activeTab === 'teilsysteme' || activeTab === 'ts_baustelle'} className="mt-0 h-full">
                                    {filteredSubsystems.length > 0 ? (
                                        <div className="overflow-x-auto max-w-full">
                                            <Table>
                                        <TableHeader className="bg-muted sticky top-0 z-10">
                                                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                                                        <TableHead
                                                            className={cn('w-20 px-4 py-4 font-black text-center text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('teilsystemNummer') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('teilsystemNummer')}
                                                        >
                                                            System-Nr. <span className="text-[8px] opacity-50">{getSortIconTS('teilsystemNummer')}</span>
                                                        </TableHead>
                                                        <TableHead
                                                            className={cn('w-12 px-4 py-4 font-black text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('ks') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('ks')}
                                                        >
                                                            KS <span className="text-[8px] opacity-50">{getSortIconTS('ks')}</span>
                                                        </TableHead>
                                                        <TableHead
                                                            className={cn('min-w-[200px] px-4 py-4 font-black text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('name') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('name')}
                                                        >
                                                            Bezeichnung <span className="text-[8px] opacity-50">{getSortIconTS('name')}</span>
                                                        </TableHead>
                                                        <TableHead
                                                            className={cn('px-4 py-4 font-black text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('abteilung') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('abteilung')}
                                                        >
                                                            Abteilung <span className="text-[8px] opacity-50">{getSortIconTS('abteilung')}</span>
                                                        </TableHead>
                                                        <TableHead
                                                            className={cn('px-4 py-4 font-black text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('montagetermin') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('montagetermin')}
                                                        >
                                                            Termine <span className="text-[8px] opacity-50">{getSortIconTS('montagetermin')}</span>
                                                        </TableHead>
                                                        <TableHead
                                                            className={cn('px-4 py-4 font-black text-[10px] uppercase tracking-wider cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveTS('status') ? 'text-orange-700' : 'text-foreground')}
                                                            onClick={() => handleSortTS('status')}
                                                        >
                                                            Status <span className="text-[8px] opacity-50">{getSortIconTS('status')}</span>
                                                        </TableHead>
                                                        <TableHead className="px-4 py-4 text-right font-black text-foreground text-[10px] uppercase tracking-wider">Aktionen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedSubsystems.map((item) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="group hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-border/50"
                                                            onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}${fromParam ? fromParam + '&' : '?'}mode=readOnly`)}
                                                        >
                                                            <TableCell className="p-4 text-center">
                                                                <Badge variant="outline" className="font-black text-orange-700 border-orange-200 bg-orange-50 text-xs py-1 px-3">
                                                                    {item.teilsystemNummer || '—'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="p-4 font-black text-muted-foreground text-xs">{item.ks || '1'}</TableCell>
                                                            <TableCell className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-foreground text-sm tracking-tight">{item.name}</span>
                                                                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[250px] italic">
                                                                        {item.bemerkung || 'Keine Bemerkung'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-4">
                                                                <AbteilungBadge abteilung={item.abteilung} />
                                                            </TableCell>
                                                            <TableCell className="p-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 w-12">Montage:</span>
                                                                        <span className={cn("text-[10px] font-black", isMontageterminProvisional(item) ? "text-red-600" : "text-orange-600")}>{item.montagetermin || '—'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 w-12">Von:</span>
                                                                        <span className="text-[10px] font-bold text-foreground">{item.eroeffnetDurch || 'Moritz'}</span>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex flex-col gap-1">
                                                                    {item.abteilung === 'Bau' ? (
                                                                        <select
                                                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-tight focus:ring-1 focus:ring-orange-500 cursor-pointer hover:border-orange-500 transition-all outline-none"
                                                                            value={item.status}
                                                                            onChange={async (e) => {
                                                                                const newStatus = e.target.value as any;
                                                                                try {
                                                                                    await SubsystemService.updateTeilsystem(item.id, { status: newStatus });
                                                                                    setSubsystems(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus } : s));
                                                                                } catch (err) {
                                                                                    console.error("Failed to update status", err);
                                                                                    toast.error("Fehler beim Aktualisieren des Status");
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="offen">Offen</option>
                                                                            <option value="verbaut">Verbaut</option>
                                                                            <option value="geaendert">Nachbearbeitung</option>
                                                                        </select>
                                                                    ) : null}
                                                                    <div>
                                                                        <StatusBadge status={item.status} className="scale-75 origin-left" />
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-4 text-right">
                                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${item.id}&action=einlagerung&qr=TEILSYSTEM:${item.id}`}>
                                                                        <Button variant="outline" size="sm" className="h-8 border-blue-400 bg-white hover:bg-blue-50 text-blue-700 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-2 active:border-b-0 active:translate-y-[1px]">
                                                                            <ArrowLeft className="h-3 w-3 rotate-[-90deg]" />
                                                                            <span>Einlagern</span>
                                                                        </Button>
                                                                    </Link>
                                                                    <Link href={`/${projektId}/lager-scan?type=teilsystem&id=${item.id}&action=auslagerung&qr=TEILSYSTEM:${item.id}`}>
                                                                        <Button variant="outline" size="sm" className="h-8 border-red-400 bg-white hover:bg-red-50 text-red-700 font-black uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border-b-2 active:border-b-0 active:translate-y-[1px]">
                                                                            <ArrowLeft className="h-3 w-3 rotate-[90deg]" />
                                                                            <span>Auslagern</span>
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <EmptyState label="Keine Teilsysteme gefunden" icon={Layers} />
                                    )}
                                </TabsContent>

                                <TabsContent active={activeTab === 'fahrzeuge'} className="mt-0 h-full">
                                    <div className="bg-background -mx-4 px-4 py-3 mb-4 scrollbar-hide">
                                        <div className="flex gap-2 p-1.5 overflow-x-auto border-2 border-[#FF6B35]/20 bg-white rounded-2xl shadow-sm">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "rounded-xl whitespace-nowrap text-[11px] font-black transition-all h-8 px-4",
                                                    selectedKategorie === 'Alle'
                                                        ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20 hover:bg-[#FF6B35]/90"
                                                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                                        "rounded-xl whitespace-nowrap text-[11px] font-black transition-all h-8 px-4",
                                                        selectedKategorie === key
                                                            ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/20 hover:bg-[#FF6B35]/90"
                                                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    )}
                                                    onClick={() => setSelectedKategorie(key)}
                                                >
                                                    {label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    {filteredVehicles.length > 0 ? (
                                        <div className="overflow-x-auto max-w-full">
                                            <Table className="border-none">
                                                <TableHeader>
                                                    <TableRow className="bg-muted hover:bg-muted/80">
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('bezeichnung') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('bezeichnung')}>
                                                            Bezeichnung <span className="text-[8px] opacity-50">{getSortIconVeh('bezeichnung')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('inventarnummer') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('inventarnummer')}>
                                                            Inv.-Nr. <span className="text-[8px] opacity-50">{getSortIconVeh('inventarnummer')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('fabrikat') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('fabrikat')}>
                                                            Fabrikat / Typ <span className="text-[8px] opacity-50">{getSortIconVeh('fabrikat')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('kennzeichen') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('kennzeichen')}>
                                                            Kennz. <span className="text-[8px] opacity-50">{getSortIconVeh('kennzeichen')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('baujahr') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('baujahr')}>
                                                            Baujahr <span className="text-[8px] opacity-50">{getSortIconVeh('baujahr')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('geprueftBis') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('geprueftBis')}>
                                                            Geprüft bis <span className="text-[8px] opacity-50">{getSortIconVeh('geprueftBis')}</span>
                                                        </TableHead>
                                                        <TableHead className={cn('h-10 px-4 font-bold text-xs cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActiveVeh('status') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSortVeh('status')}>
                                                            Status <span className="text-[8px] opacity-50">{getSortIconVeh('status')}</span>
                                                        </TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs text-right">Aktionen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedVehicles.map((item) => {
                                                        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.verfuegbar;
                                                        return (
                                                            <TableRow
                                                                key={item.id}
                                                                className="hover:bg-muted/50 cursor-pointer group"
                                                                onClick={() => router.push(`/${projektId}/fuhrpark/${item.id}`)}
                                                            >
                                                                <TableCell className="p-3 px-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="font-bold text-foreground text-sm">{item.bezeichnung}</span>
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-800/50 h-4 px-1 leading-none border-primary/20 text-primary">
                                                                                {KATEGORIE_LABELS[item.kategorie] || item.kategorie}
                                                                            </Badge>
                                                                            {item.gruppe && (
                                                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-800/50 h-4 px-1 leading-none text-muted-foreground border-slate-200">
                                                                                    {item.gruppe}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <span className="font-semibold text-foreground text-sm font-mono">{item.inventarnummer}</span>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <div className="text-muted-foreground font-medium text-xs">
                                                                        {item.fabrikat && <span>{item.fabrikat}</span>}
                                                                        {item.typ && <span className="text-[10px] ml-1">/ {item.typ}</span>}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <span className="text-muted-foreground font-medium text-xs">{item.kennzeichen || '–'}</span>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <span className="text-muted-foreground font-medium text-xs">{item.baujahr || '–'}</span>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <span className="text-xs font-semibold text-muted-foreground">{item.geprueftBis || '–'}</span>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4">
                                                                    <Badge variant={statusCfg.variant} className="text-[10px] uppercase px-2 py-0">{statusCfg.label}</Badge>
                                                                </TableCell>
                                                                <TableCell className="p-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex justify-end gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-amber-500 hover:bg-amber-50 hover:shadow-sm"
                                                                            onClick={() => handleReserve(item)}
                                                                            title="Reservieren"
                                                                        >
                                                                            <CalendarPlus className="h-4 w-4" />
                                                                        </Button>
                                                                        <Link href={`/${projektId}/fuhrpark/${item.id}`}>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted hover:shadow-sm">
                                                                                <Eye className="h-4 w-4" />
                                                                            </Button>
                                                                        </Link>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <EmptyState label="Keine Fahrzeuge gefunden" icon={Car} />
                                    )}
                                </TabsContent>

                                <TabsContent active={activeTab === 'logistik'} className="mt-0 h-full flex flex-col p-4 bg-slate-50">
                                    {isCreatingOrder ? (
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto w-full">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                    <Package className="h-5 w-5 text-orange-500" />
                                                    {editingOrderId ? 'Bestellung bearbeiten' : 'Neue Materialbestellung'}
                                                </h3>
                                                <Button variant="ghost" size="sm" onClick={() => { setIsCreatingOrder(false); setEditingOrderId(null); }}>Abbrechen</Button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Container / Lieferort</label>
                                                        <Input
                                                            placeholder="z.B. Container EG Ost..."
                                                            value={newContainerBez}
                                                            onChange={e => setNewContainerBez(e.target.value)}
                                                            className="font-medium h-10"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Spätester Liefertermin</label>
                                                        <Input
                                                            type="date"
                                                            value={newLiefertermin}
                                                            onChange={e => setNewLiefertermin(e.target.value)}
                                                            className="font-medium h-10"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block flex items-center gap-2">
                                                        <MessageSquare className="h-3 w-3" />
                                                        Kommentare / Info für Werkhof
                                                    </label>
                                                    <textarea
                                                        className="w-full text-sm p-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all min-h-[80px] resize-none font-medium text-slate-700"
                                                        placeholder="z.B. Dringend benötigt, bauseitig versetzen, direkt an Polier liefern..."
                                                        value={newBemerkung}
                                                        onChange={e => setNewBemerkung(e.target.value)}
                                                    />
                                                </div>

                                                <div className="pt-4 border-t border-slate-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materialliste</label>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {newOrderItems.map((item, idx) => (
                                                            <div key={idx} className="flex flex-col gap-1.5 p-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                                <div className="flex gap-2 items-center">
                                                                    <Input
                                                                        placeholder="TS-Nr."
                                                                        value={item.tsnummer}
                                                                        onChange={e => handleUpdateOrderItem(idx, 'tsnummer', e.target.value)}
                                                                        className="w-20 text-[10px] h-9 rounded-xl bg-white"
                                                                    />
                                                                    <Input
                                                                        placeholder="Bezeichnung (z.B. Schrauben M12)"
                                                                        value={item.name}
                                                                        onChange={e => handleUpdateOrderItem(idx, 'name', e.target.value)}
                                                                        className="flex-1 text-xs h-9 rounded-xl bg-white"
                                                                    />
                                                                    <Input
                                                                        placeholder="Menge"
                                                                        type="number"
                                                                        value={item.menge}
                                                                        onChange={e => handleUpdateOrderItem(idx, 'menge', e.target.value)}
                                                                        className="w-20 text-xs h-9 rounded-xl bg-white text-center"
                                                                    />
                                                                    <Input
                                                                        placeholder="Einh."
                                                                        value={item.einheit}
                                                                        onChange={e => handleUpdateOrderItem(idx, 'einheit', e.target.value)}
                                                                        className="w-16 text-xs h-9 rounded-xl bg-white text-center"
                                                                    />
                                                                    <div className="flex gap-1 shrink-0">
                                                                        <input
                                                                            type="file"
                                                                            id={`file-upload-${idx}`}
                                                                            className="hidden"
                                                                            accept="image/*"
                                                                            onChange={(e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file) handleFileUpload(idx, file);
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "h-9 w-9 rounded-xl border-slate-200 transition-all bg-white",
                                                                                item.attachmentUrl ? "bg-blue-50 text-blue-600 border-blue-200" : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                                                            )}
                                                                            onClick={() => document.getElementById(`file-upload-${idx}`)?.click()}
                                                                            title={item.attachmentName || "Foto hinzufügen"}
                                                                        >
                                                                            <Camera className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "h-9 w-9 rounded-xl border-slate-200 transition-all bg-white",
                                                                                item.showBemerkung || item.bemerkung ? "bg-orange-50 text-orange-600 border-orange-200" : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                                                            )}
                                                                            onClick={() => handleUpdateOrderItem(idx, 'showBemerkung', !item.showBemerkung)}
                                                                            title="Kommentar hinzufügen"
                                                                        >
                                                                            <MessageSquare className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                            onClick={() => handleRemoveOrderItem(idx)}
                                                                            disabled={newOrderItems.length === 1}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                {(item.showBemerkung || item.bemerkung) && (
                                                                    <div className="px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <Input
                                                                            placeholder="Zusatzinfo / Kommentar zu diesem Artikel..."
                                                                            value={item.bemerkung}
                                                                            onChange={e => handleUpdateOrderItem(idx, 'bemerkung', e.target.value)}
                                                                            className="text-xs h-8 bg-white border-orange-100 focus:border-orange-500 rounded-lg italic"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-6 flex justify-end">
                                                    <Button
                                                        className="h-11 px-8 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                                        onClick={handleSubmitOrder}
                                                    >
                                                        <Send className="h-4 w-4" />
                                                        {editingOrderId ? 'Bestellung speichern' : 'Bestellung auslösen'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-4 mb-4">
                                                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="h-5 w-5 text-amber-600" />
                                                        <div>
                                                            <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Wichtiger Hinweis zur Nachbestellung</p>
                                                            <p className="text-xs text-amber-800 font-medium">Bestellungen können nur am Tag der Erfassung **bis 15:00 Uhr** bearbeitet werden. Danach wird die Liste für den Werkhof fixiert.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <Button
                                                        className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                                        onClick={() => {
                                                            setIsCreatingOrder(true);
                                                            setEditingOrderId(null);
                                                            setNewContainerBez(activeProjekt ? activeProjekt.projektname : '');
                                                            setNewBemerkung('');
                                                            setNewLiefertermin('');
                                                            setNewOrderItems([{ name: '', menge: '', einheit: '', tsnummer: '', bemerkung: '', showBemerkung: false }]);
                                                        }}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        <span>Material bestellen</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {filteredBestellungen.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {filteredBestellungen.map(bestellung => (
                                                        <Card key={bestellung.id} className="border-2 border-slate-100 shadow-sm hover:border-orange-200 transition-colors overflow-hidden flex flex-col">
                                                            <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-start">
                                                                <div>
                                                                    <div className="text-xs text-slate-400 font-bold mb-0.5">{new Date(bestellung.bestelldatum).toLocaleDateString('de-CH')}</div>
                                                                    <h4 className="font-black text-slate-800 flex items-center gap-1.5">
                                                                        <Inbox className="h-4 w-4 text-slate-400" />
                                                                        {bestellung.containerBez}
                                                                    </h4>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                                        bestellung.status === 'angefragt' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                            bestellung.status === 'in_bearbeitung' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                                bestellung.status === 'bereit' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                                                    bestellung.status === 'versendet' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                                                        "bg-slate-100 text-slate-600 border-slate-200"
                                                                    )}>
                                                                        {bestellung.status.replace('_', ' ')}
                                                                    </span>
                                                                    {isOrderEditable(bestellung.bestelldatum) && (
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleEditOrder(bestellung)}>
                                                                            <Edit2 className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="p-3 flex-1">
                                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 truncate">Bestellt von: {bestellung.bestelltVon}</div>
                                                                <div className="space-y-1.5">
                                                                    {bestellung.items.slice(0, 3).map((item, i) => (
                                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                                            <span className="text-slate-600 font-medium truncate pr-2">{item.menge} {item.einheit} {item.materialName}</span>
                                                                        </div>
                                                                    ))}

                                                                    {bestellung.bemerkung && (
                                                                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-100/50 text-[10px] text-orange-800 font-medium italic line-clamp-2">
                                                                            "{bestellung.bemerkung}"
                                                                        </div>
                                                                    )}
                                                                    {bestellung.items.length > 3 && (
                                                                        <div className="text-[10px] font-bold text-slate-400 text-center pt-1">+ {bestellung.items.length - 3} weitere Artikel</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-50/50 p-2 border-t border-slate-100 flex justify-between items-center px-4">
                                                                <div className="text-[10px] font-bold text-slate-500">
                                                                    {bestellung.items.filter(i => i.vorbereitet).length} / {bestellung.items.length} vorbereitet
                                                                </div>
                                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn("h-full transition-all duration-500", bestellung.status === 'bereit' || bestellung.status === 'versendet' ? 'bg-emerald-500' : 'bg-orange-500')}
                                                                        style={{ width: `${(bestellung.items.filter(i => i.vorbereitet).length / bestellung.items.length) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState label="Keine Bestellungen vorhanden" icon={Package} />
                                            )}
                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent active={activeTab === 'teams_aufgaben'} className="mt-0 h-full overflow-y-auto bg-slate-50/50 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                                        {/* Teams Spalte */}
                                        <div className="md:col-span-1 border-r border-slate-200 pr-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                    <Users className="h-5 w-5 text-orange-500" />
                                                    Teams ({teams.length})
                                                </h3>
                                                <Link href={`/${projektId}/teams/neu`}>
                                                    <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-bold text-orange-600 border-orange-200 bg-white shadow-sm hover:bg-orange-50 hover:text-orange-700">
                                                        <Plus className="h-3 w-3 mr-1" /> Neues Team
                                                    </Button>
                                                </Link>
                                            </div>
                                            {teams.length === 0 ? (
                                                <div className="text-sm text-center text-slate-400 font-medium bg-white p-6 rounded-xl border border-dashed border-slate-200">
                                                    Keine Teams erstellt.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {teams.map(team => (
                                                        <Card
                                                            key={team.id}
                                                            className={cn("cursor-pointer border-2 transition-all group hover:border-orange-300", selectedTeamId === team.id ? "border-orange-500 shadow-md bg-orange-50/50" : "border-slate-100 bg-white")}
                                                            onClick={() => setSelectedTeamId(team.id)}
                                                        >
                                                            <div className="p-4">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-sm text-slate-800 tracking-tight">{team.name}</h4>
                                                                    <div className="bg-slate-100 text-slate-500 rounded-full h-6 w-6 flex items-center justify-center text-[10px] font-bold">
                                                                        {tasks.filter(t => t.teamId === team.id).length}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Aufgaben Spalte */}
                                        <div className="md:col-span-2 pl-2">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                    <CheckSquare className="h-5 w-5 text-orange-500" />
                                                    {selectedTeamId ? `Zugeordnete Aufgaben` : `Alle Aufgaben (${tasks.length})`}
                                                </h3>
                                                <div className="flex gap-2">
                                                    {selectedTeamId && (
                                                        <Button size="sm" variant="ghost" onClick={() => setSelectedTeamId(null)} className="h-8 text-xs font-bold text-slate-500 hover:text-slate-700">Filter aufheben</Button>
                                                    )}
                                                    <Link href={`/${projektId}/aufgaben/neu`}>
                                                        <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-bold text-orange-600 border-orange-200 bg-white shadow-sm hover:bg-orange-50 hover:text-orange-700">
                                                            <Plus className="h-3 w-3 mr-1" /> Neue Aufgabe
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>

                                            {tasks.filter(t => selectedTeamId ? t.teamId === selectedTeamId : true).length === 0 ? (
                                                <EmptyState label={selectedTeamId ? "Dem Team sind keine Aufgaben zugeordnet." : "Keine Aufgaben gefunden"} icon={CheckSquare} />
                                            ) : (
                                                <div className="space-y-3 pb-8">
                                                    {tasks
                                                        .filter(t => selectedTeamId ? t.teamId === selectedTeamId : true)
                                                        .map(task => (
                                                            <Card key={task.id} className="border border-slate-200 shadow-sm hover:border-orange-300 transition-colors bg-white">
                                                                <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                                    <div>
                                                                        <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest flex items-center gap-1.5">
                                                                            {task.sourceType === 'ts' ? (
                                                                                <span className="text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Layers className="h-3 w-3" /> Aus TS generiert</span>
                                                                            ) : (
                                                                                <span className="text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Manuell</span>
                                                                            )}
                                                                            {task.teamId && teams.find(t => t.id === task.teamId) && (
                                                                                <span className="text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                                                    {teams.find(t => t.id === task.teamId)?.name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <Link href={`/${projektId}/aufgaben/${task.id}`}>
                                                                            <h4 className="font-black text-slate-800 text-sm md:text-base leading-tight hover:text-orange-600 transition-colors cursor-pointer">
                                                                                {task.title}
                                                                            </h4>
                                                                        </Link>
                                                                        {task.description && (
                                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 md:line-clamp-1 font-medium">{task.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                                                        <select
                                                                            className={cn(
                                                                                "bg-white border rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-tight focus:ring-1 focus:ring-orange-500 cursor-pointer hover:border-orange-500 transition-all outline-none",
                                                                                task.status === 'Offen' ? "border-amber-200 text-amber-700" :
                                                                                    task.status === 'In Arbeit' ? "border-blue-200 text-blue-700" :
                                                                                        task.status === 'Erledigt' ? "border-emerald-200 text-emerald-700" :
                                                                                            "border-red-200 text-red-700"
                                                                            )}
                                                                            value={task.status}
                                                                            onChange={async (e) => {
                                                                                const newStatus = e.target.value as any;
                                                                                try {
                                                                                    await TaskService.updateTask(task.id, { projektId, status: newStatus });
                                                                                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, projektId } : t));
                                                                                } catch (err) {
                                                                                    console.error("Failed to update status", err);
                                                                                    toast.error("Fehler beim Aktualisieren");
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="Offen">Offen</option>
                                                                            <option value="In Arbeit">In Arbeit</option>
                                                                            <option value="Erledigt">Erledigt</option>
                                                                            <option value="Blockiert">Blockiert</option>
                                                                        </select>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-right whitespace-nowrap">Priorität:</span>
                                                                            <span className={cn(
                                                                                "text-[10px] font-black uppercase",
                                                                                task.priority === 'Hoch' ? "text-red-500" :
                                                                                    task.priority === 'Mittel' ? "text-amber-500" : "text-emerald-500"
                                                                            )}>{task.priority}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

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

function EmptyState({ label, icon: Icon }: { label: string; icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest text-center">{label}</p>
        </div>
    );
}

