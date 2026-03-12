'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Factory, DollarSign, Package, TrendingUp, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { SubsystemService } from '@/lib/services/subsystemService';
import { KostenService } from '@/lib/services/kostenService';
import { EmployeeService } from '@/lib/services/employeeService';
import { PositionService } from '@/lib/services/positionService';
import { Teilsystem, TsStunden, TsMaterialkosten, Mitarbeiter, Position, ItemStatus } from '@/types';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { getKSFromAbteilung } from '@/lib/config/ksConfig';
import { KSBadge } from '@/components/shared/KSBadge';
import { WorkloadBarChart } from '@/components/dashboard/WorkloadBarChart';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';

const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Map ItemStatus to MethaDesk Colors
const getStatusColor = (status: ItemStatus) => {
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

export default function ProduktionAnalysePage() {
    const { projektId } = useParams() as { projektId: string };
    const [stunden, setStunden] = useState<TsStunden[]>([]);
    const [materialkosten, setMaterialkosten] = useState<TsMaterialkosten[]>([]);
    const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
    const [positionen, setPositionen] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch basic data + positions
                const [subs, hrs, mat, emps, posList] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    KostenService.getStunden(undefined, projektId),
                    KostenService.getMaterialkosten(undefined, projektId),
                    EmployeeService.getMitarbeiter(),
                    PositionService.getPositionen()
                ]);
                
                // Filter specifically for KS 2 Produktion
                const isKS2 = (item: any) => (item.ks || getKSFromAbteilung(item.abteilung)) === 'KS 2 Produktion';
                
                const prodHrs = hrs.filter(isKS2);
                const prodMat = mat.filter(m => {
                    if (m.ks) return m.ks === 'KS 2 Produktion';
                    const parentTs = subs.find(ts => ts.id === m.teilsystemId);
                    return isKS2(parentTs || {});
                });
                
                // Keep positions associated with this project (directly or via TS mapping)
                // Filter only those whose abteilung points to production.
                const prodPos = posList.filter((p: any) => p.projektId === projektId || subs.some(ts => ts.id === p.teilsystemId))
                                       .filter(isKS2);

                setStunden(prodHrs);
                setMaterialkosten(prodMat);
                setMitarbeiter(emps);
                setPositionen(prodPos);
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

        // 1. Finance Grouping
        const calcStundenCost = (hrs: TsStunden[]) => hrs.reduce((sum, s) => {
            if (s.gesamtpreis !== undefined) return sum + s.gesamtpreis;
            const emp = mitarbeiter.find(m => m.id === s.mitarbeiterId);
            return sum + (s.stunden * (emp?.stundensatz ?? 55));
        }, 0);
        const calcMatCost = (mat: TsMaterialkosten[]) => mat.reduce((sum, m) => sum + (m.gesamtpreis ?? m.menge * m.einzelpreis), 0);

        const totalHours = stunden.reduce((sum, s) => sum + s.stunden, 0);
        const laborCost = calcStundenCost(stunden);
        const matCost = calcMatCost(materialkosten);
        const totalCost = laborCost + matCost;

        // 2. Department Workload (Bar Chart)
        const productionDepts = ['einkauf', 'avor', 'schlosserei', 'blech', 'werkhof', 'montage'];
        const departmentData = productionDepts.map(dept => {
            const deptHrs = stunden.filter(s => s.abteilung?.toLowerCase() === dept);
            return {
                name: formatStatusName(dept),
                value: deptHrs.reduce((sum, s) => sum + s.stunden, 0),
                rawCost: calcStundenCost(deptHrs),
                color: dept === 'schlosserei' || dept === 'blech' ? '#F97316' : '#3B82F6' // Orange for core manufacturing
            };
        }).filter(d => d.value > 0);

        // 3. Operational Risk & Status (Positionen Donut)
        const posByStatus = positionen.reduce((acc, pos) => {
            const st = pos.status || 'offen';
            acc[st] = (acc[st] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const posDonutData = Object.entries(posByStatus).map(([status, count]) => ({
            name: formatStatusName(status),
            value: count,
            color: getStatusColor(status as ItemStatus)
        }));

        const itemsDelivered = positionen.filter(p => ['fertig', 'geliefert', 'verbaut', 'abgeschlossen'].includes(p.status)).length;
        const openItems = positionen.length - itemsDelivered;
        
        // Items stuck in nachbearbeitung or geaendert are considered bottlenecks
        const bottleneckItems = positionen.filter(p => ['nachbearbeitung', 'geaendert'].includes(p.status)).length;

        return {
            totalHours, laborCost, matCost, totalCost,
            departmentData, posDonutData,
            totalItems: positionen.length, openItems, itemsDelivered, bottleneckItems
        };
    }, [stunden, materialkosten, mitarbeiter, positionen, loading]);

    if (loading || !analytics) return <div className="p-12 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Produktionscockpit wird vorbereitet...</div>;

    return (
        <div className="flex flex-col gap-6 p-4 pb-20">
            <ModuleActionBanner icon={Factory} title="Produktion Cockpit (KS 2)" />
            
            {/* EXECUTIVE KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white rounded-2xl border-l-4 border-l-orange-500">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-orange-50 text-orange-600"><DollarSign size={20} /></div>
                            <KSBadge ks="KS 2 Produktion" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Produktionskosten</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{formatCHF(analytics.totalCost)}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><TrendingUp size={20} /></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Arbeitsstunden Produziert</p>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tighter mt-1">{analytics.totalHours.toFixed(1)} h</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-2xl">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Package size={20} /></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status (Offen / Fertig)</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{analytics.openItems}</h3>
                                <span className="text-xs font-bold text-slate-400">/ {analytics.itemsDelivered}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-none shadow-sm bg-white rounded-2xl ${analytics.bottleneckItems > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2 rounded-xl ${analytics.bottleneckItems > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                {analytics.bottleneckItems > 0 ? <AlertOctagon size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Rückruf/Fehlerteufel</p>
                            <h3 className={`text-2xl font-black tracking-tighter mt-1 ${analytics.bottleneckItems > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                {analytics.bottleneckItems} Items
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Workload Status */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 h-full min-h-[350px]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" /> Auslastung nach Abteilung (Std)
                    </h3>
                    <WorkloadBarChart 
                        data={analytics.departmentData} 
                        yAxisFormatter={(val) => `${val}h`}
                    />
                </Card>

                {/* Status Donut Chart for Production Items */}
                <Card className="border-none shadow-sm bg-white rounded-2xl p-6 h-full min-h-[350px]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2 flex items-center gap-2">
                        <Factory size={16} className="text-orange-500" /> Fertigungsfluss Positionen
                    </h3>
                    <StatusDonutChart 
                        data={analytics.posDonutData} 
                        totalLabel="Total Pos." 
                    />
                </Card>
            </div>

            {/* Drilldown Table */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-6 w-1 bg-amber-500 rounded-full" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Arbeitskosten-Drilldown nach Abteilung</h3>
                </div>
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-left font-sans">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-3">Abteilung</th>
                                    <th className="px-8 py-3 text-right">Erfasste Stunden</th>
                                    <th className="px-8 py-3 text-right">Arbeitskosten Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {analytics.departmentData.map((dept, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                        <td className="px-8 py-4 font-black text-slate-700 capitalize">{dept.name}</td>
                                        <td className="px-8 py-4 font-bold text-slate-600 text-right">{dept.value.toFixed(1)} h</td>
                                        <td className="px-8 py-4 font-black text-slate-800 text-right">{formatCHF(dept.rawCost)}</td>
                                    </tr>
                                ))}
                                {analytics.departmentData.length === 0 && (
                                     <tr>
                                         <td colSpan={3} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Keine Stunden erfasst</td>
                                     </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
            
        </div>
    );
}
