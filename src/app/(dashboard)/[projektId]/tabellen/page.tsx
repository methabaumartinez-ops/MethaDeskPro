'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table as TableIcon,
    Database,
    LayoutList,
    Users,
    Truck,
    Package as PackageIcon,
    Settings,
    HardDrive,
    Box,
    Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectService } from '@/lib/services/projectService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { PositionService } from '@/lib/services/positionService';
import { MaterialService } from '@/lib/services/materialService';
import { SupplierService } from '@/lib/services/supplierService';
import { EmployeeService } from '@/lib/services/employeeService';
import { FleetService } from '@/lib/services/fleetService';
import { useParams } from 'next/navigation';

export default function TabellenPage() {
    const { projektId } = useParams() as { projektId: string };
    const [activeTable, setActiveTable] = useState('projekte');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState<string[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState(projektId);

    const tables = [
        { id: 'projekte', label: 'Projekte', icon: LayoutList, description: 'Alle Projekte und deren Status' },
        { id: 'teilsysteme', label: 'Teilsysteme', icon: Database, description: 'Produktionsdaten und Systeme' },
        { id: 'positionen', label: 'Positionen', icon: TableIcon, description: 'Detaillierte Positionen' },
        { id: 'material', label: 'Material', icon: Box, description: 'Materialkatalog und Inventar' },
        { id: 'lieferanten', label: 'Lieferanten', icon: Truck, description: 'Lieferantenverzeichnis' },
        { id: 'mitarbeiter', label: 'Mitarbeiter', icon: Users, description: 'Personaldaten' },
        { id: 'fahrzeuge', label: 'Fahrzeuge', icon: Car, description: 'Fuhrpark und Maschinen' },
    ];

    useEffect(() => {
        const loadCounts = async () => {
            try {
                const allProjects = await ProjectService.getProjekte();
                setProjects(allProjects);
            } catch (error) {
                console.error("Failed to load projects:", error);
            }
        };
        loadCounts();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setData([]);
            setColumns([]);
            try {
                // Pre-fetch projects for lookups
                const allProjects = await ProjectService.getProjekte();
                const projectMap = new Map(allProjects.map(p => [p.id, p]));

                let result: any[] = [];
                switch (activeTable) {
                    case 'projekte':
                        result = allProjects;
                        if (selectedProject && selectedProject !== 'all') {
                            result = result.filter(p => p.id === selectedProject);
                        }
                        break;
                    case 'teilsysteme':
                        const allSystems = await SubsystemService.getTeilsysteme();
                        // Filter
                        if (selectedProject && selectedProject !== 'all') {
                            result = allSystems.filter(s => s.projektId === selectedProject);
                        } else {
                            result = allSystems;
                        }
                        // Enrich with Project Name
                        result = result.map(sys => {
                            const p = projectMap.get(sys.projektId);
                            return {
                                ...sys,
                                Projekt: p ? `${p.projektnummer} - ${p.projektname}` : sys.projektId // Add explicit Projekt column
                            };
                        });
                        break;
                    case 'positionen':
                        const allPos = await PositionService.getPositionen();
                        const allSystemsForPos = await SubsystemService.getTeilsysteme();
                        const sysMap = new Map(allSystemsForPos.map(s => [s.id, s]));

                        // Enrich and filter
                        result = allPos.map(pos => {
                            const sys = sysMap.get(pos.teilsystemId);
                            const p = sys ? projectMap.get(sys.projektId) : undefined;
                            return {
                                ...pos,
                                Projekt: p ? `${p.projektnummer} - ${p.projektname}` : '–',
                                Teilsystem: sys ? sys.name : '–',
                                _projektId: p?.id // Internal for filtering
                            };
                        });

                        if (selectedProject && selectedProject !== 'all') {
                            result = result.filter(r => r._projektId === selectedProject);
                        }
                        break;
                    case 'material':
                        const allMat = await MaterialService.getMaterial();
                        // Need deep link: Material -> Position -> Teilsystem -> Projekt
                        // Fetch positions if not already
                        const posRes = await PositionService.getPositionen();
                        const posMap = new Map(posRes.map(p => [p.id, p]));

                        const sysRes = await SubsystemService.getTeilsysteme();
                        const sysMapMat = new Map(sysRes.map(s => [s.id, s]));

                        result = allMat.map(m => {
                            const pos = m.positionId ? posMap.get(m.positionId) : undefined;
                            const sys = pos ? sysMapMat.get(pos.teilsystemId) : undefined;
                            const p = sys ? projectMap.get(sys.projektId) : undefined;
                            return {
                                ...m,
                                Projekt: p ? `${p.projektnummer} - ${p.projektname}` : '–',
                                Position: pos ? pos.name : '–',
                                _projektId: p?.id
                            };
                        });

                        if (selectedProject && selectedProject !== 'all') {
                            result = result.filter(r => r._projektId === selectedProject);
                        }
                        break;
                    case 'lieferanten':
                        result = await SupplierService.getLieferanten();
                        break;
                    case 'mitarbeiter':
                        result = await EmployeeService.getMitarbeiter();
                        break;
                    case 'fahrzeuge':
                        result = await FleetService.getFahrzeuge();
                        break;
                }
                setData(result);
                if (result.length > 0) {
                    const first = result[0];
                    // Prioritize specific columns for certain tables
                    let keys = Object.keys(first).filter(k =>
                        !k.startsWith('_') &&
                        (typeof first[k] !== 'object' || first[k] === null || Array.isArray(first[k]) === false)
                    );

                    if (activeTable === 'fahrzeuge') {
                        // Ensure essential columns are present and at the start
                        const essential = ['bezeichnung', 'inventarnummer', 'fabrikat', 'typ', 'status'];
                        keys = [...essential, ...keys.filter(k => !essential.includes(k.toLowerCase()))];
                    }

                    // Reorder to put labels first if they exist
                    const cols = keys.sort((a, b) => {
                        if (a === 'Projekt' || a === 'bezeichnung' || a === 'name') return -1;
                        if (b === 'Projekt' || b === 'bezeichnung' || b === 'name') return 1;
                        if (a === 'status') return 1; // Put status near end
                        return 0;
                    });

                    setColumns(cols.slice(0, 10)); // Show more columns
                }
            } catch (error) {
                console.error("Failed to load table data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeTable, selectedProject]);

    const renderCellContent = (value: any) => {
        if (value === null || value === undefined) return <span className="text-slate-300">-</span>;
        if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
        return String(value);
    };

    const handleExport = () => {
        if (data.length === 0) return;

        const headers = columns.join(',');
        const rows = data.map(row =>
            columns.map(col => {
                const val = row[col];
                const cleanVal = (val === null || val === undefined) ? '' : String(val).replace(/"/g, '""');
                return `"${cleanVal}"`;
            }).join(',')
        );

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${activeTable}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-8rem)] gap-6">
            {/* Sidebar Menu - Desktop */}
            <div className="w-64 shrink-0 hidden md:block border-r pr-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Tabellen
                    </h2>
                    <p className="text-xs text-muted-foreground">Datenbank-Übersicht</p>
                </div>

                <div className="space-y-4">
                    {/* Project Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Projekt Filter</label>
                        <Select
                            value={selectedProject || 'all'}
                            onChange={(e) => setSelectedProject(e.target.value === 'all' ? '' : e.target.value)}
                            options={[
                                { label: 'Alle Projekte', value: 'all' },
                                ...projects.map(p => ({ label: `${p.projektnummer} - ${p.projektname}`, value: p.id }))
                            ]}
                        />
                    </div>

                    <div className="space-y-1">
                        {tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => setActiveTable(table.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left",
                                    activeTable === table.id
                                        ? "bg-white text-primary shadow-sm border"
                                        : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                                )}
                            >
                                <table.icon className="h-4 w-4" />
                                <div className="flex flex-col">
                                    <span>{table.label}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Menu - Dropdown */}
            <div className="md:hidden w-full space-y-4">
                <Select
                    value={activeTable}
                    onChange={(e) => setActiveTable(e.target.value)}
                    options={tables.map(t => ({ label: t.label, value: t.id }))}
                    className="w-full bg-white"
                />
                <Select
                    value={selectedProject || 'all'}
                    onChange={(e) => setSelectedProject(e.target.value === 'all' ? '' : e.target.value)}
                    options={[
                        { label: 'Alle Projekte', value: 'all' },
                        ...projects.map(p => ({ label: `${p.projektnummer} - ${p.projektname}`, value: p.id }))
                    ]}
                    className="w-full bg-slate-100"
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 rounded-xl border p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                {tables.find(t => t.id === activeTable)?.icon &&
                                    React.createElement(tables.find(t => t.id === activeTable)!.icon, { className: "h-6 w-6 text-slate-400" })
                                }
                                {tables.find(t => t.id === activeTable)?.label}
                            </h1>
                            <p className="text-muted-foreground">
                                {tables.find(t => t.id === activeTable)?.description}
                                {selectedProject && selectedProject !== 'all' && (
                                    <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-mono">
                                        Filter: {projects.find(p => p.id === selectedProject)?.projektnummer} - {projects.find(p => p.id === selectedProject)?.name}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4 mr-2" />
                                Spalten
                            </Button>
                            <Button size="sm" onClick={handleExport}>
                                <HardDrive className="h-4 w-4 mr-2" />
                                Exportieren
                            </Button>
                        </div>
                    </div>

                    <Card className="border-none shadow-none bg-white">
                        <CardContent className="p-0 min-h-[400px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-4 text-muted-foreground">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                    <p>Lade Daten...</p>
                                </div>
                            ) : data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-20 gap-4 text-muted-foreground opacity-50">
                                    <Database className="h-12 w-12" />
                                    <p>Keine Einträge in dieser Tabelle gefunden.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                {columns.map(col => (
                                                    <TableHead key={col} className="font-bold uppercase text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {col}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.map((row, i) => (
                                                <TableRow key={i} className="hover:bg-slate-50/50">
                                                    {columns.map(col => (
                                                        <TableCell key={`${i}-${col}`} className="text-xs font-medium whitespace-nowrap max-w-[200px] truncate">
                                                            {renderCellContent(row[col])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
