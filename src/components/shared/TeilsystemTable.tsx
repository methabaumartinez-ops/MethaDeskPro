'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem, ABTEILUNGEN_CONFIG } from '@/types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn, cleanBemerkung } from '@/lib/utils';

interface TeilsystemTableProps {
    items: Teilsystem[];
    projektId: string;
    onDelete: (item: Teilsystem) => void;
}

export function TeilsystemTable({ items, projektId, onDelete }: TeilsystemTableProps) {
    const router = useRouter();

    // Default numeric sort by teilsystemNummer
    const sortedItems = [...items].sort((a, b) => {
        const numA = parseInt(a.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });

    return (
        <div className="overflow-x-auto max-w-full">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="w-20 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">System-Nr.</TableHead>
                        <TableHead className="w-12 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                        <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Bezeichnung</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Abteilung</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Status</TableHead>
                        <TableHead className="px-4 py-4 text-right font-black text-foreground text-[10px] uppercase tracking-wider">Aktionen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedItems.map((item) => {
                        const deptConfig = ABTEILUNGEN_CONFIG.find(a => a.name === item.abteilung);
                        return (
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
                                            {cleanBemerkung(item.bemerkung) || 'Keine Bemerkung'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="p-4">
                                    <Badge variant={(deptConfig?.color as any) || 'info'} className="font-bold text-[10px] uppercase">
                                        {item.abteilung || 'Nicht zugewiesen'}
                                    </Badge>
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
                                            onClick={() => onDelete(item)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
