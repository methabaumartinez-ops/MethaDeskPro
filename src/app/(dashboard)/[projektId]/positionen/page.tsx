'use client';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Position, Teilsystem } from '@/types';
import { Eye, Filter, ListTodo, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

export default function PositionenListPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const pathname = usePathname();
    const searchParamsParams = useSearchParams();

    let fromParam = '';
    if (pathname.includes('/produktion/avor')) fromParam = 'from=avor';
    else if (pathname.includes('/produktion/planung')) fromParam = 'from=planner';
    else if (pathname.includes('/produktion/einkauf')) fromParam = 'from=einkauf';
    else if (pathname.includes('/ausfuehrung')) fromParam = 'from=ausfuehrung';
    const [items, setItems] = useState<Position[]>([]);
    const [teilsysteme, setTeilsysteme] = useState<Record<string, Teilsystem>>({});
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [posToDelete, setPosToDelete] = useState<Position | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [posData, tsData] = await Promise.all([
                    PositionService.getPositionen(),
                    SubsystemService.getTeilsysteme(projektId)
                ]);

                const tsMap: Record<string, Teilsystem> = {};
                tsData.forEach(ts => { tsMap[ts.id] = ts; });
                setTeilsysteme(tsMap);

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

    const autocompleteItems = items.map(i => ({
        id: i.id,
        label: i.name,
        sublabel: teilsysteme[i.teilsystemId]?.name,
    }));

    return (
        <div className="space-y-6">
            <ModuleActionBanner
                icon={ListTodo}
                title="Positionen"
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/positionen/${id}${fromParam ? `?${fromParam}` : ''}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder="Nach Bezeichnung o. Teilsystem suchen..."
                ctaLabel="Position erfassen"
                ctaHref={`/${projektId}/positionen/erfassen`}
            />

            <Card className="shadow-xl border-2 border-border overflow-hidden rounded-2xl">
                <CardContent className="pt-4">

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
                                                <Link href={`/${projektId}/teilsysteme/${item.teilsystemId}${fromParam ? `?${fromParam}` : ''}`} className="hover:underline">
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
                                                <Link href={`/${projektId}/positionen/${item.id}${fromParam ? `?${fromParam}` : ''}`}>
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
                                                    onClick={() => setPosToDelete(item)}
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
                        <div className="py-20 text-center border-2 border-dashed border-border rounded-xl bg-muted">
                            <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-bold text-muted-foreground">Keine Positionen gefunden</h3>
                        </div>
                    )}
                </CardContent>
            </Card>
            <ConfirmDialog
                isOpen={!!posToDelete}
                onClose={() => setPosToDelete(null)}
                onConfirm={async () => {
                    if (!posToDelete) return;
                    try {
                        await PositionService.deletePosition(posToDelete.id);
                        setItems(prev => prev.filter(i => i.id !== posToDelete.id));
                        toast.success("Position gelöscht");
                    } catch (error) {
                        console.error("Failed to delete", error);
                        toast.error("Fehler beim Löschen");
                    } finally {
                        setPosToDelete(null);
                    }
                }}
                title="Position löschen"
                description={`Sind Sie sicher, dass Sie "${posToDelete?.name}" permanent löschen möchten?`}
                confirmLabel="Löschen"
                variant="danger"
            />
        </div>
    );
}
