'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
// import { mockStore } from '@/lib/mock/store'; // Removed
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { Teilsystem, Projekt } from '@/types';
import {
    Plus, Search, Eye, Edit, Filter, Layers, Trash2,
    Building, MapPin, Hash, User as UserIcon, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function TeilsystemeListPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Teilsystem | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [teilsysteme, proj] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    ProjectService.getProjektById(projektId)
                ]);
                setItems(teilsysteme);
                setProject(proj);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projektId]);

    const filteredItems = items.filter(item =>
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const handleDelete = (item: Teilsystem) => {
        setItemToDelete(item);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await SubsystemService.deleteTeilsystem(itemToDelete.id);
            setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Fehler beim Löschen");
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {/* STICKY HEADER */}
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md pt-2 pb-4 -mx-2 px-2">
                <div className="bg-card p-5 rounded-2xl shadow-md border-2 border-orange-500/30 flex items-center justify-between transition-all hover:border-orange-500/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">PROJEKT MODUL</span>
                        </div>
                        <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-3">
                            <Layers className="h-6 w-6 text-orange-600" />
                            Teilsysteme u. BKP
                        </h2>
                    </div>

                    <div className="flex gap-3">
                        <Link href={`/${projektId}/teilsysteme/erfassen`}>
                            <Button className="font-black text-xs uppercase bg-orange-600 hover:bg-orange-700 text-white h-11 shadow-lg shadow-orange-200 rounded-full px-8 flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                                <Plus className="h-5 w-5" />
                                <span>Neu Erfassen</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="bg-card/50 p-3 rounded-2xl border border-border flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Suche nach Nummer o. Name..."
                        className="pl-10 h-11 bg-background border-2 border-border focus-visible:border-orange-500/50 rounded-xl font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="h-11 px-5 border-2 rounded-xl font-black text-xs uppercase text-muted-foreground hover:bg-muted gap-2 w-full md:w-auto">
                    <Filter className="h-4 w-4" />
                    <span>Filter</span>
                </Button>
            </div>

            {/* MAIN CONTENT TABLE */}
            <Card className="shadow-xl border-2 border-border overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="overflow-x-auto max-w-full">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                                        <TableHead className="w-20 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">System-Nr.</TableHead>
                                        <TableHead className="w-12 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                                        <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Bezeichnung</TableHead>
                                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Status</TableHead>
                                        <TableHead className="px-4 py-4 text-right font-black text-foreground text-[10px] uppercase tracking-wider">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="group hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-border/50"
                                            onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}`)}
                                        >
                                            <TableCell className="p-4 text-center">
                                                <Badge variant="outline" className="font-black text-orange-700 border-orange-200 bg-orange-50 text-xs py-1 px-3">
                                                    {item.teilsystemNummer || '—'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-4 font-black text-muted-foreground text-xs">{item.ks || '1'}</TableCell>
                                            <TableCell className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-foreground text-sm tracking-tight">{item.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[250px] italic">
                                                        {item.bemerkung || 'Keine Bemerkung'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 w-12">Montage:</span>
                                                        <span className="text-[10px] font-black text-orange-600">{item.montagetermin || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 w-12">Von:</span>
                                                        <span className="text-[10px] font-bold text-foreground">{item.eroeffnetDurch || 'Moritz'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <div className="flex flex-col gap-2">
                                                    <StatusBadge status={item.status} className="scale-90 origin-left" />
                                                    <div className="flex items-center gap-1">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            item.planStatus === 'fertig' ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-muted-foreground/30"
                                                        )} />
                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground">
                                                            P-Plan: {item.planStatus || 'offen'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Link href={`/${projektId}/teilsysteme/${item.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/5 hover:text-primary rounded-lg border border-transparent hover:border-primary/20">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/${projektId}/teilsysteme/${item.id}/edit`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg border border-transparent hover:border-border">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"
                                                        onClick={() => handleDelete(item)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="py-32 text-center flex flex-col items-center">
                            <div className="p-6 bg-muted/30 rounded-full mb-6">
                                <Layers className="h-16 w-16 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme gefunden</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                                Ändern Sie Ihre Suche o. erfassen Sie ein neues Teilsystem in diesem Projekt.
                            </p>
                            <Link href={`/${projektId}/teilsysteme/erfassen`} className="mt-8">
                                <Button variant="outline" className="font-black text-xs uppercase h-10 border-2 rounded-xl">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Erstes System erstellen
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Teilsystem löschen"
                description={`Sind Sie sicher, dass Sie "${itemToDelete?.name}" permanent löschen möchten? Dieser Vorgang kann nicht rückgängig gemacht werden.`}
            />
        </div>
    );
}
