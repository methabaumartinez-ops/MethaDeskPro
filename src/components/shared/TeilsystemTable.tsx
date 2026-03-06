'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem } from '@/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ITEM_STATUS_OPTIONS, ABTEILUNGEN_CONFIG, ItemStatus, Abteilung } from '@/types';
import { cn, cleanBemerkung } from '@/lib/utils';
import { SubsystemService } from '@/lib/services/subsystemService';
import { getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { AbteilungWarningModal } from './AbteilungWarningModal';
import { AbteilungBadge } from '@/components/shared/AbteilungBadge';

interface TeilsystemTableProps {
    items: Teilsystem[];
    projektId: string;
    onRefresh?: () => void;
    editable?: boolean;
    showAbteilung?: boolean;
    currentAbteilung?: string;
}

export function TeilsystemTable({
    items,
    projektId,
    onRefresh,
    editable = false,
    showAbteilung = false,
    currentAbteilung
}: TeilsystemTableProps) {
    const router = useRouter();
    const pathname = usePathname();

    let fromParam = '';
    if (pathname.includes('/produktion/avor')) fromParam = '?from=avor';
    else if (pathname.includes('/produktion/planung')) fromParam = '?from=planner';
    else if (pathname.includes('/produktion/einkauf')) fromParam = '?from=einkauf';
    else if (pathname.includes('/ausfuehrung')) fromParam = '?from=ausfuehrung';

    const [warningOpen, setWarningOpen] = React.useState(false);

    // Default numeric sort by teilsystemNummer
    const sortedItems = [...items].sort((a, b) => {
        const numA = parseInt(a.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });

    const handleStatusChange = async (id: string, newStatus: ItemStatus) => {
        try {
            await SubsystemService.updateTeilsystem(id, { status: newStatus });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleAbteilungChange = async (item: Teilsystem, newAbteilung: Abteilung) => {
        if (item.status !== 'abgeschlossen') {
            setWarningOpen(true);
            return;
        }

        try {
            await SubsystemService.updateTeilsystem(item.id, { abteilung: newAbteilung });
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to update abteilung", error);
        }
    };

    const abteilungOptions = ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }));

    return (
        <div className="overflow-x-auto max-w-full">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="w-20 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">System-Nr.</TableHead>
                        <TableHead className="w-24 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                        <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Bezeichnung</TableHead>
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Termine</TableHead>
                        {showAbteilung && <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Abteilung</TableHead>}
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider w-40">Status</TableHead>
                        <TableHead className="w-10 px-4 py-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedItems.map((item) => {
                        const canEdit = editable && (!currentAbteilung || item.abteilung === currentAbteilung);

                        return (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-border/50"
                                onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}${fromParam}`)}
                            >
                                <TableCell className="p-4 text-center">
                                    <Badge variant="outline" className="font-black text-orange-700 border-orange-200 bg-orange-50 text-xs py-1 px-3">
                                        {item.teilsystemNummer || '—'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="p-4 font-black text-muted-foreground text-xs whitespace-nowrap">
                                    {item.ks === '1' ? '1 Baumeister' : item.ks === '2' ? '2 Produktion' : item.ks === '3' ? '3 Extern' : (item.ks || '1')}
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
                                {showAbteilung && (
                                    <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                                        {canEdit ? (
                                            <Select
                                                value={item.abteilung || 'Schlosserei'}
                                                onChange={(e) => handleAbteilungChange(item, e.target.value as Abteilung)}
                                                options={abteilungOptions}
                                                className={cn("h-9 text-xs font-bold w-full", getAbteilungColorClasses(item.abteilung))}
                                            />
                                        ) : (
                                            <AbteilungBadge abteilung={item.abteilung || 'Schlosserei'} />
                                        )}
                                    </TableCell>
                                )}
                                <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                                    {canEdit ? (
                                        <Select
                                            value={item.status || 'offen'}
                                            onChange={(e) => handleStatusChange(item.id, e.target.value as ItemStatus)}
                                            options={ITEM_STATUS_OPTIONS}
                                            className={cn("h-9 text-xs font-bold w-full", getStatusColorClasses(item.status))}
                                        />
                                    ) : (
                                        <StatusBadge status={item.status || 'offen'} />
                                    )}
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
            <AbteilungWarningModal
                isOpen={warningOpen}
                onClose={() => setWarningOpen(false)}
            />
        </div>
    );
}
