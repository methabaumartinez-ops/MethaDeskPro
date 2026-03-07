'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Teilsystem, Projekt } from '@/types';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ITEM_STATUS_OPTIONS, ABTEILUNGEN_CONFIG, ItemStatus, Abteilung } from '@/types';
import { cn, isMontageterminProvisional, getAppUrl } from '@/lib/utils';
import { SubsystemService } from '@/lib/services/subsystemService';
import { getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { AbteilungWarningModal } from './AbteilungWarningModal';
import { AbteilungBadge } from '@/components/shared/AbteilungBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ItemQrModal } from '@/components/shared/ItemQrModal';
import { toast } from '@/lib/toast';
import { QRCodeSVG } from 'qrcode.react';

interface TeilsystemTableProps {
    items: Teilsystem[];
    projektId: string;
    projekt?: Projekt | null;
    onRefresh?: () => void;
    editable?: boolean;
    showAbteilung?: boolean;
    currentAbteilung?: string;
}

export function TeilsystemTable({
    items,
    projektId,
    projekt,
    onRefresh,
    editable = false,
    showAbteilung = true,
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
    const [qrItem, setQrItem] = React.useState<Teilsystem | null>(null);

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
        <>
            <div className="overflow-x-auto max-w-full">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-b-2 border-border hover:bg-transparent">
                            {/* 1. TS Nummer */}
                            <TableHead className="w-20 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">TS-Nr.</TableHead>
                            {/* 2. TS Name */}
                            <TableHead className="min-w-[200px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">TS Name</TableHead>
                            {/* 2b. Kostenstelle */}
                            <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">KS</TableHead>
                            {/* 3. Lieferdatum */}
                            <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider whitespace-nowrap">Lieferdatum</TableHead>
                            {/* 4. Montage */}
                            <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Montage</TableHead>
                            {/* 5. QR */}
                            <TableHead className="w-14 px-4 py-4 font-black text-foreground text-center text-[10px] uppercase tracking-wider">QR</TableHead>
                            {/* 6. Abteilung */}
                            <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider">Abteilung</TableHead>
                            {/* 7. Status */}
                            <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider w-40">Status</TableHead>
                            {/* Arrow */}
                            <TableHead className="w-10 px-4 py-4" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedItems.map((item) => {
                            const canEdit = editable && (!currentAbteilung || item.abteilung === currentAbteilung);
                            const qrValue = `TS:${item.teilsystemNummer || item.id}`;

                            return (
                                <TableRow
                                    key={item.id}
                                    className="group hover:bg-orange-50/50 transition-colors cursor-pointer border-b border-border/50"
                                    onClick={() => router.push(`/${projektId}/teilsysteme/${item.id}${fromParam}`)}
                                >
                                    {/* 1. TS-Nr. */}
                                    <TableCell className="p-4 text-center">
                                        <Badge variant="outline" className="font-black text-orange-600 border-orange-200 bg-orange-50 text-xs py-1 px-3">
                                            {item.teilsystemNummer || '—'}
                                        </Badge>
                                    </TableCell>

                                    {/* 2. TS Name */}
                                    <TableCell className="p-4">
                                        <span className="font-black text-foreground text-sm tracking-tight">{item.name}</span>
                                    </TableCell>

                                    {/* 2b. KS */}
                                    <TableCell className="p-4">
                                        <span className="text-xs font-semibold text-slate-600">
                                            {item.ks === '1' ? 'Baumeister' : item.ks === '2' ? 'Produktion' : item.ks === '3' ? 'Extern' : String(item.ks || '').replace(/^\d+\s*/, '').trim() || '—'}
                                        </span>
                                    </TableCell>

                                    {/* 3. Lieferdatum */}
                                    <TableCell className="p-4">
                                        <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                                            {item.lieferfrist || '—'}
                                        </span>
                                    </TableCell>

                                    {/* 4. Montage */}
                                    <TableCell className="p-4">
                                        <span className={cn("text-xs font-black", 
                                            item.montagetermin 
                                                ? (isMontageterminProvisional(item) ? "text-red-600" : "text-slate-700")
                                                : "text-red-600"
                                        )}>
                                            {item.montagetermin || 'Durch Bauleiter'}
                                        </span>
                                    </TableCell>

                                    {/* 5. QR Thumbnail */}
                                    <TableCell
                                        className="p-2 text-center"
                                        onClick={(e) => { e.stopPropagation(); setQrItem(item); }}
                                    >
                                        <div className="inline-flex items-center justify-center w-9 h-9 bg-white border border-border rounded-lg p-0.5 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer">
                                            <QRCodeSVG
                                                value={`${getAppUrl()}/share/teilsystem/${item.id}`}
                                                size={28}
                                                level="L"
                                            />
                                        </div>
                                    </TableCell>

                                    {/* 6. Abteilung */}
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

                                    {/* 7. Status */}
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

                                    {/* Arrow */}
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
            </div>

            {/* QR Modal — identical to detail page */}
            {qrItem && (
                <ItemQrModal
                    isOpen={!!qrItem}
                    onClose={() => setQrItem(null)}
                    title={qrItem.name}
                    subtitle={`TS ${(qrItem.teilsystemNummer || '').replace(/^ts\s?/i, '')}`}
                    qrValue={`${getAppUrl()}/share/teilsystem/${qrItem.id}`}
                    countLabel="Teilsystem Nr."
                    count={parseInt(qrItem.teilsystemNummer?.replace(/\D/g, '') || '0', 10)}
                    filePrefix="TS"
                    id={qrItem.id}
                    projectNumber={projekt?.projektnummer}
                    projectName={projekt?.projektname}
                />
            )}

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
        </>
    );
}
