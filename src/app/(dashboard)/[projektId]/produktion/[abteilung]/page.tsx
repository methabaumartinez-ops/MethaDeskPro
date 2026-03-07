'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, ShoppingCart, Wrench, Box, Layers, Save } from 'lucide-react';
import { cn, isMontageterminProvisional } from '@/lib/utils';
import { Teilsystem, Projekt, ABTEILUNGEN_CONFIG, ITEM_STATUS_OPTIONS, ItemStatus, Abteilung } from '@/types';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { SplitLayout, SplitLayoutList, SplitLayoutDetail } from '@/components/layout/SplitLayout';

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

import { getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { toast } from '@/lib/toast';

export default function AbteilungPage() {
    const { projektId, abteilung: abteilungSlug } = useParams() as { projektId: string; abteilung: string };
    const router = useRouter();
    const pathname = usePathname();
    let fromParam = '';
    if (pathname.includes('/produktion/avor')) fromParam = '?from=avor';
    else if (pathname.includes('/produktion/planung')) fromParam = '?from=planner';
    else if (pathname.includes('/produktion/einkauf')) fromParam = '?from=einkauf';
    else if (pathname.includes('/ausfuehrung')) fromParam = '?from=ausfuehrung';

    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [editStatus, setEditStatus] = useState<string>('');
    const [editAbteilung, setEditAbteilung] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    // Find department name from slug
    const abteilungConfig = ABTEILUNGEN_CONFIG.find(a => a.id === abteilungSlug);
    const abteilungName = abteilungConfig?.name || abteilungSlug;

    // Icon mapping matching sidebar (Sidebar.tsx)
    const ABTEILUNG_ICONS: Record<string, React.ElementType> = {
        avor: ClipboardList,
        einkauf: ShoppingCart,
        schlosserei: Wrench,
        blech: Box,
    };
    const AbteilungIcon = ABTEILUNG_ICONS[abteilungSlug] || Layers;

    const loadData = async () => {
        setLoading(true);
        try {
            const [teilsystemeRes, projRes] = await Promise.all([
                fetch(`/api/teilsysteme?projektId=${projektId}&abteilungId=${abteilungName}`),
                fetch(`/api/data/projekte/${projektId}`)
            ]);

            if (teilsystemeRes.ok) {
                setItems(await teilsystemeRes.json());
            }
            if (projRes.ok) {
                setProject(await projRes.json());
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projektId, abteilungName]);

    const filteredItems = items.filter(item =>
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.name?.toLowerCase() || '').includes(search.toLowerCase())
    ).sort((a, b) => {
        const numA = parseInt(a.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.teilsystemNummer?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
    });

    const selectedTs = items.find(i => i.id === selectedId);

    useEffect(() => {
        if (selectedTs) {
            setEditStatus(selectedTs.status || 'offen');
            setEditAbteilung(selectedTs.abteilung || abteilungName);
        } else {
            setEditStatus('');
            setEditAbteilung('');
        }
    }, [selectedTs]);

    const handleSave = async () => {
        if (!selectedId) return;
        setIsSaving(true);
        try {
            await SubsystemService.updateTeilsystem(selectedId, {
                status: editStatus as ItemStatus,
                abteilung: editAbteilung as Abteilung
            });
            toast.success('Erfolgreich gespeichert');
            await loadData();
        } catch (error) {
            console.error('Save error', error);
            toast.error('Fehler beim Speichern');
        } finally {
            setIsSaving(false);
        }
    };
    const autocompleteItems = items.map(i => ({
        id: i.id,
        label: `${i.teilsystemNummer ?? ''} — ${i.name}`.trim(),
    }));

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={AbteilungIcon}
                title={abteilungName}
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/teilsysteme/${id}${fromParam}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder="Suche Nummer oder Name..."
                ctaLabel="Neu TS erfassen"
                ctaHref={`/${projektId}/teilsysteme/erfassen?abteilung=${encodeURIComponent(abteilungName)}`}
            />

            {/* MAIN CONTENT TABLE */}
            <SplitLayout>
                <SplitLayoutList>
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-20 border-b border-border">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-16 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider bg-muted/95">KS</TableHead>
                                    <TableHead className="w-24 px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider bg-muted/95">TS-Nr.</TableHead>
                                    <TableHead className="min-w-[150px] px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider bg-muted/95">Bezeichnung</TableHead>
                                    <TableHead className="px-4 py-4 font-black text-foreground text-[10px] uppercase tracking-wider bg-muted/95">Montage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map(item => {
                                    const isSelected = item.id === selectedId;
                                    return (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => setSelectedId(item.id)}
                                            className={cn(
                                                'cursor-pointer transition-all border-b border-border/50',
                                                isSelected ? 'bg-orange-50/50 hover:bg-orange-50/80' : 'hover:bg-accent/50'
                                            )}
                                        >
                                            <TableCell className={cn('font-medium py-2.5', isSelected ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : 'border-l-4 border-l-transparent')}>
                                                <div className="text-xs truncate max-w-[80px]">{item.ks === '1' ? 'Baumeister' : item.ks === '2' ? 'Produktion' : item.ks === '3' ? 'Extern' : String(item.ks || '').replace(/^\d+\s*/, '').trim() || '—'}</div>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <Badge variant="outline" className={cn('font-bold text-xs truncate max-w-[100px]', isSelected ? 'border-orange-500 text-orange-700 bg-orange-100/50' : 'border-orange-200 bg-orange-50 text-orange-700 py-1')}>
                                                    {item.teilsystemNummer || '—'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-4">
                                                <div className="font-bold text-sm truncate max-w-[160px]">{item.name}</div>
                                                {item.bemerkung && <div className="text-[10px] text-muted-foreground truncate max-w-[160px] italic mt-0.5">{item.bemerkung}</div>}
                                            </TableCell>
                                            <TableCell className={cn("p-4 text-xs font-black", isMontageterminProvisional(item) ? "text-red-600" : "text-slate-700")}>
                                                {item.montagetermin || '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-32 text-center flex flex-col items-center">
                            <div className="p-6 bg-muted/30 rounded-full mb-6">
                                <AbteilungIcon className="h-16 w-16 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme in {abteilungName}</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                                Für diesen Bereich wurden noch keine Systeme erfasst.
                            </p>
                        </div>
                    )}
                </SplitLayoutList>

                <SplitLayoutDetail isEmpty={!selectedTs}>
                    {selectedTs && (
                        <>
                            <div className="h-1.5 w-full bg-orange-500 shrink-0" />
                            <CardHeader className="border-b bg-muted/10 pb-5">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 block">DETAILANSICHT</span>
                                <CardTitle className="text-xl font-black flex items-center gap-2">
                                    {selectedTs.teilsystemNummer && (
                                        <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-100/50 text-sm hidden sm:flex">
                                            {selectedTs.teilsystemNummer}
                                        </Badge>
                                    )}
                                    <span className="truncate">{selectedTs.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">TS Status</label>
                                    <Select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        options={ITEM_STATUS_OPTIONS}
                                        className={cn("h-12 text-sm font-bold w-full rounded-xl border-2 focus:ring-orange-500 shadow-sm", getStatusColorClasses(editStatus as ItemStatus))}
                                    />
                                </div>
                                <div className="space-y-2.5 pt-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Abteilung</label>
                                    <Select
                                        value={editAbteilung}
                                        onChange={(e) => setEditAbteilung(e.target.value)}
                                        options={ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))}
                                        className={cn("h-12 text-sm font-bold w-full rounded-xl border-2 focus:ring-orange-500 shadow-sm", getAbteilungColorClasses(editAbteilung as Abteilung))}
                                    />
                                </div>
                            </div>
                            <div className="p-5 border-t bg-muted/10 flex justify-end shrink-0">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="font-black text-xs uppercase bg-orange-600 hover:bg-orange-700 text-white h-12 shadow-md shadow-orange-500/20 rounded-xl px-8 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                                >
                                    {isSaving ? <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />}
                                    Speichern
                                </Button>
                            </div>
                        </>
                    )}
                </SplitLayoutDetail>
            </SplitLayout>

        </div>
    );
}
