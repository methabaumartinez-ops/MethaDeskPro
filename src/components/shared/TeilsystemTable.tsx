'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem } from '@/types';
import { ArrowRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ITEM_STATUS_OPTIONS, ABTEILUNGEN_CONFIG, ItemStatus, Abteilung } from '@/types';
import { cn, cleanBemerkung, isMontageterminProvisional } from '@/lib/utils';
import { SubsystemService } from '@/lib/services/subsystemService';
import { getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { AbteilungWarningModal } from './AbteilungWarningModal';
import { AbteilungBadge } from '@/components/shared/AbteilungBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/lib/toast';

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
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [itemToDelete, setItemToDelete] = React.useState<Teilsystem | null>(null);

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

    const handleDeleteClick = (e: React.MouseEvent, item: Teilsystem) => {
        e.stopPropagation();
        setItemToDelete(item);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        try {
            await SubsystemService.deleteTeilsystem(itemToDelete.id);
            toast.success("Teilsystem gelöscht");
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Failed to delete teilsystem", error);
            toast.error("Fehler beim Löschen");
        } finally {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
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
                        <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Montage</TableHead>
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
                                className="group hover:bg-orange-50/50 transition-colors cursor-pointer border-b border-border/50"
                                onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}${fromParam}`)}
                            >
                                <TableCell className="p-4 text-center">
                                    <Badge variant="outline" className="font-black text-orange-600 border-orange-200 bg-orange-50 text-xs py-1 px-3">
                                        {item.teilsystemNummer || '—'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="p-4 font-black text-muted-foreground text-xs whitespace-nowrap">
                                    {item.ks === '1' ? 'Baumeister' : item.ks === '2' ? 'Produktion' : item.ks === '3' ? 'Extern' : String(item.ks || '').replace(/^\d+\s*/, '').trim() || '—'}
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
                                <span className={cn("text-xs font-black", isMontageterminProvisional(item) ? "text-red-600" : "text-slate-700")}>{item.montagetermin || '—'}</span>
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
                                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canEdit && (
                                            <button
                                                onClick={(e) => handleDeleteClick(e, item)}
                                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                title="Teilsystem löschen"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        <ArrowRight className="h-4 w-4 text-orange-500" />
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
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Teilsystem löschen"
                description={`Sind Sie sicher, dass Sie das Teilsystem "${itemToDelete?.teilsystemNummer || ''} — ${itemToDelete?.name || ''}" permanent löschen möchten?`}
                confirmLabel="Löschen"
                variant="danger"
            />
        </div>
    );
}
