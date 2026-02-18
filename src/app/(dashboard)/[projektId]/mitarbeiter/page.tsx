'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeService } from '@/lib/services/employeeService';
import { Mitarbeiter } from '@/types';
import { Plus, User, Mail, Shield, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function MitarbeiterListPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Mitarbeiter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleDelete = async (item: Mitarbeiter) => {
        if (confirm(`Sind Sie sicher, dass Sie "${item.vorname} ${item.nachname}" löschen möchten?`)) {
            try {
                await EmployeeService.deleteMitarbeiter(item.id);
                setItems(prev => prev.filter(i => i.id !== item.id));
            } catch (error) {
                console.error("Failed to delete", error);
                alert("Fehler beim Löschen");
            }
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mitarbeiter</h1>
                    <p className="text-muted-foreground font-medium mt-1">Teammitglieder, die diesem Projekt zugewiesen sind.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-72">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Mitarbeiter suchen..."
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href={`/${projektId}/mitarbeiter/erfassen`}>
                        <Button className="font-bold shadow-lg shadow-primary/20 whitespace-nowrap">
                            <Plus className="h-5 w-5 mr-2" />
                            Hinzufügen
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
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
                                        <TableHead className="font-bold text-foreground py-4">Mitarbeiter</TableHead>
                                        <TableHead className="font-bold text-foreground">Rolle</TableHead>
                                        <TableHead className="font-bold text-foreground">E-Mail</TableHead>
                                        <TableHead className="text-right font-bold text-foreground">Aktionen</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-medium">
                                                Keine Mitarbeiter gefunden.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.map((item) => (
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
                                                            onClick={() => handleDelete(item)}
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
        </div>
    );
}
