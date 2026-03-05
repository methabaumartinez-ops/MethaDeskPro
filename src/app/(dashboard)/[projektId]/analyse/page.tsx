'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Clock,
    LayoutDashboard,
    PieChart,
    Table as TableIcon,
    ArrowUpRight,
    ArrowDownRight,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubsystemService } from '@/lib/services/subsystemService';
import { KostenService } from '@/lib/services/kostenService';
import { EmployeeService } from '@/lib/services/employeeService';
import { FleetService } from '@/lib/services/fleetService';
import { MaterialService } from '@/lib/services/materialService';
import { Teilsystem, TsStunden, TsMaterialkosten, Mitarbeiter, ABTEILUNGEN_CONFIG, Fahrzeug, Material, FahrzeugReservierung } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Hammer, Car } from 'lucide-react';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

// Helper to format currency in CHF
const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

export default function AnalysePage() {
    const { projektId } = useParams() as { projektId: string };
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [stunden, setStunden] = useState<TsStunden[]>([]);
    const [materialkosten, setMaterialkosten] = useState<TsMaterialkosten[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [fahrzeuge, setFahrzeuge] = useState<Fahrzeug[]>([]);
    const [reservierungen, setReservierungen] = useState<FahrzeugReservierung[]>([]);
    const [materialInventory, setMaterialInventory] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subs, hrs, mat, emps, fzg, res, minv] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    KostenService.getStunden(undefined, projektId),
                    KostenService.getMaterialkosten(undefined, projektId),
                    EmployeeService.getMitarbeiter(),
                    FleetService.getFahrzeuge(),
                    FleetService.getReservierungen(),
                    MaterialService.getMaterial()
                ]);
                setSubsystems(subs);
                setStunden(hrs);
                setMaterialkosten(mat);
                setMitarbeiter(emps);
                setFahrzeuge(fzg);
                setReservierungen(res.filter(r => r.projektId === projektId));
                setMaterialInventory(minv.filter(m => m.projektId === projektId));
            } catch (error) {
                console.error("Error fetching analysis data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projektId]);

    // --- Calculations ---

    // Total Material Costs
    const totalMaterial = materialkosten.reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0);

    // Total Hours
    const totalHours = stunden.reduce((sum, s) => sum + s.stunden, 0);

    // Total Labor Costs (Stunden * Mitarbeiter Stundensatz)
    const totalLabor = stunden.reduce((sum, s) => {
        if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
        const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
        const rate = emp?.stundensatz ?? 55; // Default rate fallback
        return sum + (s.stunden * rate);
    }, 0);

    const actualCost = totalMaterial + totalLabor;

    // Budget (Removed mock 500k)
    const budgetApproved = 0; // TODO: Fetch from Project if available in DB
    const budgetRemaining = Math.max(0, budgetApproved - actualCost);

    // Production Completion Rate
    const totalSubs = subsystems.length || 1;
    const completedSubs = subsystems.filter(s => s.status === 'abgeschlossen' || s.status === 'verbaut').length;
    const completionRate = Math.round((completedSubs / totalSubs) * 100);

    // Grouping by Teilsystem (TS)
    const tsData = subsystems.map(ts => {
        const tsHrs = stunden.filter(s => s.teilsystemId === ts.id);
        const tsMat = materialkosten.filter(m => m.teilsystemId === ts.id);

        const laborCost = tsHrs.reduce((sum, s) => {
            if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 55));
        }, 0);

        const matCost = tsMat.reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0);
        const hrs = tsHrs.reduce((sum, s) => sum + s.stunden, 0);

        return {
            id: ts.id,
            name: ts.name,
            nr: ts.teilsystemNummer,
            hours: hrs,
            cost: laborCost + matCost,
            status: ts.status,
            abteilung: ts.abteilung
        };
    }).sort((a, b) => {
        const numA = parseInt(a.nr?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.nr?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });

    // Group costs by month for chart
    const monthlyData: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    stunden.forEach(s => {
        const date = new Date(s.datum);
        const month = months[date.getMonth()];
        let cost = 0;
        if (s.gesamtpreis !== undefined) {
            cost = s.gesamtpreis;
        } else {
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            const rate = emp?.stundensatz ?? 80;
            cost = s.stunden * rate;
        }
        monthlyData[month] = (monthlyData[month] || 0) + cost;
    });

    materialkosten.forEach(m => {
        const date = new Date(m.bestelldatum || m.createdAt || Date.now());
        const month = months[date.getMonth()];
        monthlyData[month] = (monthlyData[month] || 0) + (m.gesamtpreis ?? m.menge * m.einzelpreis);
    });

    // Grouping by Department/Entity
    const entityData: Record<string, { actual: number, budget: number, name: string }> = {};

    ABTEILUNGEN_CONFIG.forEach((dept: { id: string, name: string }) => {
        const labor = stunden.filter(s => s.abteilung === dept.name || s.abteilungId === dept.id).reduce((sum, s) => {
            if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 55));
        }, 0);

        // For now, material is assigned to 'Einkauf' as a placeholder or by teilsystem if we had that mapping
        const material = materialkosten.filter(m => {
            // Future: if material had abteilungId, filter by it here
            return dept.id === 'einkauf';
        }).reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0);

        const total = labor + material;
        if (total > 0) {
            entityData[dept.id] = { actual: total, budget: 0, name: dept.name };
        }
    });

    const kpis = [
        { title: 'Kosten total', value: formatCHF(actualCost), icon: DollarSign, color: 'text-violet-600', span: 'lg:col-span-4' },
        { title: 'Kosten Material', value: formatCHF(totalMaterial), icon: Package, color: 'text-amber-600', span: 'lg:col-span-3' },
        { title: 'Kosten Stunden', value: formatCHF(totalLabor), icon: Clock, color: 'text-blue-600', span: 'lg:col-span-3', subValue: `${totalHours.toFixed(2)} h total` }
    ];

    const chartMonths = ['Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug'];

    const productionStats = [
        { label: 'Offen', count: subsystems.filter(s => s.status === 'offen').length, color: 'bg-slate-200' },
        { label: 'In Produktion', count: subsystems.filter(s => s.status === 'in_produktion').length, color: 'bg-blue-500' },
        { label: 'Bestellt', count: subsystems.filter(s => s.status === 'bestellt').length, color: 'bg-amber-500' },
        { label: 'Geliefert', count: subsystems.filter(s => s.status === 'geliefert').length, color: 'bg-emerald-500' },
        { label: 'Verbaut', count: subsystems.filter(s => s.status === 'verbaut').length, color: 'bg-indigo-600' },
        { label: 'Abgeschlossen', count: subsystems.filter(s => s.status === 'abgeschlossen').length, color: 'bg-slate-800' }
    ];

    if (loading) return <div className="p-12 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Analysesystem wird aktualisiert...</div>

    return (
        <div className="flex flex-col gap-10 p-4 pb-20">
            {/* Page Header */}
            <ModuleActionBanner
                icon={BarChart3}
                title="Projekt-Analyse"
            />

            {/* --- SECCIÓN 1: FINANZIELLER ÜBERBLICK --- */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-1 bg-orange-500 rounded-full" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-600">1. Finanzielle Analyse</h3>
                    </div>
                    <span className="bg-white px-4 py-2 rounded-2xl text-[10px] font-black border border-slate-200 text-slate-500 flex items-center gap-2 shadow-sm uppercase tracking-widest">
                        <Clock size={14} className="text-orange-500" />
                        Stand: {new Date().toLocaleDateString('de-CH')}
                    </span>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
                    {kpis.map((kpi, i) => (
                        <Card key={i} className={cn(
                            "border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all rounded-[2rem] flex flex-col h-full",
                            kpi.span
                        )}>
                            <CardContent className="p-6 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-3 rounded-2xl bg-slate-50 group-hover:bg-white transition-colors group-hover:shadow-inner", kpi.color)}>
                                            <kpi.icon size={24} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.title}</p>
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{kpi.value}</h3>
                                    {kpi.subValue && (
                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">
                                            {kpi.subValue}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detail Table Abteilung */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Users size={16} className="text-slate-400" />
                                Finanzen nach Abteilung
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-4">Abteilung</th>
                                        <th className="px-8 py-4 text-right">Ist-Kosten (CHF)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {Object.entries(entityData).map(([id, data], i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-4 font-black text-slate-700 text-sm">{data.name}</td>
                                            <td className="px-8 py-4 font-black text-slate-800 text-sm text-right">{formatCHF(data.actual)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Teilsystem Details */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <LayoutDashboard size={16} className="text-orange-500" />
                                Analyse pro Teilsystem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-left font-sans">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-4">TS-Nummer</th>
                                        <th className="px-4 py-4">Bezeichnung</th>
                                        <th className="px-4 py-4">Abteilung</th>
                                        <th className="px-4 py-4 text-right">Stunden</th>
                                        <th className="px-8 py-4 text-right">Ist-Kosten</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tsData.map((ts, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group text-[10px]">
                                            <td className="px-8 py-4 font-black text-primary">{ts.nr || '—'}</td>
                                            <td className="px-4 py-4 font-bold text-slate-700">{ts.name}</td>
                                            <td className="px-4 py-4">
                                                {ts.abteilung ? (
                                                    <Badge variant={(ABTEILUNGEN_CONFIG.find(a => a.name === ts.abteilung)?.color as any) || 'info'} className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                                                        {ts.abteilung}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[8px] text-slate-300 italic font-medium">n/a</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-600 text-right">{ts.hours.toFixed(2)} h</td>
                                            <td className="px-8 py-4 font-black text-slate-800 text-right">{formatCHF(ts.cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart Months for flow */}
                <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <TrendingUp size={16} className="text-violet-500" />
                            Monatlicher Kostenverlauf
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="flex items-end justify-between h-48 gap-2 px-4">
                            {chartMonths.map((m, i) => {
                                const val = monthlyData[m] || 0;
                                const maxVal = Math.max(...Object.values(monthlyData), actualCost / 6, 1);
                                const h = (val / maxVal) * 100;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group/bar">
                                        <div className="w-full relative flex flex-col justify-end h-full">
                                            <div
                                                className="w-full bg-violet-600 rounded-t-lg transition-all duration-1000 group-hover/bar:bg-violet-500 cursor-help"
                                                style={{ height: `${Math.max(h, 5)}%` }}
                                            >
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-700 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                                    {formatCHF(val)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{m}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- SECCIÓN 2: PRODUKTIONSSTATISTIKEN --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-1 bg-blue-500 rounded-full" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-600">2. Produktionsstatistiken</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Overall Progress Card */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] flex flex-col justify-center items-center p-8">
                        <div className="relative h-40 w-40 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="text-slate-100"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * completionRate) / 100}
                                    strokeLinecap="round"
                                    className="text-blue-500 transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-slate-800">{completionRate}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fertig</span>
                            </div>
                        </div>
                        <p className="mt-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
                            Gesamtfortschritt der Montage
                        </p>
                    </Card>

                    {/* Production Status Detailed */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <PieChart size={16} className="text-blue-500" />
                                Statusverteilung Teilsysteme
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 px-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {productionStats.map((stat, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                            <span className="text-slate-500">{stat.label}</span>
                                            <span className="text-slate-800">{stat.count} Einheiten</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-1000", stat.color)}
                                                style={{ width: `${(stat.count / totalSubs) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- SECCIÓN 3: RESSOURCEN-STATISTIKEN --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-600">3. Ressourcen-Statistiken</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Machinery/Equipment */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] group hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                                    <Hammer size={24} strokeWidth={2.5} />
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase">Maschinen</Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Maquinaria / Geräte</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                                    {fahrzeuge.filter(f => !['pkw', 'lkw', 'transporter'].includes(f.kategorie as any)).length}
                                </h3>
                                <span className="text-xs font-bold text-slate-400">Einheiten</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Verfügbar:</span>
                                <span className="text-emerald-600">{fahrzeuge.filter(f => f.status === 'verfuegbar' && !['pkw', 'lkw', 'transporter'].includes(f.kategorie as any)).length}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Materials */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] group hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                                    <Package size={24} strokeWidth={2.5} />
                                </div>
                                <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] uppercase">Bestand</Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Materialien / Lager</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                                    {materialInventory.length}
                                </h3>
                                <span className="text-xs font-bold text-slate-400">Positionen</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Gesamtwert:</span>
                                <span className="text-amber-600">{formatCHF(materialInventory.reduce((s, m) => s + (m.preis || 0) * (m.menge || 1), 0))}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vehicles */}
                    <Card className="border-none shadow-sm bg-white rounded-[2rem] group hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                    <Car size={24} strokeWidth={2.5} />
                                </div>
                                <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[9px] uppercase">Fuhrpark</Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Fahrzeuge / Fleet</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                                    {fahrzeuge.filter(f => ['pkw', 'lkw', 'transporter'].includes(f.kategorie as any) || !f.kategorie).length}
                                </h3>
                                <span className="text-xs font-bold text-slate-400">Fahrzeuge</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Aktiv Reserviert:</span>
                                <span className="text-blue-600">{reservierungen.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
