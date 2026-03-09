'use client';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeService } from '@/lib/services/employeeService';
import { Mitarbeiter } from '@/types';
import { Plus, User, Users, Mail, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { useSortableTable } from '@/lib/hooks/useSortableTable';
import { cn } from '@/lib/utils';

export default function MitarbeiterListPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Mitarbeiter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemToDelete, setItemToDelete] = useState<Mitarbeiter | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await EmployeeService.getMitarbeiter();
                // Sort alphabetically by first name then last name
                const sorted = [...data].sort((a, b) => {
                    const nameA = `${a.vorname} ${a.nachname}`.toLowerCase();
                    const nameB = `${b.vorname} ${b.nachname}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                setItems(sorted);
            } catch (error) {
                console.error("Failed to load employees", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleDeleteConfirmed = async () => {
        if (!itemToDelete) return;
        try {
            await EmployeeService.deleteMitarbeiter(itemToDelete.id);
            setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
            toast.success("Mitarbeiter gelöscht");
        } catch (error) {
            console.error("Failed to delete", error);
            toast.error("Fehler beim Löschen");
        } finally {
            setItemToDelete(null);
        }
    };

    const filteredItems = items.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            item.vorname.toLowerCase().includes(search) ||
            item.nachname.toLowerCase().includes(search) ||
            item.email.toLowerCase().includes(search) ||
            item.rolle.toLowerCase().includes(search)
        );
    });

    // Enrich with fullName for sorting
    const enriched = filteredItems.map(i => ({ ...i, _fullName: `${i.vorname} ${i.nachname}` }));
    const { sortedData: sortedItems, handleSort, getSortIcon, isSortActive } = useSortableTable(enriched, '_fullName', 'asc');

    return (
        <div className="space-y-6">
            <ModuleActionBanner
                icon={Users}
                title="Mitarbeiter"
                onSearch={setSearchTerm}
                searchPlaceholder="Mitarbeiter suchen..."
                ctaLabel="Hinzufügen"
                ctaHref={`/${projektId}/mitarbeiter/erfassen`}
                ctaIcon={Plus}
            />

            <Card className="overflow-hidden border-none shadow-xl bg-card">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="border-none rounded-none">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-border/50">
                                        <TableHead className={cn('font-bold py-4 cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('_fullName') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('_fullName')}>
                                            Mitarbeiter <span className="text-[9px] opacity-50">{getSortIcon('_fullName')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('rolle') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('rolle')}>
                                            Rolle <span className="text-[9px] opacity-50">{getSortIcon('rolle')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('stundensatz') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('stundensatz')}>
                                            Stundensatz <span className="text-[9px] opacity-50">{getSortIcon('stundensatz')}</span>
                                        </TableHead>
                                        <TableHead className={cn('font-bold cursor-pointer select-none hover:text-orange-600 transition-colors', isSortActive('email') ? 'text-orange-700' : 'text-foreground')} onClick={() => handleSort('email')}>
                                            E-Mail <span className="text-[9px] opacity-50">{getSortIcon('email')}</span>
                                        </TableHead>
                                        <TableHead className="text-right font-bold text-foreground">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                                                Keine Mitarbeiter gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedItems.map((item) => (
                                            <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 shadow-sm">
                                                            <User className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground text-sm tracking-tight">{item.vorname} {item.nachname}</span>
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest mt-0.5">METHABAU</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
                                                        <Shield className="h-3 w-3" />
                                                        {item.rolle}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 font-bold text-slate-700 text-sm">
                                                        {(item.stundensatz ?? 55).toFixed(2)} CHF/h
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {item.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link href={`/${projektId}/mitarbeiter/${item.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 hover:text-primary transition-all duration-200">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/${projektId}/mitarbeiter/${item.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-muted-foreground/30 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                                            onClick={() => setItemToDelete(item)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
            <ConfirmDialog
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDeleteConfirmed}
                title="Mitarbeiter löschen"
                description={`Sind Sie sicher, dass Sie "${itemToDelete?.vorname} ${itemToDelete?.nachname}" permanent löschen möchten?`}
                confirmLabel="Löschen"
                variant="danger"
            />
        </div>
    );
}
