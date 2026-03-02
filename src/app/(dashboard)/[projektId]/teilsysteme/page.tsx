'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select } from '@/components/ui/select';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { Teilsystem, Projekt, ABTEILUNGEN_CONFIG } from '@/types';
import {
    Plus, Search, Eye, Edit, Filter, Layers, Trash2,
    Building, MapPin, Hash, User as UserIcon, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn, cleanBemerkung } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import { TeilsystemTable } from '@/components/shared/TeilsystemTable';

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

    const [selectedAbteilung, setSelectedAbteilung] = useState<string>('Alle');

    const filteredItems = items.filter(item => {
        const matchesSearch = (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (item.name?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesAbteilung = selectedAbteilung === 'Alle' || item.abteilung === selectedAbteilung;
        return matchesSearch && matchesAbteilung;
    });

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
                                <span>Neu TS erfassen</span>
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
                <div className="w-full md:w-64">
                    <Select
                        value={selectedAbteilung}
                        onChange={(e) => setSelectedAbteilung(e.target.value)}
                        options={[
                            { label: 'Alle Abteilungen', value: 'Alle' },
                            ...ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))
                        ]}
                        className="h-11 border-2"
                    />
                </div>
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
                        <TeilsystemTable
                            items={filteredItems}
                            projektId={projektId}
                            onDelete={handleDelete}
                        />
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
