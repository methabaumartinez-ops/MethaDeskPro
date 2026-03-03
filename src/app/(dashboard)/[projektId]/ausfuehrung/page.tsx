'use client';
import { showAlert } from '@/lib/alert';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SubsystemService } from '@/lib/services/subsystemService';
import { FleetService } from '@/lib/services/fleetService';
import { TeamService } from '@/lib/services/teamService';
import { TaskService } from '@/lib/services/taskService';
import { cn } from '@/lib/utils';
import {
    Search, Filter, Layers, Link as LinkIcon,
    Car, HardHat, Package, Truck, Plus, CheckCircle2, Clock, Inbox, Trash2, Send, Edit2, MessageSquare,
    Eye, CalendarPlus, Wrench, Camera, ArrowLeft, Users, CheckSquare, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { MaterialBestellung, BestellungItem, FahrzeugReservierung, ABTEILUNGEN_CONFIG, Mitarbeiter, Teilsystem, Fahrzeug } from '@/types';
import { Team, Worker, Task, TaskStatus } from '@/types/ausfuehrung';
import { Badge } from '@/components/ui/badge';
import { ReservierungModal } from '@/components/shared/ReservierungModal';
import { TaskForm } from '@/components/ausfuehrung/TaskForm';
import { TeamForm } from '@/components/ausfuehrung/TeamForm';
import { TaskStatusBadge } from '@/components/ausfuehrung/TaskStatusBadge';
import { SubtaskService } from '@/lib/services/subtaskService';
import { WorkerService } from '@/lib/services/workerService';
import { EmployeeService } from '@/lib/services/employeeService';
import { BestellService } from '@/lib/services/bestellService';
import { X, ClipboardList, FileQuestion, ArrowRight, Info, Users as UsersIcon } from 'lucide-react';

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
    const searchParams = useSearchParams();

    // Data States
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [vehicles, setVehicles] = useState<Fahrzeug[]>([]);
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [workersData, setWorkersData] = useState<Record<string, Worker>>({});
    const [taskStats, setTaskStats] = useState<Record<string, { total: number, done: number }>>({});
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // Filter states for tasks
    const [filterTeamId, setFilterTeamId] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Dialog/Form states
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

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

    const loadData = async () => {
        try {
            setLoading(true);
            // Sync Bau Teilsysteme to Tasks
            await TaskService.syncBauTeilsysteme(projektId);

            const [subs, vehs, best, tms, fetchedTasks, mitsRes, allWorkers] = await Promise.all([
                SubsystemService.getTeilsysteme(projektId),
                FleetService.getFahrzeuge(),
                BestellService.getBestellungen(projektId),
                TeamService.getTeams(projektId),
                TaskService.getTasks({ projektId }),
                EmployeeService.getMitarbeiter(),
                WorkerService.getAllWorkers(projektId)
            ]);

            setSubsystems(subs as Teilsystem[]);
            setVehicles(vehs);
            setBestellungen(best);
            setTeams(tms as any[]);
            setTasks(fetchedTasks as any[]);
            setMitarbeiter(mitsRes);

            const wMap: Record<string, Worker> = {};
            allWorkers.forEach(w => { wMap[w.id] = w; });
            setWorkersData(wMap);

            // Compute subtask stats to show progress
            const statsMap: Record<string, { total: number, done: number }> = {};
            for (const task of fetchedTasks) {
                const subT = await SubtaskService.getSubtasksByTaskId(task.id);
                statsMap[task.id] = {
                    total: subT.length,
                    done: subT.filter(s => s.status === 'fertig').length
                };
            }
            setTaskStats(statsMap);

            // Handle tab parameter
            const tab = searchParams.get('tab');
            if (tab) {
                setActiveTab(tab);
            }

            // Check for edit parameter in URL
            const editId = searchParams.get('edit');
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

    useEffect(() => {
        loadData();
    }, [projektId, searchParams]);

    // Filters
    const filteredSubsystems = subsystems.filter(item => {
        const matchesSearch = (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (item.name?.toLowerCase() || '').includes(search.toLowerCase());

        if (activeTab === 'ts_baustelle') {
            // "TS am Baustelle" defined as those in department 'Bau' OR with status 'geliefert'/'verbaut'
            return matchesSearch && (item.abteilung === 'Bau' || item.status === 'geliefert' || item.status === 'verbaut');
        }
        return matchesSearch;
    }).sort((a, b) => {
        const numA = parseInt(a.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });

    const filteredBestellungen = bestellungen.filter(b =>
        (b.containerBez?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (b.bestelltVon?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const filteredVehicles = vehicles.filter(veh => {
        const matchesSearch = (veh.bezeichnung?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.inventarnummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.kennzeichen?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesKategorie = selectedKategorie === 'Alle' || veh.kategorie === selectedKategorie;

        return matchesSearch && matchesKategorie;
    });

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = (t.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (t.description?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesTeam = filterTeamId === 'all' || t.teamId === filterTeamId;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

        return matchesSearch && matchesTeam && matchesStatus;
    });

    const filteredTeams = teams.filter(t =>
        (t.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.description?.toLowerCase() || '').includes(search.toLowerCase())
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
            showAlert('Fehler beim Speichern der Reservierung');
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
            showAlert('Fehler beim Hochladen des Bildes');
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
        if (!newContainerBez.trim()) return showAlert("Bitte Containerbezeichnung eingeben.");

        const validItems = newOrderItems.filter(item => item.name.trim() !== '' && item.menge.trim() !== '');
        if (validItems.length === 0) return showAlert("Bitte mindestens ein Material hinzufügen.");

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
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-primary tracking-tight dark:text-orange-400">Ausführung</h2>
                    <p className="text-slate-500 font-medium text-xs">Übersicht und Ressourcen.</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
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
                            TS (Alle)
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
                            active={activeTab === 'tasks'}
                            onClick={() => setActiveTab('tasks')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'tasks'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Aufgaben ({tasks.length})
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'teams'}
                            onClick={() => setActiveTab('teams')}
                            className={cn(
                                "flex items-center gap-2 font-black text-xs uppercase px-6 h-11 rounded-full border-2 transition-all",
                                activeTab === 'teams'
                                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-orange-200 hover:text-orange-600"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            Teams ({teams.length})
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
                    </TabsList>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
                    <CardHeader className="py-0 px-0 pb-3 border-none">
                        <div className="flex gap-3 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={
                                        activeTab === 'teilsysteme' || activeTab === 'ts_baustelle' ? "Suche nach Nummer o. Name..." :
                                            activeTab === 'logistik' ? "Suche nach Container o. Besteller..." :
                                                activeTab === 'tasks' ? "Suche nach Aufgabe o. Beschreibung..." :
                                                    activeTab === 'teams' ? "Suche nach Team o. Beschreibung..." :
                                                        "Suche nach Bezeichnung o. Inventarnummer..."
                                    }
                                    className="pl-10 h-9 text-sm bg-background border-slate-200 dark:border-slate-800"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="gap-2 font-bold h-9">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>
                        </div>
                    </CardHeader>

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
                                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                                                        <TableHead className="w-20 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">System-Nr.</TableHead>
                                                        <TableHead className="w-12 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                                                        <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Bezeichnung</TableHead>
                                                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Abteilung</TableHead>
                                                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                                                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Status</TableHead>
                                                        <TableHead className="px-4 py-4 text-right font-black text-foreground text-[10px] uppercase tracking-wider">Aktionen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSubsystems.map((item) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="group hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-border/50"
                                                            onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}?mode=readOnly`)}
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
                                                                <Badge variant={(ABTEILUNGEN_CONFIG.find(a => a.name === item.abteilung)?.color as any) || 'info'} className="font-bold text-[10px] uppercase">
                                                                    {item.abteilung || '—'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="p-4">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 w-12">Montage:</span>
                                                                        <span className="text-[10px] font-black text-orange-600">{item.montagetermin || '—'}</span>
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
                                                                                    showAlert("Fehler beim Aktualisieren des Status");
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
                                    <div className="bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 mb-4 scrollbar-hide">
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
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Bezeichnung</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Inv.-Nr.</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Fabrikat / Typ</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Kennz.</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Baujahr</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Geprüft bis</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs">Status</TableHead>
                                                        <TableHead className="h-10 px-4 font-bold text-foreground text-xs text-right">Aktionen</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredVehicles.map((item) => {
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

                                <TabsContent active={activeTab === 'logistik'} className="mt-0 h-full flex flex-col p-4 bg-slate-50/50">
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
                                                            <div key={idx} className="flex flex-col gap-1.5 p-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
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

                                <TabsContent active={activeTab === 'tasks'} className="mt-0 h-full overflow-y-auto bg-slate-50/50 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                                <ClipboardList className="h-6 w-6 text-orange-500" />
                                                Aufgaben Management
                                            </h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Überblick über alle Projektaktivitäten</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                                                <Filter className="h-3.5 w-3.5 text-slate-400" />
                                                <select
                                                    className="text-xs font-bold text-slate-600 bg-transparent outline-none focus:ring-0"
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                >
                                                    <option value="all">Alle Zustände</option>
                                                    <option value="offen">Offen</option>
                                                    <option value="in_arbeit">In Arbeit</option>
                                                    <option value="blockiert">Blockiert</option>
                                                    <option value="fertig">Fertig</option>
                                                </select>
                                            </div>
                                            <Button
                                                onClick={() => { setIsTaskDialogOpen(true); setEditingOrder(null); }}
                                                className="h-10 px-6 font-black text-xs uppercase rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 transition-all active:scale-95"
                                            >
                                                <Plus className="h-4 w-4 mr-2" /> Neue Aufgabe
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTasks.length === 0 ? (
                                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                                                <ClipboardList className="h-12 w-12 text-slate-200 mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Keine Aufgaben gefunden</p>
                                            </div>
                                        ) : (
                                            filteredTasks.map(task => (
                                                <Card key={task.id} className="group relative overflow-hidden border-2 border-slate-100 hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-100/50 bg-white rounded-2xl">
                                                    <div className="p-5">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="space-y-1">
                                                                <TaskStatusBadge status={task.status} size="sm" />
                                                                {task.priority && (
                                                                    <div className={cn(
                                                                        "text-[10px] font-black uppercase tracking-widest ml-1 px-1.5 py-0.5 rounded",
                                                                        task.priority === 'hoch' ? "text-red-600 bg-red-50" :
                                                                            task.priority === 'mittel' ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50"
                                                                    )}>
                                                                        {task.priority} Prio
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        if (confirm('Aufgabe löschen?')) {
                                                                            TaskService.deleteTask(task.id).then(() => loadData());
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <Link href={`/${projektId}/ausfuehrung/tasks/${task.id}`}>
                                                            <h4 className="font-black text-slate-800 text-lg leading-tight hover:text-orange-600 transition-colors cursor-pointer line-clamp-2 min-h-[3rem]">
                                                                {task.title}
                                                            </h4>
                                                        </Link>

                                                        {task.description && (
                                                            <p className="text-sm text-slate-500 mt-2 font-medium line-clamp-2 min-h-[2.5rem]">{task.description}</p>
                                                        )}

                                                        <div className="mt-5 pt-4 border-t border-slate-50 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span className="text-xs font-bold text-slate-600">
                                                                        {task.teamId && teams.find(t => t.id === task.teamId)
                                                                            ? teams.find(t => t.id === task.teamId)?.name
                                                                            : "Unzugeordnet"
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs font-black text-slate-400">
                                                                    {taskStats[task.id] && taskStats[task.id].total > 0 ? (
                                                                        <span className="flex items-center gap-1.5 text-emerald-600">
                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                            {taskStats[task.id].done}/{taskStats[task.id].total} Subtasks
                                                                        </span>
                                                                    ) : (
                                                                        "0 Subtasks"
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {taskStats[task.id] && taskStats[task.id].total > 0 && (
                                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-orange-500 transition-all duration-500"
                                                                        style={{ width: `${(taskStats[task.id].done / taskStats[task.id].total) * 100}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-50/80 px-5 py-3 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span>ID: {task.id.slice(0, 8)}</span>
                                                        <span className="flex items-center gap-1">
                                                            <CalendarPlus className="h-3 w-3" />
                                                            {new Date(task.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent active={activeTab === 'teams'} className="mt-0 h-full overflow-y-auto bg-slate-50/50 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                                <UsersIcon className="h-6 w-6 text-orange-500" />
                                                Teamübersicht
                                            </h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Struktur und Teammitglieder</p>
                                        </div>
                                        <Button
                                            onClick={() => setIsTeamDialogOpen(true)}
                                            className="h-10 px-6 font-black text-xs uppercase rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 transition-all active:scale-95"
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Neues Team
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredTeams.length === 0 ? (
                                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                                                <UsersIcon className="h-12 w-12 text-slate-200 mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Keine Teams definiert</p>
                                            </div>
                                        ) : (
                                            filteredTeams.map(team => (
                                                <Card key={team.id} className="relative overflow-hidden border-2 border-slate-100 hover:border-orange-500 transition-all hover:shadow-xl bg-white rounded-2xl">
                                                    <div className="p-6">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <h4 className="text-lg font-black text-slate-800 tracking-tight">{team.name}</h4>
                                                            <div className="flex gap-1 shrink-0">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-600">
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                                    onClick={() => {
                                                                        if (confirm('Team löschen?')) {
                                                                            TeamService.deleteTeam(team.id).then(() => loadData());
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {team.description && (
                                                            <p className="text-sm text-slate-500 font-medium mb-6">{team.description}</p>
                                                        )}

                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                                                                <span>Mitglieder</span>
                                                                <span>{team.members?.length || 0} Personen</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                                                {team.members?.map(wId => {
                                                                    const worker = workersData[wId];
                                                                    const employee = mitarbeiter.find(m => m.id === worker?.id);
                                                                    return (
                                                                        <Badge key={wId} variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1">
                                                                            {worker?.fullName || "Unbekannt"}
                                                                        </Badge>
                                                                    );
                                                                })}
                                                                {(!team.members || team.members.length === 0) && (
                                                                    <p className="text-xs text-slate-300 italic font-medium">Keine Mitglieder zugeordnet</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-8">
                                                            <Button
                                                                variant="outline"
                                                                className="w-full h-10 text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 hover:border-orange-500 hover:text-orange-600 transition-all rounded-xl"
                                                            >
                                                                <UserPlus className="h-3.5 w-3.5 mr-2" />
                                                                Mitglieder verwalten
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ReservierungModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedFahrzeug(undefined); }}
                onSave={handleSaveReservierung}
                fahrzeug={selectedFahrzeug}
                projektId={projektId}
            />

            <TaskForm
                isOpen={isTaskDialogOpen}
                onClose={() => setIsTaskDialogOpen(false)}
                onSave={async (data) => {
                    await TaskService.createTask({ ...data, projektId });
                    setIsTaskDialogOpen(false);
                    loadData();
                }}
                teams={teams}
                mitarbeiter={mitarbeiter}
                proyectoId={projektId}
                teilsysteme={subsystems}
            />

            <TeamForm
                isOpen={isTeamDialogOpen}
                onClose={() => setIsTeamDialogOpen(false)}
                onSave={async (data) => {
                    await TeamService.createTeam({ ...data, projektId });
                    setIsTeamDialogOpen(false);
                    loadData();
                }}
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

