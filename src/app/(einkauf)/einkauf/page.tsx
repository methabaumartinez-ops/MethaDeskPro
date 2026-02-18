'use client';

import React, { useState, useEffect } from 'react';
import { ProjectService } from '@/lib/services/projectService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { PositionService } from '@/lib/services/positionService';
import { MaterialService } from '@/lib/services/materialService';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, Building2, Truck, ListFilter } from 'lucide-react';
import { Projekt, Teilsystem, Position, Material } from '@/types';
import { cn } from '@/lib/utils';
import { DatabaseService } from '@/lib/services/db';

interface AggregateItem {
    id: string;
    projekt: Projekt;
    teilsystem: Teilsystem;
    position: Position;
    material: Material;
}

export default function GlobalEinkaufPage() {
    const [items, setItems] = useState<AggregateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                // Fetch everything in parallel via API
                const [projekteRes, teilsystemeRes, positionenRes, materialienRes] = await Promise.all([
                    fetch('/api/projekte'),
                    fetch('/api/data/teilsysteme'),
                    fetch('/api/data/positionen'),
                    fetch('/api/data/material')
                ]);

                if (!projekteRes.ok || !teilsystemeRes.ok || !positionenRes.ok || !materialienRes.ok) {
                    throw new Error('Failed to fetch some data');
                }

                const [projekte, teilsysteme, positionen, materialien] = await Promise.all([
                    projekteRes.json(),
                    teilsystemeRes.json(),
                    positionenRes.json(),
                    materialienRes.json()
                ]);

                const joined: AggregateItem[] = [];

                materialien.forEach((m: Material) => {
                    const pos = positionen.find((p: Position) => p.id === m.positionId);
                    if (!pos) return;

                    const ts = teilsysteme.find((t: Teilsystem) => t.id === pos.teilsystemId);
                    if (!ts) return;

                    const proj = projekte.find((p: Projekt) => p.id === ts.projektId);
                    if (!proj) return;

                    joined.push({
                        id: m.id,
                        projekt: proj,
                        teilsystem: ts,
                        position: pos,
                        material: m
                    });
                });

                setItems(joined);
            } catch (error) {
                console.error("Failed to load aggregate data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    const filtered = items.filter(item =>
        item.projekt.projektname.toLowerCase().includes(search.toLowerCase()) ||
        item.material.name.toLowerCase().includes(search.toLowerCase()) ||
        item.material.hersteller.toLowerCase().includes(search.toLowerCase()) ||
        item.teilsystem.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Einkauf & Materialwirtschaft</h1>
                    <p className="text-muted-foreground font-medium mt-1">Globale Übersicht über alle Projekte und Materialien.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-4 py-2 text-sm font-bold bg-white shadow-sm border-primary/20 text-primary">
                        {items.length} Artikel gesamt
                    </Badge>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Suche nach Projekt, Material, Hersteller..."
                                className="pl-10 bg-white border-slate-200 focus-visible:ring-primary/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="font-bold flex gap-1 items-center bg-white">
                                <Building2 className="h-3 w-3" />
                                {new Set(items.map(i => i.projekt.id)).size} Projekte
                            </Badge>
                            <Badge variant="outline" className="font-bold flex gap-1 items-center bg-white">
                                <Truck className="h-3 w-3" />
                                {new Set(items.map(i => i.material.hersteller)).size} Hersteller
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Projekt</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Teilsystem / Position</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Artikel</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Hersteller</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={5} className="h-16 bg-slate-50/50" />
                                        </TableRow>
                                    ))
                                ) : filtered.length > 0 ? (
                                    filtered.map((item) => (
                                        <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 leading-none">{item.projekt.projektname}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 mt-1">#{item.projekt.projektnummer}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-700">{item.teilsystem.name}</span>
                                                    <span className="text-xs text-slate-400 italic">{item.position.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                                        <Package className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <span className="font-bold text-slate-800">{item.material.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium text-slate-600">{item.material.hersteller || '—'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={item.material.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold">
                                            Keine Daten gefunden
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
