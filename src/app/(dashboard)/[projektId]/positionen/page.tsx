'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Position, Teilsystem } from '@/types';
import { Plus, Search, Eye, Filter, ListTodo, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function PositionenListPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Position[]>([]);
    const [teilsysteme, setTeilsysteme] = useState<Record<string, Teilsystem>>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [posData, tsData] = await Promise.all([
                    PositionService.getPositionen(),
                    SubsystemService.getTeilsysteme(projektId)
                ]);

                // Create a map for quick lookup
                const tsMap: Record<string, Teilsystem> = {};
                tsData.forEach(ts => {
                    tsMap[ts.id] = ts;
                });
                setTeilsysteme(tsMap);

                // Filter positions to current project
                const projectTsIds = tsData.map(ts => ts.id);
                setItems(posData.filter(p => projectTsIds.includes(p.teilsystemId)));
            } catch (error) {
                console.error("Failed to load positions/teilsysteme:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projektId]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (teilsysteme[item.teilsystemId]?.name.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Positionen</h1>
                    <p className="text-muted-foreground font-medium mt-1">Überblick über alle erfassten Positionen des Projekts.</p>
                </div>
                <Link href={`/${projektId}/positionen/erfassen`}>
                    <Button className="h-11 px-8 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <Plus className="h-5 w-5" />
                        <span>Position erfassen</span>
                    </Button>
                </Link>
            </div>

            <Card className="shadow-xl border-2 border-border overflow-hidden rounded-2xl">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Nach Bezeichnung o. Teilsystem suchen..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 font-bold">
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bezeichnung</TableHead>
                                    <TableHead>Teilsystem</TableHead>
                                    <TableHead>Menge</TableHead>
                                    <TableHead>Einheit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aktionen</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id} className="group">
                                        <TableCell className="font-bold text-foreground">{item.name}</TableCell>
                                        <TableCell className="font-medium text-primary">
                                            {teilsysteme[item.teilsystemId] ? (
                                                <Link href={`/${projektId}/teilsysteme/${item.teilsystemId}`} className="hover:underline">
                                                    {teilsysteme[item.teilsystemId].teilsystemNummer} - {teilsysteme[item.teilsystemId].name}
                                                </Link>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground">{item.menge}</TableCell>
                                        <TableCell className="font-medium text-muted-foreground">{item.einheit}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={item.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Link href={`/${projektId}/positionen/${item.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted hover:shadow-sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/${projektId}/positionen/${item.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm"
                                                    onClick={async () => {
                                                        if (confirm(`Sind Sie sicher, dass Sie "${item.name}" löschen möchten?`)) {
                                                            try {
                                                                await PositionService.deletePosition(item.id);
                                                                setItems(prev => prev.filter(i => i.id !== item.id));
                                                            } catch (error) {
                                                                console.error("Failed to delete", error);
                                                                alert("Fehler beim Löschen");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
                            <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-bold text-muted-foreground">Keine Positionen gefunden</h3>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
