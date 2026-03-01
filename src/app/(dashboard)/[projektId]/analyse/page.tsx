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
import { Teilsystem, TsStunden, TsMaterialkosten, Mitarbeiter, ABTEILUNGEN_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subs, hrs, mat, emps] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    KostenService.getStunden(undefined, projektId),
                    KostenService.getMaterialkosten(undefined, projektId),
                    EmployeeService.getMitarbeiter()
                ]);
                setSubsystems(subs);
                setStunden(hrs);
                setMaterialkosten(mat);
                setMitarbeiter(emps);
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
        const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
        const rate = emp?.stundensatz ?? 80; // Default rate if not set
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
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 80));
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
        const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
        const rate = emp?.stundensatz ?? 80;
        monthlyData[month] = (monthlyData[month] || 0) + (s.stunden * rate);
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
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 80));
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
        { title: 'Ist-Kosten (Tot.)', value: formatCHF(actualCost), icon: DollarSign, color: 'text-violet-600' },
        { title: 'Total Stunden', value: `${totalHours.toFixed(2)} h`, icon: Clock, color: 'text-blue-600' },
        { title: 'TS Anzahl', value: subsystems.length, icon: LayoutDashboard, color: 'text-indigo-600' }
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

    if (loading) return <div className="p-12 text-center font-black animate-pulse text-slate-400">ANALYSESYSTEM WIRD AKTUALISIERT...</div>

    return (
        <div className="flex flex-col gap-6 p-1 h-full overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center px-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight dark:text-orange-400">Projekt-Analyse</h2>
                    <p className="text-slate-500 font-medium text-xs">Strategische Übersicht (Echtzeit-Daten aus Datenbank / CHF).</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 text-slate-500 flex items-center gap-1 shadow-sm">
                        <Clock size={12} />
                        Stand: {new Date().toLocaleDateString('de-CH')}
                    </span>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all rounded-[2rem]">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-2xl bg-slate-50 group-hover:bg-white transition-colors group-hover:shadow-inner", kpi.color)}>
                                    <kpi.icon size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.title}</p>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{kpi.value}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
                {/* Production Status */}
                <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <PieChart size={16} className="text-blue-500" />
                            Produktionsstatus
                        </CardTitle>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{completionRate}% Fertig</span>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            {productionStats.map((stat, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-500">{stat.label}</span>
                                        <span className="text-slate-800">{stat.count}</span>
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

                {/* Cost Flow */}
                <Card className="border-none shadow-sm bg-white rounded-[2rem]">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <BarChart3 size={16} className="text-violet-500" />
                            Ist-Kosten Verlauf (CHF)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
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

            {/* Teilsystem Details */}
            <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden mx-4">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-orange-500" />
                        Detaillierte Analyse pro Teilsystem
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
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
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4 font-black text-primary text-xs">{ts.nr || '—'}</td>
                                    <td className="px-4 py-4 font-bold text-slate-700 text-xs">{ts.name}</td>
                                    <td className="px-4 py-4">
                                        {ts.abteilung ? (
                                            <Badge variant={(ABTEILUNGEN_CONFIG.find(a => a.name === ts.abteilung)?.color as any) || 'info'} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                                {ts.abteilung}
                                            </Badge>
                                        ) : (
                                            <span className="text-[9px] text-slate-300 italic font-medium">n/a</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 font-bold text-slate-600 text-xs text-right">{ts.hours.toFixed(2)} h</td>
                                    <td className="px-8 py-4 font-black text-slate-800 text-xs text-right">{formatCHF(ts.cost)}</td>
                                </tr>
                            ))}
                            {tsData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold italic">Keine Daten für Teilsysteme vorhanden.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Detail Table Abteilung */}
            <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden mx-4 mb-8">
                <CardHeader className="border-b border-slate-50 bg-slate-50/30 px-8 py-6">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Users size={16} className="text-slate-400" />
                        Finanzielle Zusammenfassung nach Abteilung (CHF)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-4">Abteilung</th>
                                <th className="px-8 py-4 text-right">Ist-Kosten (Real)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {Object.entries(entityData).map(([id, data], i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-4 font-black text-slate-700 text-sm">{data.name}</td>
                                    <td className="px-8 py-4 font-black text-slate-800 text-sm text-right">{formatCHF(data.actual)}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-900 text-white">
                                <td className="px-8 py-5 font-black text-sm uppercase tracking-widest">Gesamtprojekt Ist-Kosten</td>
                                <td className="px-8 py-5 font-black text-lg tracking-tighter text-right">{formatCHF(actualCost)}</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
