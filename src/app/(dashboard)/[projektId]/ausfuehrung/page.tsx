'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    Users, Car, HardHat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AusfuehrungPage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser } = useProjekt();
    const router = useRouter();

    // Data States
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [employees, setEmployees] = useState<Mitarbeiter[]>([]);
    const [vehicles, setVehicles] = useState<Fahrzeug[]>([]);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'projektleiter' || currentUser?.role === 'mitarbeiter';
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('teilsysteme');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [subs, emps, vehs] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    EmployeeService.getMitarbeiter(),
                    FleetService.getFahrzeuge()
                ]);
                setSubsystems(subs);
                setEmployees(emps);
                setVehicles(vehs);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projektId]);

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

    const filteredVehicles = vehicles.filter(veh =>
        (veh.bezeichnung?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (veh.inventarnummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (veh.kennzeichen?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-3">
            <div className="flex justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight dark:text-slate-100">Ausführung</h2>
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
                                    {filteredVehicles.length > 0 ? (
                                        <div className="overflow-x-auto max-w-full">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Inv-Nr.</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Bezeichnung</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Fabrikat / Typ</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Kennzeichen</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Kategorie</TableHead>
                                                        <TableHead className="h-8 px-4 font-bold text-foreground text-xs">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredVehicles.map((veh) => (
                                                        <TableRow key={veh.id} className="hover:bg-muted/50">
                                                            <TableCell className="p-2 px-4 font-black text-xs text-foreground font-mono">{veh.inventarnummer}</TableCell>
                                                            <TableCell className="p-2 px-4 font-bold text-sm text-foreground">{veh.bezeichnung}</TableCell>
                                                            <TableCell className="p-2 px-4 text-xs font-semibold text-muted-foreground">
                                                                {veh.fabrikat || '—'} {veh.typ ? `/ ${veh.typ}` : ''}
                                                            </TableCell>
                                                            <TableCell className="p-2 px-4 text-xs font-semibold text-muted-foreground">{veh.kennzeichen || '—'}</TableCell>
                                                            <TableCell className="p-2 px-4 text-xs text-muted-foreground">{veh.kategorie}</TableCell>
                                                            <TableCell className="p-2 px-4">
                                                                <span className={cn(
                                                                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded",
                                                                    veh.status === 'verfuegbar' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                        veh.status === 'reserviert' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                                            "bg-slate-100 text-slate-500"
                                                                )}>
                                                                    {veh.status}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <EmptyState label="Keine Fahrzeuge gefunden" icon={Car} />
                                    )}
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}

function EmptyState({ label, icon: Icon }: { label: string, icon: any }) {
    return (
        <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-500">{label}</h3>
        </div>
    );
}
