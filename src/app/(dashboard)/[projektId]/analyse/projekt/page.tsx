'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, DollarSign, Activity, Factory, Banknote, ListTodo, Boxes, Hammer } from 'lucide-react';
import { SubsystemService } from '@/lib/services/subsystemService';
import { KostenService } from '@/lib/services/kostenService';
import { EmployeeService } from '@/lib/services/employeeService';
import { TaskService } from '@/lib/services/taskService';
import { PositionService } from '@/lib/services/positionService';
import { Teilsystem, TsStunden, TsMaterialkosten, Mitarbeiter, ItemStatus, Position } from '@/types';
import { Task } from '@/types/ausfuehrung';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { getKSFromAbteilung } from '@/lib/config/ksConfig';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';
import { KSComparisonBar } from '@/components/dashboard/KSComparisonBar';
import { WorkloadBarChart } from '@/components/dashboard/WorkloadBarChart';

const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Map ItemStatus to MethaDesk Colors
const getStatusColor = (status: ItemStatus | string) => {
    switch (status) {
        case 'offen': return '#e2e8f0'; // slate-200
        case 'in_planung': return '#fcd34d'; // amber-300
        case 'in_arbeit': return '#60a5fa'; // blue-400
        case 'in_produktion': return '#38bdf8'; // sky-400
        case 'bestellt': return '#c084fc'; // purple-400
        case 'fertig': return '#34d399'; // emerald-400
        case 'geliefert': return '#a7f3d0'; // emerald-200
        case 'verbaut': return '#10b981'; // emerald-500
        case 'nachbearbeitung': return '#f87171'; // red-400
        case 'geaendert': return '#fb923c'; // orange-400
        case 'abgeschlossen': return '#64748b'; // slate-500
        default: return '#cbd5e1';
    }
};

const formatStatusName = (status: string) => {
    const s = String(status).replace('_', ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function ProjektAnalysePage() {
    const { projektId } = useParams() as { projektId: string };
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [stunden, setStunden] = useState<TsStunden[]>([]);
    const [materialkosten, setMaterialkosten] = useState<TsMaterialkosten[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [positionen, setPositionen] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subs, hrs, mat, emps, rawTasks, allPos] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    KostenService.getStunden(undefined, projektId),
                    KostenService.getMaterialkosten(undefined, projektId),
                    EmployeeService.getMitarbeiter(),
                    TaskService.getTasks({ projektId }),
                    PositionService.getPositionen()
                ]);
                
                const safeSubs = subs || [];
                const tsIds = new Set(safeSubs.map(t => t.id));
                const pos = (allPos || []).filter(p => p.teilsystemId && tsIds.has(p.teilsystemId));

                setSubsystems(safeSubs);
                setStunden(hrs || []);
                setMaterialkosten(mat || []);
                setMitarbeiter(emps || []);
                setTasks(rawTasks || []);
                setPositionen(pos);
            } catch (error) {
                console.error("Error fetching analysis data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projektId]);

    // Derived State Computations directly in useMemo for performance
    const analytics = useMemo(() => {
        if (loading) return null;

        const getKS = (item: any) => item.ks || getKSFromAbteilung(item.abteilung) || 'Unbekannt';

        // 1. Finance Grouping
        const calcStundenCost = (hrs: TsStunden[]) => hrs.reduce((sum, s) => {
            if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 55));
        }, 0);
        const calcMatCost = (mat: TsMaterialkosten[]) => mat.reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0);

        const ks1Stunden = stunden.filter(s => getKS(s) === 'KS 1 Baumeister');
        const ks2Stunden = stunden.filter(s => getKS(s) === 'KS 2 Produktion');

        const filterMatKS = (matList: TsMaterialkosten[], ksMatch: string) => matList.filter(m => {
            if (m.ks) return m.ks === ksMatch;
            const parentTs = subsystems.find(ts => ts.id === m.teilsystemId);
            return getKS(parentTs || {}) === ksMatch;
        });

        const ks1Cost = calcStundenCost(ks1Stunden) + calcMatCost(filterMatKS(materialkosten, 'KS 1 Baumeister'));
        const ks2Cost = calcStundenCost(ks2Stunden) + calcMatCost(filterMatKS(materialkosten, 'KS 2 Produktion'));
        const totalCost = ks1Cost + ks2Cost;

        // 2. Teilsysteme Distribution
        const tsByStatus = subsystems.reduce((acc, ts) => {
            const st = ts.status || 'offen';
            acc[st] = (acc[st] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const tsDonutData = Object.entries(tsByStatus).map(([status, count]) => ({
            name: formatStatusName(status),
            value: count,
            color: getStatusColor(status as ItemStatus)
        }));

        const verbautCount = subsystems.filter(ts => ts.status === 'verbaut' || ts.status === 'abgeschlossen').length;
        const progressPercentage = subsystems.length > 0 ? (verbautCount / subsystems.length) * 100 : 0;

        // KS Split for Progress
        const ks1Ts = subsystems.filter(ts => getKS(ts) === 'KS 1 Baumeister');
        const ks2Ts = subsystems.filter(ts => getKS(ts) === 'KS 2 Produktion');
        const ks1Verbaut = ks1Ts.filter(ts => ['verbaut', 'abgeschlossen'].includes(ts.status || '')).length;
        const ks2Verbaut = ks2Ts.filter(ts => ['verbaut', 'abgeschlossen'].includes(ts.status || '')).length;
        const ks1ProgressPerc = ks1Ts.length > 0 ? (ks1Verbaut / ks1Ts.length) * 100 : 0;
        const ks2ProgressPerc = ks2Ts.length > 0 ? (ks2Verbaut / ks2Ts.length) * 100 : 0;

        // 3. Operational Risk (Tasks)
        const openTasksArray = tasks.filter(t => t.status !== 'Erledigt' && t.status !== 'Abgerechnet' && t.status !== 'fertig');
        const criticalTasksArray = tasks.filter(t => t.status === 'Blockiert' || t.status === 'Ueberfaellig' || t.status === 'Verzoegert');
        
        const openTasksKs1 = openTasksArray.filter(t => getKS(t) === 'KS 1 Baumeister').length;
        const openTasksKs2 = openTasksArray.filter(t => getKS(t) === 'KS 2 Produktion').length;

        const tasksByStatus = tasks.reduce((acc, t) => {
            let st = t.status || 'Offen';
            if (st === 'Blockiert' || st === 'Ueberfaellig' || st === 'Verzoegert') st = 'Überfällig';
            acc[st] = (acc[st] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const taskStatusColors: Record<string, string> = {
            'Offen': '#94a3b8',
            'In Arbeit': '#60a5fa',
            'Erledigt': '#34d399',
            'Überfällig': '#f87171',
            'Abgerechnet': '#cbd5e1'
        };

        const taskDonutData = Object.entries(tasksByStatus).map(([status, count]) => ({
            name: status,
            value: count,
            color: taskStatusColors[status] || '#cbd5e1'
        }));

        // 4. Produktion Fortschritt (KS 2 Positionen)
        const ks2Positionen = positionen.filter(p => {
             const parentTs = subsystems.find(t => t.id === p.teilsystemId);
             return getKS(parentTs || {}) === 'KS 2 Produktion';
        });
        const finishedPos = ks2Positionen.filter(p => ['fertig', 'geliefert', 'verbaut'].includes(p.status || ''));
        const prodProgressPerc = ks2Positionen.length > 0 ? (finishedPos.length / ks2Positionen.length) * 100 : 0;

        // 5. Department Analysis
        const targetAbteilungen = ['Bauleitung', 'Ausführung', 'Einkauf', 'AVOR', 'Schlosserei', 'Blechabteilung', 'Werkhof', 'Montage'];
        
        const costsByAbteilung = targetAbteilungen.map(abt => {
            const abtHrs = stunden.filter(s => s.abteilung === abt);
            const abtMat = materialkosten.filter(m => m.abteilung === abt);
            return {
                name: abt,
                value: calcStundenCost(abtHrs) + calcMatCost(abtMat),
                color: '#f97316' // orange-500
            };
        }).filter(item => item.value > 0);

        const tasksByAbteilung = targetAbteilungen.map(abt => {
            return {
                name: abt,
                value: tasks.filter(t => t.abteilung === abt && t.status !== 'Erledigt' && t.status !== 'Abgerechnet').length,
                color: '#3b82f6' // blue-500
            };
        }).filter(item => item.value > 0);

        // 6. Most Expensive Item Ranking & Tables
        const tsRankings = subsystems.map(ts => {
            const tsHrs = stunden.filter(s => s.teilsystemId === ts.id);
            const tsMat = materialkosten.filter(m => m.teilsystemId === ts.id);
            const cost = calcStundenCost(tsHrs) + calcMatCost(tsMat);
            return { ...ts, totalCost: cost, parsedKs: getKS(ts) };
        }).sort((a, b) => b.totalCost - a.totalCost).slice(0, 5); // Top 5

        const topOverdueTasks = [...tasks]
            .filter(t => !['Erledigt', 'Abgerechnet', 'fertig'].includes(t.status || ''))
            .sort((a, b) => new Date(a.faelligAm || 0).getTime() - new Date(b.faelligAm || 0).getTime())
            .slice(0, 5);

        return {
            ks1Cost, ks2Cost, totalCost,
            tsDonutData, taskDonutData,
            verbautCount, totalTs: subsystems.length, progressPercentage, prodProgressPerc,
            ks1ProgressPerc, ks2ProgressPerc,
            criticalTasksCount: criticalTasksArray.length, openTasksCount: openTasksArray.length,
            openTasksKs1, openTasksKs2,
            costsByAbteilung, tasksByAbteilung,
            tsRankings, topOverdueTasks
        };
    }, [subsystems, stunden, materialkosten, tasks, mitarbeiter, positionen, loading]);

    if (loading || !analytics) return <div className="p-12 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Projektcockpit wird vorbereitet...</div>;

    return (
        <div className="flex flex-col gap-6 p-4 pb-20">
            <ModuleActionBanner 
                icon={Briefcase} 
                title="Projektanalyse – Gesamtübersicht" 
                subtitle="Gesamtstatus aller Prozesse im Projekt"
            />
            
            {/* EXECUTIVE KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-slate-200">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400"><Banknote size={16} /></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Projektbudget</p>
                            <h3 className="text-lg font-black text-slate-400 tracking-tighter mt-1">—</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-slate-800">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-600"><DollarSign size={16} /></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Projektkosten Ist</p>
                            <h3 className="text-lg font-black text-slate-800 tracking-tighter mt-1">{formatCHF(analytics.totalCost)}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-emerald-500">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Activity size={16} /></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Fortschritt Gesamt</p>
                            <h3 className="text-lg font-black text-emerald-600 tracking-tighter mt-1">{analytics.progressPercentage.toFixed(0)}%</h3>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-blue-500">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Factory size={16} /></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Prod. Fortschritt</p>
                            <h3 className="text-lg font-black text-blue-600 tracking-tighter mt-1">{analytics.prodProgressPerc.toFixed(0)}%</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-none shadow-sm bg-white rounded-2xl border-l-4 ${analytics.criticalTasksCount > 0 ? 'border-l-red-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2 rounded-xl ${analytics.criticalTasksCount > 0 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                <ListTodo size={16} />
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Offene Aufgaben</p>
                            <h3 className={`text-lg font-black tracking-tighter mt-1 ${analytics.criticalTasksCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                {analytics.openTasksCount} <span className="text-[10px] text-red-500 font-bold ml-1">({analytics.criticalTasksCount} blockiert)</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-purple-500">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Boxes size={16} /></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">TS Gesamt</p>
                            <h3 className="text-lg font-black text-slate-800 tracking-tighter mt-1">{analytics.totalTs}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS ROW 1: KS Comparison & Status Donuts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* KS Comparison Chart */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex flex-col items-stretch space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <Hammer size={16} className="text-orange-500" /> Auswertung KS 1 vs KS 2
                    </h3>
                    <div className="space-y-6 flex-1">
                         <KSComparisonBar 
                            ks1Value={analytics.ks1Cost} 
                            ks2Value={analytics.ks2Cost} 
                            title="Budgetnutzung (Kosten nach KS)"
                        />
                         <KSComparisonBar 
                            ks1Value={analytics.ks1ProgressPerc} 
                            ks2Value={analytics.ks2ProgressPerc} 
                            title="Fortschritt Teilsysteme (Verbaut in %)"
                            formatValue={(v) => `${v.toFixed(0)}%`}
                        />
                        <KSComparisonBar 
                            ks1Value={analytics.openTasksKs1} 
                            ks2Value={analytics.openTasksKs2} 
                            title="Offene Aufgaben nach KS"
                            formatValue={(v) => v.toString()}
                        />
                    </div>
                </Card>

                {/* Donuts Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex flex-col h-full">
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2 flex justify-center text-center">
                            Teilsystem Status
                        </h3>
                        <div className="flex-1 min-h-[220px]">
                            <StatusDonutChart 
                                data={analytics.tsDonutData} 
                                totalLabel="Gesamt TS" 
                            />
                        </div>
                    </Card>
                    <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex flex-col h-full">
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-2 flex justify-center text-center">
                            Aufgaben Status
                        </h3>
                        <div className="flex-1 min-h-[220px]">
                            <StatusDonutChart 
                                data={analytics.taskDonutData} 
                                totalLabel="Aufgaben" 
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {/* CHARTS ROW 2: Workload Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 min-h-[300px] flex flex-col">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4">
                        <DollarSign size={16} className="text-orange-500" /> Kosten nach Abteilung
                    </h3>
                    <div className="flex-1 min-h-[250px]">
                        {analytics.costsByAbteilung.length > 0 ? (
                             <WorkloadBarChart data={analytics.costsByAbteilung} yAxisFormatter={formatCHF} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400">Keine Daten verfügbar</div>
                        )}
                    </div>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 min-h-[300px] flex flex-col">
                     <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-4">
                        <ListTodo size={16} className="text-blue-500" /> Offene Aufgaben pro Abteilung
                    </h3>
                    <div className="flex-1 min-h-[250px]">
                        {analytics.tasksByAbteilung.length > 0 ? (
                             <WorkloadBarChart data={analytics.tasksByAbteilung} yAxisFormatter={(v) => v.toString()} />
                        ) : (
                             <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400">Keine aktiven Aufgaben</div>
                        )}
                    </div>
                </Card>
            </div>

            {/* TABLES ROW */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* TOP 5 EXPENSIVE TEILSYSTEME */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-4 w-1 bg-red-400 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Kostenintensivste Teilsysteme</h3>
                    </div>
                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-left font-sans">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-5 py-3">TS-Nummer</th>
                                        <th className="px-5 py-3">Bezeichnung</th>
                                        <th className="px-5 py-3 text-right">Ist Kosten</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {analytics.tsRankings.map((ts, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                            <td className="px-5 py-3 font-black text-primary text-xs">{ts.teilsystemNummer || '—'}</td>
                                            <td className="px-5 py-3 font-bold text-slate-700">{ts.name}</td>
                                            <td className="px-5 py-3 font-black text-slate-800 text-right">{formatCHF(ts.totalCost)}</td>
                                        </tr>
                                    ))}
                                    {analytics.tsRankings.length === 0 && (
                                         <tr>
                                             <td colSpan={3} className="px-5 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Keine Teilsysteme</td>
                                         </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* OVERDUE TASKS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-4 w-1 bg-orange-400 rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Nächste Fällige / Blockierte Aufgaben</h3>
                    </div>
                    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-left font-sans">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-5 py-3">Aufgabe</th>
                                        <th className="px-5 py-3">Abt. / Gewerk</th>
                                        <th className="px-5 py-3 text-right">Fällig Am</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {analytics.topOverdueTasks.map((t, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                            <td className="px-5 py-3 font-bold text-slate-700 flex flex-col gap-1">
                                                <span>{t.titel}</span>
                                                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">{t.status}</span>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-slate-600">{t.abteilung || '—'}</td>
                                            <td className="px-5 py-3 font-black text-slate-800 text-right">
                                                {t.faelligAm ? new Date(t.faelligAm).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                     {analytics.topOverdueTasks.length === 0 && (
                                         <tr>
                                             <td colSpan={3} className="px-5 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Keine aktiven Aufgaben</td>
                                         </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}
