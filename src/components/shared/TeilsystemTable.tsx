'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem } from '@/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cleanBemerkung } from '@/lib/utils';

interface TeilsystemTableProps {
    items: Teilsystem[];
    projektId: string;
    onDelete: (item: Teilsystem) => void;
    onRefresh?: () => void;
}

export function TeilsystemTable({ items, projektId, onDelete, onRefresh }: TeilsystemTableProps) {
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
                        <TableHead className="w-24 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                        <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Bezeichnung</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Status</TableHead>
                        <TableHead className="w-10 px-4 py-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedItems.map((item) => {
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
                                <TableCell className="p-4 font-black text-muted-foreground text-xs whitespace-nowrap">
                                    {item.ks === '1' ? '1 Baumeister' : item.ks === '2' ? '2 Produktion' : (item.ks || '1')}
                                </TableCell>
                                <TableCell className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-foreground text-sm tracking-tight">{item.name}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[250px] italic">
                                            {cleanBemerkung(item.bemerkung) || 'Keine Bemerkung'}
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
                                    <StatusBadge status={item.status || 'offen'} />
                                </TableCell>
                                <TableCell className="p-4 text-right">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight className="h-4 w-4 text-orange-400" />
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
