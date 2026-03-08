'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SupplierService } from '@/lib/services/supplierService';
import { Lieferant } from '@/types';
import { Plus, Truck, Mail, Phone, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { useSortableTable } from '@/lib/hooks/useSortableTable';
import { cn } from '@/lib/utils';

export default function LieferantenListPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Lieferant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await SupplierService.getLieferanten();
                const sorted = [...data].sort((a, b) =>
                    (a.name || '').localeCompare(b.name || '')
                );
                setItems(sorted);
            } catch (err) {
                console.error('Failed to load suppliers:', err);
                setError('Fehler beim Laden der Lieferanten.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredItems = items.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            (item.name?.toLowerCase() || '').includes(search) ||
            (item.kontakt?.toLowerCase() || '').includes(search) ||
            (item.email?.toLowerCase() || '').includes(search) ||
            (item.telefon?.toLowerCase() || '').includes(search) ||
            (item.adresse?.toLowerCase() || '').includes(search)
        );
    });

    const { sortedData: sortedItems, handleSort, getSortIcon, isSortActive } = useSortableTable(filteredItems);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4 max-w-none">
            <ModuleActionBanner
                icon={Truck}
                title="Lieferanten"
                ctaLabel="Hinzufügen"
                ctaHref={`/${projektId}/lieferanten/erfassen`}
                ctaIcon={Plus}
                onSearch={setSearchTerm}
                searchPlaceholder="Lieferant suchen..."
            />

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 mx-2">
                    {error}
                </div>
            )}

            <Card className="overflow-hidden border-none shadow-xl bg-card flex-1 w-full">
                <CardContent className="p-0 h-full overflow-auto">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <Table className="border-none rounded-none w-full min-w-full">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-border/50">
                                        <TableHead className={cn('font-bold py-4 w-20 cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('id') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('id')}>
                                            ID <span className="text-[9px] opacity-50">{getSortIcon('id')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold py-4 cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('name') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('name')}>
                                            Firma <span className="text-[9px] opacity-50">{getSortIcon('name')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('kontakt') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('kontakt')}>
                                            Kontaktperson <span className="text-[9px] opacity-50">{getSortIcon('kontakt')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('email') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('email')}>
                                            E-Mail <span className="text-[9px] opacity-50">{getSortIcon('email')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('telefon') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('telefon')}>
                                            Telefon <span className="text-[9px] opacity-50">{getSortIcon('telefon')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('adresse') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('adresse')}>
                                            Adresse <span className="text-[9px] opacity-50">{getSortIcon('adresse')}</span>
                                        </TableHead>
                                        <TableHead className="font-bold text-foreground">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-medium">
                                                Keine Lieferanten gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedItems.map((item) => (
                                            <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
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
                                                        <span className="font-bold text-foreground text-sm tracking-tight">{item.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium text-foreground">{item.kontakt || '—'}</span>
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
                                                <TableCell>
                                                    {item.adresse ? (
                                                        <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate max-w-[200px]">{item.adresse}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" title="Aktiv" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
