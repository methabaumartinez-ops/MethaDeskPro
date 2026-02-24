'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { FleetService } from '@/lib/services/fleetService';
import { Teilsystem, Mitarbeiter, Fahrzeug } from '@/types';
import {
    Search, Filter, Layers, Link as LinkIcon,
    Users, Car, HardHat, Package, Truck, Plus, CheckCircle2, Clock, Inbox, Trash2, Send, Edit2, MessageSquare,
    Eye, CalendarPlus, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { BestellService } from '@/lib/services/bestellService';
import { MaterialBestellung, BestellungItem, FahrzeugReservierung } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ReservierungModal } from '@/components/shared/ReservierungModal';

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
    ausser_betrieb: { label: 'Außer Betrieb', variant: 'error' },
};

export default function AusfuehrungPage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser, activeProjekt } = useProjekt();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Data States
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [employees, setEmployees] = useState<Mitarbeiter[]>([]);
    const [vehicles, setVehicles] = useState<Fahrzeug[]>([]);
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);

    // Form State for creating new Material Orders
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [newContainerBez, setNewContainerBez] = useState('');
    const [newBemerkung, setNewBemerkung] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<{ name: string, menge: string, einheit: string, tsnummer: string }[]>([{ name: '', menge: '', einheit: '', tsnummer: '' }]);

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
                const [subs, emps, vehs, best] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    EmployeeService.getMitarbeiter(),
                    FleetService.getFahrzeuge(),
                    BestellService.getBestellungen(projektId)
                ]);
                setSubsystems(subs);
                setEmployees(emps);
                setVehicles(vehs);
                setBestellungen(best);

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
        loadData();
    }, [projektId, searchParams]);

    // Filters
    const filteredSubsystems = subsystems.filter(item =>
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const filteredEmployees = employees.filter(emp =>
        (emp.vorname?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (emp.nachname?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (emp.rolle?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (emp.email?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const filteredVehicles = vehicles.filter(veh => {
        const matchesSearch = (veh.bezeichnung?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.inventarnummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (veh.kennzeichen?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesKategorie = selectedKategorie === 'Alle' || veh.kategorie === selectedKategorie;

        return matchesSearch && matchesKategorie;
    });

    const filteredBestellungen = bestellungen.filter(b =>
        (b.containerBez?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (b.bestelltVon?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleAddOrderItem = () => {
        setNewOrderItems([...newOrderItems, { name: '', menge: '', einheit: '', tsnummer: '' }]);
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
            alert('Fehler beim Speichern der Reservierung');
        }
    };

    const handleUpdateOrderItem = (index: number, field: string, value: string) => {
        const updated = [...newOrderItems];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-add new row if user is typing in the last row
        if (index === newOrderItems.length - 1 && value.trim() !== '') {
            updated.push({ name: '', menge: '', einheit: '', tsnummer: '' });
        }

        setNewOrderItems(updated);
    };

    const handleEditOrder = (order: MaterialBestellung) => {
        setEditingOrderId(order.id);
        setNewContainerBez(order.containerBez);
        setNewBemerkung(order.bemerkung || '');
        const mappedItems = order.items.map(item => ({
            name: item.materialName,
            menge: item.menge.toString(),
            einheit: item.einheit,
            tsnummer: item.tsnummer || ''
        }));
        // Add one empty row for easy entry
        mappedItems.push({ name: '', menge: '', einheit: '', tsnummer: '' });
        setNewOrderItems(mappedItems);
        setIsCreatingOrder(true);
    };

    const handleSubmitOrder = async () => {
        if (!newContainerBez.trim()) return alert("Bitte Containerbezeichnung eingeben.");

        const validItems = newOrderItems.filter(item => item.name.trim() !== '' && item.menge.trim() !== '');
        if (validItems.length === 0) return alert("Bitte mindestens ein Material hinzufügen.");

        try {
            const items = validItems.map((item, idx) => ({
                id: `item-${Date.now()}-${idx}`,
                materialName: item.name,
                menge: parseFloat(item.menge),
                einheit: item.einheit || 'Stk',
                vorbereitet: false,
                tsnummer: item.tsnummer || undefined
            }));

            if (editingOrderId) {
                // Update existing order
                const updatedOrder = await BestellService.updateBestellung(editingOrderId, {
                    containerBez: newContainerBez,
                    bemerkung: newBemerkung,
                    items
                });
                setBestellungen(bestellungen.map(b => b.id === editingOrderId ? updatedOrder : b));
            } else {
                // Create new order
                const newOrder = await BestellService.createBestellung({
                    projektId,
                    containerBez: newContainerBez,
                    bemerkung: newBemerkung,
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
            setNewOrderItems([{ name: '', menge: '', einheit: '', tsnummer: '' }]);
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
                {/* Global Actions or Legend could go here */}
            </div>

            <Tabs className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                    <TabsList>
                        <TabsTrigger
                            active={activeTab === 'teilsysteme'}
                            onClick={() => setActiveTab('teilsysteme')}
                            className="flex items-center gap-2"
                        >
                            <Layers className="h-4 w-4" />
                            Teilsysteme
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'logistik'}
                            onClick={() => setActiveTab('logistik')}
                            className="flex items-center gap-2"
                        >
                            <Truck className="h-4 w-4" />
                            Bestellung ({bestellungen.length})
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'mitarbeiter'}
                            onClick={() => setActiveTab('mitarbeiter')}
                            className="flex items-center gap-2"
                        >
                            <Users className="h-4 w-4" />
                            Mitarbeiter ({employees.length})
                        </TabsTrigger>
                        <TabsTrigger
                            active={activeTab === 'fahrzeuge'}
                            onClick={() => setActiveTab('fahrzeuge')}
                            className="flex items-center gap-2"
                        >
                            <Car className="h-4 w-4" />
                            Fahrzeuge ({vehicles.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Shared Search Bar (applies to active tab) */}
                <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
                    <CardHeader className="py-0 px-0 pb-3 border-none">
                        <div className="flex gap-3 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder={
                                        activeTab === 'teilsysteme' ? "Suche nach Nummer oder Name..." :
                                            activeTab === 'mitarbeiter' ? "Suche nach Name o. Rolle..." :
                                                activeTab === 'logistik' ? "Suche nach Container o. Besteller..." :
                                                    "Suche nach Bezeichnung oder Inventarnummer..."
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
                                <TabsContent active={activeTab === 'teilsysteme'} className="mt-0 h-full">
                                    {filteredSubsystems.length > 0 ? (
                                        <div className="overflow-x-auto max-w-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableHead className="w-14 h-8 px-2 font-bold text-foreground text-center text-[10px]">System-Nr.</TableHead>
                                                        <TableHead className="w-10 h-8 px-2 font-bold text-foreground text-[10px]">KS</TableHead>
                                                        <TableHead className="min-w-[140px] h-8 px-2 font-bold text-foreground text-[10px]">Bezeichnung</TableHead>
                                                        <TableHead className="max-w-[100px] h-8 px-2 font-bold text-foreground text-[10px]">Bemerkung</TableHead>
                                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Eröffnet am</TableHead>
                                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Von</TableHead>
                                                        <TableHead className="h-8 px-2 font-bold text-foreground text-[10px]">Frist</TableHead>
                                                        <TableHead className="h-8 px-2 font-bold text-foreground text-[10px]">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSubsystems.map((item) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="group hover:bg-muted/50 transition-colors cursor-pointer"
                                                            onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}?mode=readOnly`)}
                                                        >
                                                            <TableCell className="p-2 font-medium text-foreground text-center text-xs">{item.teilsystemNummer || '—'}</TableCell>
                                                            <TableCell className="p-2 font-bold text-muted-foreground text-xs">{item.ks || '1'}</TableCell>
                                                            <TableCell className="p-2 font-medium text-foreground text-xs min-w-[140px]">{item.name}</TableCell>
                                                            <TableCell className="p-2 text-muted-foreground text-[10px] italic max-w-[100px] truncate" title={item.bemerkung || ''}>{item.bemerkung || '—'}</TableCell>
                                                            <TableCell className="p-2 text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.eroeffnetAm || '—'}</TableCell>
                                                            <TableCell className="p-2 text-[10px] font-black text-foreground whitespace-nowrap">{item.eroeffnetDurch || '—'}</TableCell>
                                                            <TableCell className="p-2 text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.lieferfrist || '—'}</TableCell>
                                                            <TableCell className="p-2">
                                                                <StatusBadge status={item.status} className="scale-90 origin-left" />
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

                                <TabsContent active={activeTab === 'mitarbeiter'} className="mt-0 h-full">
                                    {filteredEmployees.length > 0 ? (
                                        <div className="overflow-x-auto max-w-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Vorname</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Nachname</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Rolle / Funktion</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Abteilung</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Email</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredEmployees.map((emp) => (
                                                        <TableRow key={emp.id} className="hover:bg-muted/50">
                                                            <TableCell className="p-2 px-4 font-medium text-sm text-foreground">{emp.vorname}</TableCell>
                                                            <TableCell className="p-2 px-4 font-bold text-sm text-foreground">{emp.nachname}</TableCell>
                                                            <TableCell className="p-2 px-4 text-xs font-semibold text-primary">{emp.rolle || '—'}</TableCell>
                                                            <TableCell className="p-2 px-4 text-xs text-muted-foreground">{emp.abteilung || '—'}</TableCell>
                                                            <TableCell className="p-2 px-4 text-xs font-mono text-muted-foreground">{emp.email || '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <EmptyState label="Keine Mitarbeiter gefunden" icon={Users} />
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
                                                    Neue Materialbestellung
                                                </h3>
                                                <Button variant="ghost" size="sm" onClick={() => setIsCreatingOrder(false)}>Abbrechen</Button>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Container / Lieferort</label>
                                                    <Input
                                                        placeholder="z.B. Container EG Ost, Werkzeugkiste 3..."
                                                        value={newContainerBez}
                                                        onChange={e => setNewContainerBez(e.target.value)}
                                                        className="font-medium"
                                                    />
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

                                                    <div className="space-y-2">
                                                        {newOrderItems.map((item, idx) => (
                                                            <div key={idx} className="flex gap-2 items-start">
                                                                <Input
                                                                    placeholder="TS-Nr. (opt.)"
                                                                    value={item.tsnummer}
                                                                    onChange={e => handleUpdateOrderItem(idx, 'tsnummer', e.target.value)}
                                                                    className="w-28"
                                                                />
                                                                <Input
                                                                    placeholder="Bezeichnung (z.B. Schrauben M12)"
                                                                    value={item.name}
                                                                    onChange={e => handleUpdateOrderItem(idx, 'name', e.target.value)}
                                                                    className="flex-1"
                                                                />
                                                                <Input
                                                                    placeholder="Menge"
                                                                    type="number"
                                                                    value={item.menge}
                                                                    onChange={e => handleUpdateOrderItem(idx, 'menge', e.target.value)}
                                                                    className="w-24"
                                                                />
                                                                <Input
                                                                    placeholder="Einh."
                                                                    value={item.einheit}
                                                                    onChange={e => handleUpdateOrderItem(idx, 'einheit', e.target.value)}
                                                                    className="w-20"
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                                                    onClick={() => handleRemoveOrderItem(idx)}
                                                                    disabled={newOrderItems.length === 1}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
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
                                                        Bestellung auslösen
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
                                                            setNewContainerBez(activeProjekt ? `${activeProjekt.projektnummer} - ${activeProjekt.projektname}` : '');
                                                            setNewBemerkung('');
                                                            setNewOrderItems([{ name: '', menge: '', einheit: '', tsnummer: '' }]);
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
                                                                    {(bestellung.status === 'angefragt' || bestellung.status === 'in_bearbeitung') && isOrderEditable(bestellung.bestelldatum) && (
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
                            </>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
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

function EmptyState({ label, icon: Icon }: { label: string; icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest text-center">{label}</p>
        </div>
    );
}
