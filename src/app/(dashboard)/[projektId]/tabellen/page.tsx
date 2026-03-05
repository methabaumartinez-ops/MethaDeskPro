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
    Car,
    Edit2,
    Trash2,
    Plus
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
import { SubunternehmerService } from '@/lib/services/subunternehmerService';
import { useParams, useRouter } from 'next/navigation';
import { ABTEILUNGEN_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

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
        { id: 'lieferanten', label: 'Lieferanten', icon: Truck, description: 'Lieferantenverzeichnis' },
        { id: 'subunternehmer', label: 'Subunternehmer', icon: Users, description: 'Subunternehmer-Verwaltung' },
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
                        }).sort((a, b) => {
                            const numA = parseInt(a.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
                            const numB = parseInt(b.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
                            return numA - numB;
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
                                TSNummer: sys ? sys.teilsystemNummer : '–',
                                Teilsystem: sys ? `${sys.teilsystemNummer || '—'} - ${sys.name}` : '–',
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
                                TSNummer: sys ? sys.teilsystemNummer : '–',
                                Teilsystem: sys ? `${sys.teilsystemNummer || '—'} - ${sys.name}` : '–',
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
                    case 'subunternehmer':
                        result = await SubunternehmerService.getSubunternehmer();
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
                        !['teilsystemid', 'projektid', 'positionid', 'id'].includes(k.toLowerCase()) &&
                        (typeof first[k] !== 'object' || first[k] === null || Array.isArray(first[k]) === false)
                    );

                    if (activeTable === 'fahrzeuge') {
                        // Ensure essential columns are present and at the start
                        const essential = ['bezeichnung', 'inventarnummer', 'fabrikat', 'typ', 'status'];
                        keys = [...essential, ...keys.filter(k => !essential.includes(k.toLowerCase()))];
                    }

                    if (activeTable === 'mitarbeiter') {
                        // Hide ID and sensitive fields for employees
                        keys = keys.filter(k => !['passwordHash', 'confirmationToken'].includes(k));
                    }

                    // Reorder to put labels first if they exist
                    let cols = keys.sort((a, b) => {
                        const priorities: Record<string, number> = {
                            'projekt': 1,
                            'tsnummer': 2,
                            'name': 3,
                            'bezeichnung': 3,
                            'teilsystem': 4,
                            'position': 5,
                            'status': 100
                        };
                        const prioA = priorities[a.toLowerCase()] || 50;
                        const prioB = priorities[b.toLowerCase()] || 50;
                        return prioA - prioB;
                    });

                    if (activeTable === 'mitarbeiter' || activeTable === 'subunternehmer') {
                        cols.push('Aktionen');
                    }

                    if (activeTable === 'teilsysteme') {
                        const specificOrder = [
                            'Projekt',
                            'name',
                            'teilsystemNummer',
                            'ks',
                            'beschreibung',
                            'bemerkung',
                            'eroeffnetAm',
                            'eroeffnetDurch'
                        ];
                        // Filter to only include keys we actually have, excluding ID for now
                        const ordered = specificOrder.filter(k => keys.some(key => key.toLowerCase() === k.toLowerCase()));
                        const remaining = keys.filter(k =>
                            !specificOrder.some(sk => sk.toLowerCase() === k.toLowerCase()) &&
                            k.toLowerCase() !== 'id'
                        );
                        cols = [...ordered, ...remaining];
                        // Push ID to the absolute end
                        if (keys.some(k => k.toLowerCase() === 'id')) {
                            cols = cols.filter(k => k.toLowerCase() !== 'id');
                            cols.push('id');
                        }
                    }

                    // Ensure ID is kept ONLY if it's the projects table where it might be useful as a fallback
                    // but generally we want it gone for Positions/Material
                    let finalCols = cols.slice(0, 12);

                    setColumns(finalCols);
                }
            } catch (error) {
                console.error("Failed to load table data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeTable, selectedProject]);

    const router = useRouter();

    const renderCellContent = (value: any, colName?: string, row?: any) => {
        if (value === null || value === undefined) return <span className="text-slate-300">-</span>;
        if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';

        // Handle Abteilung badges
        if (colName?.toLowerCase() === 'abteilung' || colName?.toLowerCase() === 'abteilungname') {
            const dept = ABTEILUNGEN_CONFIG.find(a => a.name === value);
            if (dept) {
                return (
                    <Badge variant={(dept.color as any) || 'info'} className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                        {value}
                    </Badge>
                );
            }
        }

        if (colName?.toLowerCase() === 'aktionen') {
            return (
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (activeTable === 'mitarbeiter') {
                                router.push(`/${projektId}/mitarbeiter/${row.id}/edit`);
                            } else if (activeTable === 'subunternehmer') {
                                // Simple prompt for now as requested minimal diff
                                const name = prompt('Name (ss):', row.name);
                                if (name) SubunternehmerService.updateSubunternehmer(row.id, { name }).then(() => window.location.reload());
                            }
                        }}
                    >
                        <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Löschen?')) {
                                if (activeTable === 'subunternehmer') {
                                    SubunternehmerService.deleteSubunternehmer(row.id).then(() => window.location.reload());
                                }
                            }
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            )
        }

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
        <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
            <ModuleActionBanner
                icon={TableIcon}
                title="Datenbank-Tabellen"
                ctaLabel="Export (.csv)"
                ctaOnClick={handleExport}
                ctaIcon={HardDrive}
            />

            <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0">
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
                <div className="flex-1 overflow-hidden bg-slate-50/50 rounded-xl border flex flex-col">
                    <div className="p-6 flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {tables.find(t => t.id === activeTable)?.icon &&
                                        React.createElement(tables.find(t => t.id === activeTable)!.icon, { className: "h-5 w-5 text-primary" })
                                    }
                                    {tables.find(t => t.id === activeTable)?.label}
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    {tables.find(t => t.id === activeTable)?.description}
                                    {selectedProject && selectedProject !== 'all' && !['mitarbeiter', 'lieferanten', 'fahrzeuge'].includes(activeTable) && (
                                        <span className="ml-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                            {projects.find(p => p.id === selectedProject)?.projektname}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {(activeTable === 'mitarbeiter' || activeTable === 'subunternehmer') && (
                                    <Button
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] h-9 px-4 rounded-lg shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                        onClick={() => {
                                            if (activeTable === 'mitarbeiter') {
                                                router.push(`/${projektId}/mitarbeiter/erfassen`);
                                            } else {
                                                const name = prompt('Name des Subunternehmers (ss):');
                                                if (name) SubunternehmerService.createSubunternehmer({ name }).then(() => window.location.reload());
                                            }
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Hinzufügen
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Card className="border-none shadow-none bg-white flex-1 min-h-0 flex flex-col">
                            <CardContent className="p-0 flex-1 overflow-y-auto">
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
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-orange-50/50">
                                                <TableRow>
                                                    {columns.map(col => (
                                                        <TableHead key={col} className={cn(
                                                            "font-bold uppercase text-[10px] text-orange-600 whitespace-nowrap",
                                                            col.toLowerCase() === 'id' ? "text-right" : "text-left"
                                                        )}>
                                                            {col}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-slate-50/50">
                                                        {columns.map(col => (
                                                            <TableCell key={`${i}-${col}`} className={cn(
                                                                "text-xs font-medium whitespace-nowrap max-w-[200px] truncate",
                                                                col.toLowerCase() === 'id' || col.toLowerCase() === 'aktionen' ? "text-right" : "text-left"
                                                            )}>
                                                                {renderCellContent(row[col], col, row)}
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
        </div>
    );
}
