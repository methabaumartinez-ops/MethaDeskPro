'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
    Calendar, Search, Filter,
    Clock, CheckCircle2, FileText,
    Download
} from 'lucide-react';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Teilsystem } from '@/types';
import { cn } from '@/lib/utils';

export default function PlannerPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const subsystems = await SubsystemService.getTeilsysteme(projektId);
            setItems(subsystems);
            setLoading(false);
        };
        load();
    }, [projektId]);

    const updateItem = async (id: string, field: keyof Teilsystem, value: string) => {
        try {
            // Optimistic update
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            ));

            // API update
            await SubsystemService.updateTeilsystem(id, { [field]: value });
        } catch (error) {
            console.error("Failed to update item:", error);
        }
    };

    const filteredItems = items.filter(item =>
        (item.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const getPlanStatusColor = (status: string | undefined) => {
        if (status === 'fertig' || status === 'abgeschlossen') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'in_produktion') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-muted text-muted-foreground border-border';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planer</h1>
                    <p className="text-slate-500 font-medium mt-1">Überwachen Sie Meilensteine, Planabgaben und Lieferfristen.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="font-bold gap-2">
                        <Download className="h-4 w-4" />
                        Exportieren
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Offene Pläne', value: items.filter(i => i.planStatus !== 'fertig' && i.planStatus !== 'abgeschlossen').length, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Fristen diese Woche', value: '2', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Abgeschlossen', value: items.filter(i => i.planStatus === 'fertig' || i.planStatus === 'abgeschlossen').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm bg-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={cn("p-4 rounded-2xl", stat.bg)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter Row */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Suche nach System oder Name..."
                        className="pl-10 h-10 border-slate-200 bg-slate-50 focus-visible:ring-primary/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>

            {/* Planner Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse h-64 bg-slate-100 border-none" />
                    ))
                ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <Card key={item.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col">
                            <CardHeader className="bg-slate-50/50 border-b pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="overflow-hidden pr-2">
                                        <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                                            #{item.teilsystemNummer}
                                        </div>
                                        <CardTitle className="text-lg font-bold text-slate-900 leading-tight truncate w-full" title={item.name}>
                                            {item.name}
                                        </CardTitle>
                                    </div>
                                    <div className={cn("px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0", getPlanStatusColor(item.planStatus))}>
                                        {item.planStatus || 'OFFEN'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Plan-Abgabe
                                        </label>
                                        <Input
                                            className="h-9 font-medium bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                            defaultValue={item.abgabePlaner || ''}
                                            onBlur={(e) => updateItem(item.id, 'abgabePlaner', e.target.value)}
                                            placeholder="DD.MM.YYYY"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-orange-600 uppercase tracking-wide flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> Montagetermin
                                        </label>
                                        <Input
                                            className="h-9 font-bold text-orange-700 bg-orange-50 border-orange-100 focus:bg-white focus:border-primary transition-colors"
                                            defaultValue={item.montagetermin || ''}
                                            onBlur={(e) => updateItem(item.id, 'montagetermin', e.target.value)}
                                            placeholder="DD.MM.YYYY"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Lieferfrist
                                        </label>
                                        <Input
                                            className="h-9 font-medium bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                            defaultValue={item.lieferfrist || ''}
                                            onBlur={(e) => updateItem(item.id, 'lieferfrist', e.target.value)}
                                            placeholder="Tage / Datum"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                                        <Select
                                            value={item.planStatus || 'offen'}
                                            onChange={(e) => updateItem(item.id, 'planStatus', e.target.value)}
                                            options={[
                                                { label: 'Offen', value: 'offen' },
                                                { label: 'In Produktion', value: 'in_produktion' },
                                                { label: 'Bestellt', value: 'bestellt' },
                                                { label: 'Geliefert', value: 'geliefert' },
                                                { label: 'Verbaut', value: 'verbaut' },
                                                { label: 'Abgeschlossen', value: 'abgeschlossen' },
                                            ]}
                                            className="w-full h-9 bg-white border-slate-200"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p className="font-bold">Keine Elemente gefunden</p>
                    </div>
                )}
            </div>
        </div>
    );
}
