'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Hammer, DollarSign, Clock, LayoutDashboard, AlertCircle, CheckCircle } from 'lucide-react';
import { SubsystemService } from '@/lib/services/subsystemService';
import { KostenService } from '@/lib/services/kostenService';
import { EmployeeService } from '@/lib/services/employeeService';
import { TaskService } from '@/lib/services/taskService';
import { Teilsystem, TsStunden, Mitarbeiter, ItemStatus } from '@/types';
import { Task, TaskStatus } from '@/types/ausfuehrung';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { getKSFromAbteilung, ksValueToLabel } from '@/lib/config/ksConfig';
import { KSBadge } from '@/components/shared/KSBadge';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';

const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Map TaskStatus to MethaDesk Colors
const getTaskStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offen')) return '#e2e8f0'; // slate-200
    if (s.includes('arbeit')) return '#60a5fa'; // blue-400
    if (s.includes('blockiert')) return '#f87171'; // red-400
    if (s.includes('erledigt') || s.includes('fertig')) return '#34d399'; // emerald-400
    if (s.includes('abgerechnet') || s.includes('abgeschlossen')) return '#64748b'; // slate-500
    return '#cbd5e1';
};

const getStatusColor = (status: ItemStatus) => {
    switch (status) {
        case 'verbaut': return '#10b981'; // emerald-500
        case 'abgeschlossen': return '#64748b'; // slate-500
        default: return '#fb923c'; // orange-400 (pending)
    }
};

const formatStatusName = (status: string) => {
    const s = String(status).replace('_', ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function BaumeisterAnalysePage() {
    const { projektId } = useParams() as { projektId: string };
    const [subsystems, setSubsystems] = useState<Teilsystem[]>([]);
    const [stunden, setStunden] = useState<TsStunden[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subs, hrs, rawTasks, emps] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    KostenService.getStunden(undefined, projektId),
                    TaskService.getTasks({ projektId }),
                    EmployeeService.getMitarbeiter()
                ]);
                
                // KS 1 Baumeister (Ausfuehrung, Bauleitung)
                const isKS1 = (item: any) => {
                    const ksRaw = item.ks || getKSFromAbteilung(item.abteilung);
                    return ksValueToLabel(ksRaw) === 'KS 1 Baumeister';
                };
                
                setSubsystems(subs.filter(isKS1));
                setStunden(hrs.filter(isKS1));
                
                const executionTasks = rawTasks.filter(t => {
                    const ts = subs.find(s => s.id === t.teilsystemId || s.id === t.sourceTsId);
                    return isKS1(ts || {}) || ksValueToLabel(getKSFromAbteilung(t.ks as any)) === 'KS 1 Baumeister';
                });
                
                setTasks(executionTasks);
                setMitarbeiter(emps);
            } catch (error) {
                console.error("Error fetching execution analysis data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projektId]);

    // Derived Analytics Logic
    const analytics = useMemo(() => {
        if (loading) return null;

        // 1. Finance
        const calcStundenCost = (hrs: TsStunden[]) => hrs.reduce((sum, s) => {
            if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 55));
        }, 0);

        const totalHours = stunden.reduce((sum, s) => sum + s.stunden, 0);
        const laborCost = calcStundenCost(stunden);

        // 2. Tasks distribution
        const openTasks = tasks.filter(t => (t.status as string) !== 'Erledigt' && (t.status as string) !== 'Abgerechnet' && (t.status as string) !== 'Abgeschlossen').length;
        
        const tasksByStatus = tasks.reduce((acc, t) => {
            const st = t.status || 'Offen';
            acc[st] = (acc[st] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const taskDonutData = Object.entries(tasksByStatus).map(([status, count]) => ({
            name: formatStatusName(status),
            value: count,
            color: getTaskStatusColor(status)
        }));

        // 3. Teilsysteme Verbau progress
        const verbautTsCount = subsystems.filter(ts => ts.status === 'verbaut' || ts.status === 'abgeschlossen').length;
        const tsProgressPercentage = subsystems.length > 0 ? (verbautTsCount / subsystems.length) * 100 : 0;

        // 4. Overdue/Delayed Items
        const delayedTasks = tasks.filter(t => t.status === 'Blockiert' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Erledigt')).slice(0, 5);
        const overdueTeilsysteme = subsystems.filter(ts => ts.montagetermin && new Date(ts.montagetermin) < new Date() && ts.status !== 'verbaut' && ts.status !== 'abgeschlossen').slice(0, 5);

        return {
            totalHours, laborCost,
            openTasks, totalTasks: tasks.length, taskDonutData, delayedTasks,
            verbautTsCount, totalTs: subsystems.length, tsProgressPercentage, overdueTeilsysteme
        };
    }, [subsystems, stunden, tasks, mitarbeiter, loading]);


    if (loading || !analytics) return <div className="p-12 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Baumeisterdaten werden geladen...</div>;

    return (
        <div className="flex flex-col gap-6 p-4 pb-20">
            <ModuleActionBanner icon={Hammer} title="Baumeister Analyse (KS 1)" />
            
            {/* EXECUTIVE KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-slate-400">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-600"><DollarSign size={20} /></div>
                            <KSBadge ks="KS 1 Baumeister" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Baustellenkosten (Arbeit)</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{formatCHF(analytics.laborCost)}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Clock size={20} /></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Baustellenstunden</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{analytics.totalHours.toFixed(1)} h</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle size={20} /></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Baufortschritt (Verbaut)</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">{analytics.tsProgressPercentage.toFixed(0)}%</h3>
                                <span className="text-xs font-bold text-slate-400">({analytics.verbautTsCount} / {analytics.totalTs})</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><LayoutDashboard size={20} /></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aufgaben (Offen / Gesamt)</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{analytics.openTasks}</h3>
                                <span className="text-xs font-bold text-slate-400">/ {analytics.totalTasks}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Status Donut for Tasks */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 h-full min-h-[350px]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2 flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-blue-500" /> Baustellen-Tasks Verteilung
                    </h3>
                    <StatusDonutChart 
                        data={analytics.taskDonutData} 
                        totalLabel="Total Tasks" 
                    />
                </Card>

                {/* Overdue Items (Lists) */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 lg:col-span-2 h-full flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" /> Kritische Tasks / Blockaden
                        </h3>
                        <div className="space-y-2">
                            {analytics.delayedTasks.length === 0 ? (
                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest p-4 bg-emerald-50 rounded-lg text-center">Keine blockierten Tasks</p>
                            ) : (
                                analytics.delayedTasks.map(task => (
                                    <div key={task.id} className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{task.title}</p>
                                            <p className="text-[10px] text-slate-500">{task.description || 'Keine Beschreibung'}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-sm uppercase tracking-widest text-[9px] font-bold bg-red-100 text-red-600">
                                            {task.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" /> Top TS mit verzögertem Montagetermin
                        </h3>
                        <div className="space-y-2">
                            {analytics.overdueTeilsysteme.length === 0 ? (
                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest p-4 bg-emerald-50 rounded-lg text-center">Alle Montagetermine im Plan</p>
                            ) : (
                                analytics.overdueTeilsysteme.map(ts => (
                                    <div key={ts.id} className="flex justify-between items-center p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{ts.teilsystemNummer} - {ts.name}</p>
                                            <p className="text-[10px] text-slate-500">Geplant: {new Date(ts.montagetermin!).toLocaleDateString('de-CH')}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-sm uppercase tracking-widest text-[9px] font-bold bg-amber-100 text-amber-600">
                                            Verzögert
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
