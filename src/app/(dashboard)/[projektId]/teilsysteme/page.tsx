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
import { cn } from '@/lib/utils';

export default function TeilsystemeListPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

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

    const handleDelete = async (item: Teilsystem) => {
        if (confirm(`Sind Sie sicher, dass Sie "${item.name}" löschen möchten?`)) {
            try {
                await SubsystemService.deleteTeilsystem(item.id);
                setItems(prev => prev.filter(i => i.id !== item.id));
            } catch (error) {
                console.error("Failed to delete", error);
                alert("Fehler beim Löschen");
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-3">
            {/* Project Context Header (Compact) */}
            {/* Project Context Header (Removed - now global) */}

            <div className="flex justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Teilsysteme u. BKP</h2>
                </div>
                <div className="flex gap-2">
                    {/* Reset Data button removed as it relied on mockStore */}
                    <Link href={`/${projektId}/teilsysteme/erfassen`}>
                        <Button className="font-bold shadow-lg shadow-primary/20">
                            <Plus className="h-5 w-5 mr-2" />
                            Teilsystem erfassen
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="py-3 px-4 border-b">
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Suche nach Nummer oder Name..."
                                className="pl-10 h-9 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 font-bold h-9">
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-auto">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm font-bold text-muted-foreground">Teilsysteme werden geladen...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="overflow-x-auto max-w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border hover:bg-transparent">
                                        <TableHead className="w-14 h-8 px-2 font-bold text-foreground text-center text-[10px]">System-Nr.</TableHead>
                                        <TableHead className="w-10 h-8 px-2 font-bold text-foreground text-[10px]">KS</TableHead>
                                        <TableHead className="min-w-[140px] h-8 px-2 font-bold text-foreground text-[10px]">Bezeichnung</TableHead>
                                        <TableHead className="max-w-[100px] h-8 px-2 font-bold text-foreground text-[10px]">Bemerkung</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Eröffnet am</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Von</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Montage</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground text-center text-[10px]">Frist</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground whitespace-nowrap text-[10px]">Plan-Abgabe</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground text-[10px]">P-Status</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground text-[10px]">WEMA</TableHead>
                                        <TableHead className="h-8 px-2 font-bold text-foreground text-[10px]">Status</TableHead>
                                        <TableHead className="h-8 px-2 text-right font-bold text-foreground text-[10px]">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="group hover:bg-muted/50 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}`)}
                                        >
                                            <TableCell className="p-2 font-medium text-foreground text-center text-xs">{item.teilsystemNummer || '—'}</TableCell>
                                            <TableCell className="p-2 font-bold text-muted-foreground text-xs">{item.ks || '1'}</TableCell>
                                            <TableCell className="p-2 font-medium text-foreground text-xs min-w-[140px]">{item.name}</TableCell>
                                            <TableCell className="p-2 text-muted-foreground text-[10px] italic max-w-[100px] truncate" title={item.bemerkung || ''}>{item.bemerkung || '—'}</TableCell>
                                            <TableCell className="p-2 text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.eroeffnetAm || '17.07.2025'}</TableCell>
                                            <TableCell className="p-2 text-[10px] font-black text-foreground whitespace-nowrap">{item.eroeffnetDurch || 'Moritz'}</TableCell>
                                            <TableCell className="p-2 text-[10px] font-black text-orange-600 whitespace-nowrap">{item.montagetermin || '—'}</TableCell>
                                            <TableCell className="p-2 text-[10px] font-bold text-muted-foreground text-center whitespace-nowrap">{item.lieferfrist || '—'}</TableCell>
                                            <TableCell className="p-2 text-[10px] font-bold text-muted-foreground whitespace-nowrap">{item.abgabePlaner || '—'}</TableCell>
                                            <TableCell className="p-2">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                    item.planStatus === 'fertig' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {item.planStatus || 'offen'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="p-2 text-center text-muted-foreground">
                                                {item.wemaLink ? (
                                                    <LinkIcon className="h-3 w-3 text-primary inline-block" />
                                                ) : (
                                                    <span className="text-muted-foreground/30">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <StatusBadge status={item.status} className="scale-90 origin-left" />
                                            </TableCell>
                                            <TableCell className="p-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/${projektId}/teilsysteme/${item.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted hover:shadow-sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/${projektId}/teilsysteme/${item.id}/edit`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm"
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
                        <div className="py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
                            <Layers className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold text-muted-foreground">Keine Teilsysteme gefunden</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Ändern Sie Ihre Suche oder erfassen Sie ein neues Teilsystem.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
