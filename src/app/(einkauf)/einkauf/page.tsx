'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Building2, Truck, Plus, Mail, Phone, MapPin } from 'lucide-react';
import { Projekt, Teilsystem, Position, Material, Lieferant } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AggregateItem {
    id: string;
    projekt: Projekt;
    teilsystem: Teilsystem;
    position: Position | null;
    material: Material | null;
}

export default function GlobalEinkaufPage() {
    const [items, setItems] = useState<AggregateItem[]>([]);
    const [lieferanten, setLieferanten] = useState<Lieferant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('material');

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                // Fetch everything in parallel via API
                const [projekteRes, teilsystemeRes, positionenRes, materialienRes, lieferantenRes] = await Promise.all([
                    fetch('/api/projekte'),
                    fetch('/api/data/teilsysteme'),
                    fetch('/api/data/positionen'),
                    fetch('/api/data/material'),
                    fetch('/api/data/lieferanten') // New fetch for suppliers
                ]);

                if (!projekteRes.ok || !teilsystemeRes.ok || !positionenRes.ok || !materialienRes.ok) {
                    throw new Error('Failed to fetch some data');
                }

                const [projekte, teilsysteme, positionen, materialien, lieferantenData] = await Promise.all([
                    projekteRes.json(),
                    teilsystemeRes.json(),
                    positionenRes.json(),
                    materialienRes.json(),
                    lieferantenRes.ok ? lieferantenRes.json() : []
                ]);

                const joined: AggregateItem[] = [];

                teilsysteme.forEach((ts: Teilsystem) => {
                    const proj = projekte.find((p: Projekt) => p.id === ts.projektId);
                    if (!proj) return;

                    const tsPositions = positionen.filter((p: Position) => p.teilsystemId === ts.id);

                    if (tsPositions.length === 0) {
                        joined.push({
                            id: `ts-${ts.id}`,
                            projekt: proj,
                            teilsystem: ts,
                            position: null,
                            material: null
                        });
                        return;
                    }

                    tsPositions.forEach((pos: Position) => {
                        // Filter materials by teilsystemId (Material no longer has positionId)
                        const posMaterialien = materialien.filter((m: Material) => m.teilsystemId === ts.id);

                        if (posMaterialien.length === 0) {
                            joined.push({
                                id: `pos-${pos.id}`,
                                projekt: proj,
                                teilsystem: ts,
                                position: pos,
                                material: null
                            });
                            return;
                        }

                        posMaterialien.forEach((m: Material) => {
                            joined.push({
                                id: m.id,
                                projekt: proj,
                                teilsystem: ts,
                                position: pos,
                                material: m
                            });
                        });
                    });
                });

                setItems(joined);
                setLieferanten(lieferantenData);
            } catch (error) {
                console.error("Failed to load aggregate data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    const filteredMaterials = items.filter(item =>
        item.projekt.projektname.toLowerCase().includes(search.toLowerCase()) ||
        (item.material && item.material.name.toLowerCase().includes(search.toLowerCase())) ||
        (item.material?.hersteller && item.material.hersteller.toLowerCase().includes(search.toLowerCase())) ||
        item.teilsystem.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLieferanten = lieferanten.filter(item =>
        (item.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.telefon?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Einkauf & Lieferanten</h1>
                    <p className="text-muted-foreground font-medium mt-1">Globale Übersicht über Materialwirtschaft und Partner.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/einkauf/lieferanten/erfassen">
                        <Button className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <Plus className="h-5 w-5" />
                            <span>Neuer Lieferant</span>
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-card overflow-hidden">
                <Tabs className="w-full">
                    <CardHeader className="border-b border-border/50 bg-muted/20 py-4 pb-0">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                            <div className="relative w-full max-w-[320px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Suchen..."
                                    className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors shadow-inner"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="font-bold flex gap-1 items-center bg-background">
                                    <Building2 className="h-3 w-3" />
                                    {new Set(items.map(i => i.projekt?.id).filter(Boolean)).size} Projekte
                                </Badge>
                                <Badge variant="outline" className="font-bold flex gap-1 items-center bg-background">
                                    <Package className="h-3 w-3" />
                                    {items.length} Artikel
                                </Badge>
                                <Badge variant="outline" className="font-bold flex gap-1 items-center bg-background">
                                    <Truck className="h-3 w-3" />
                                    {lieferanten.length} Lieferanten
                                </Badge>
                            </div>
                        </div>
                        <TabsList className="bg-transparent space-x-2 border-b-0 h-auto p-0 pb-0 justify-start w-full">
                            <TabsTrigger
                                active={activeTab === 'material'}
                                onClick={() => setActiveTab('material')}
                                className={cn(
                                    "px-6 py-3 rounded-t-lg rounded-b-none border-b-2 font-bold transition-all text-muted-foreground",
                                    activeTab === 'material'
                                        ? "bg-background shadow-none border-primary text-foreground"
                                        : "border-transparent bg-muted/50 hover:bg-muted"
                                )}
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Material & Artikel
                            </TabsTrigger>
                            <TabsTrigger
                                active={activeTab === 'lieferanten'}
                                onClick={() => setActiveTab('lieferanten')}
                                className={cn(
                                    "px-6 py-3 rounded-t-lg rounded-b-none border-b-2 font-bold transition-all text-muted-foreground",
                                    activeTab === 'lieferanten'
                                        ? "bg-background shadow-none border-primary text-foreground"
                                        : "border-transparent bg-muted/50 hover:bg-muted"
                                )}
                            >
                                <Truck className="h-4 w-4 mr-2" />
                                Lieferanten ({lieferanten.length})
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>

                    <CardContent className="p-0">
                        <TabsContent active={activeTab === 'material'} className="m-0 border-none outline-none">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Projekt</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Teilsystem / Position</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Artikel</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Hersteller</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <TableRow key={i} className="animate-pulse">
                                                    <TableCell colSpan={5} className="h-16 bg-muted/20" />
                                                </TableRow>
                                            ))
                                        ) : filteredMaterials.length > 0 ? (
                                            filteredMaterials.map((item) => (
                                                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground leading-none">{item.projekt.projektname}</span>
                                                            <span className="text-[10px] font-mono text-muted-foreground mt-1">#{item.projekt.projektnummer}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-foreground/80">{item.teilsystem.name}</span>
                                                            {item.position && <span className="text-xs text-muted-foreground italic">{item.position.name}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.material ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                                                    <Package className="h-4 w-4 text-primary" />
                                                                </div>
                                                                <span className="font-bold text-foreground">{item.material.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/30 font-semibold italic">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm font-medium text-muted-foreground">{item.material?.hersteller || '—'}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.material ? (
                                                            <StatusBadge status={item.material.status} />
                                                        ) : item.position ? (
                                                            <StatusBadge status={item.position.status || 'offen'} />
                                                        ) : (
                                                            <StatusBadge status={item.teilsystem.status || 'offen'} />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold">
                                                    Keine Artikel gefunden
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent active={activeTab === 'lieferanten'} className="m-0 border-none outline-none">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow className="hover:bg-transparent border-b border-border/50">
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4 w-20">ID</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground py-4">Firma</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Kategorie</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">E-Mail</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Telefon</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <TableRow key={i} className="animate-pulse">
                                                    <TableCell colSpan={5} className="h-16 bg-muted/20" />
                                                </TableRow>
                                            ))
                                        ) : filteredLieferanten.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                                                    Keine Lieferanten gefunden.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredLieferanten.map((item) => (
                                                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                                                    <TableCell className="py-4">
                                                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                            {item.id.substring(0, 3)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm shrink-0">
                                                                <Truck className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-foreground text-sm tracking-tight">{item.name}</span>
                                                                {item.adresse && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.adresse}</span>}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs bg-muted/30 border-muted">
                                                            {item.kategorie || 'Unternehmer'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                                                            <Mail className="h-3.5 w-3.5" />
                                                            {item.email ? (
                                                                <a href={`mailto:${item.email}`} className="hover:text-primary transition-colors">{item.email}</a>
                                                            ) : '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                                                            <Phone className="h-3.5 w-3.5" />
                                                            {item.telefon ? (
                                                                <a href={`tel:${item.telefon}`} className="hover:text-primary transition-colors">{item.telefon}</a>
                                                            ) : '—'}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
