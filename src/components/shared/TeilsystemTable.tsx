'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem, ABTEILUNGEN_CONFIG, ItemStatus } from '@/types';
import { Eye, Edit, Trash2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn, cleanBemerkung } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { SubsystemService } from '@/lib/services/subsystemService';

interface TeilsystemTableProps {
    items: Teilsystem[];
    projektId: string;
    onDelete: (item: Teilsystem) => void;
    onRefresh?: () => void;
}

export function TeilsystemTable({ items, projektId, onDelete, onRefresh }: TeilsystemTableProps) {
    const router = useRouter();
    const [updatingId, setUpdatingId] = React.useState<string | null>(null);

    const handleStatusChange = async (item: Teilsystem, newStatus: string) => {
        setUpdatingId(item.id);
        try {
            await SubsystemService.updateTeilsystem(item.id, { status: newStatus as ItemStatus });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Fehler beim Aktualisieren del Status");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAbteilungChange = async (item: Teilsystem, newAbteilung: string) => {
        if (item.status !== 'abgeschlossen' && item.status !== 'geliefert' && item.status !== 'verbaut' && item.status !== 'fertig') {
            alert(`Abteilung kann erst geändert werden, wenn der Status Fertig (Abgeschlossen) ist.`);
            return;
        }

        try {
            setUpdatingId(item.id);
            await SubsystemService.updateTeilsystem(item.id, { abteilung: newAbteilung as any });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to update abteilung", error);
            alert("Fehler beim Aktualisieren der Abteilung");
        } finally {
            setUpdatingId(null);
        }
    };

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
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Abteilung (Ändern)</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Status (Ändern)</TableHead>
                        <TableHead className="w-10 px-4 py-4"></TableHead>
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
                                <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        value={item.abteilung || ''}
                                        onChange={(e) => handleAbteilungChange(item, e.target.value)}
                                        options={[
                                            { label: 'Wählen...', value: '' },
                                            ...ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))
                                        ]}
                                        className="h-8 text-[10px] font-bold py-0"
                                        disabled={updatingId === item.id}
                                    />
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
                                <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-col gap-2 min-w-[140px]">
                                        <Select
                                            value={item.status || 'offen'}
                                            onChange={(e) => handleStatusChange(item, e.target.value)}
                                            options={[
                                                { label: 'Offen', value: 'offen' },
                                                { label: 'In Produktion', value: 'in_produktion' },
                                                { label: 'Bestellt', value: 'bestellt' },
                                                { label: 'Geliefert', value: 'geliefert' },
                                                { label: 'Verbaut', value: 'verbaut' },
                                                { label: 'Abgeschlossen', value: 'abgeschlossen' },
                                                { label: 'Nachbearbeitung', value: 'geaendert' },
                                            ]}
                                            className="h-8 text-[10px] font-bold py-0"
                                            disabled={updatingId === item.id}
                                        />
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
