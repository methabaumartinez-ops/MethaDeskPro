'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { Teilsystem, Mitarbeiter } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, Save, Layers } from 'lucide-react';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SplitLayout, SplitLayoutList, SplitLayoutDetail } from '@/components/layout/SplitLayout';

function getISOWeek(dateStr: string | null | undefined): number | string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PlanerPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [employees, setEmployees] = useState<Mitarbeiter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [editStatus, setEditStatus] = useState<string>('');
    const [editOpenedBy, setEditOpenedBy] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant: 'success' | 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        description: '',
        variant: 'info'
    });

    const showMsg = (title: string, description: string, variant: 'success' | 'danger' | 'warning' | 'info' = 'info') => {
        setDialogConfig({ isOpen: true, title, description, variant });
    };

    useEffect(() => {
        loadData();
    }, [projektId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const tsData = await SubsystemService.getTeilsysteme(projektId, 'Planung');
            const empData = await EmployeeService.getMitarbeiter();

            const mappedTsData = tsData.map(ts => {
                let s: string = ts.status || 'offen';
                if (s === 'in_produktion') s = 'in_arbeit';
                else if (s === 'verbaut') s = 'fertig';
                else if (!['offen', 'in_arbeit', 'fertig'].includes(s)) s = 'offen';
                return { ...ts, status: s as any };
            });

            const plannerEmps = empData.filter(e => {
                const abt = (e as any).abteilung?.toLowerCase() || (e as any).department?.toLowerCase() || '';
                return ['planung', 'planer'].includes(abt);
            });
            setEmployees(plannerEmps.length > 0 ? plannerEmps : empData);

            const sorted = mappedTsData.sort((a, b) => {
                if (!a.abgabePlaner && !b.abgabePlaner) return 0;
                if (!a.abgabePlaner) return 1;
                if (!b.abgabePlaner) return -1;
                return new Date(a.abgabePlaner).getTime() - new Date(b.abgabePlaner).getTime();
            });

            setItems(sorted);

            if (sorted.length > 0) {
                setSelectedId(prev => {
                    const stillExists = sorted.find(s => s.id === prev);
                    return stillExists ? stillExists.id : sorted[0].id;
                });
            } else {
                setSelectedId(null);
            }
        } catch (error) {
            console.error('Failed to load planner data', error);
            showMsg('Fehler', 'Fehler beim Laden der Daten', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const selectedTs = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

    useEffect(() => {
        if (selectedTs) {
            setEditStatus(selectedTs.status || 'offen');
            setEditOpenedBy(selectedTs.eroeffnetDurch || '');
        } else {
            setEditStatus('');
            setEditOpenedBy('');
        }
    }, [selectedTs]);

    const handleSelect = (ts: Teilsystem) => {
        setSelectedId(ts.id);
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setIsSaving(true);
        try {
            await SubsystemService.updateTeilsystem(selectedId, {
                status: editStatus as any,
                eroeffnetDurch: editOpenedBy
            });
            showMsg('Erfolg', 'Erfolgreich gespeichert', 'success');
            await loadData();
        } catch (error) {
            console.error('Save error', error);
            showMsg('Fehler', 'Fehler beim Speichern', 'danger');
        } finally {
            setIsSaving(false);
        }
    };

    const employeeOptions = employees.map(e => ({
        value: e.id,
        label: `${e.vorname} ${e.nachname}`
    }));

    const getStatusColorClass = (status: string) => {
        switch (status) {
            case 'offen': return 'bg-green-100 text-green-800 border-green-300';
            case 'in_arbeit': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'fertig': return 'bg-white text-black border-slate-200';
            default: return 'bg-white text-black border-slate-200';
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ConfirmDialog
                isOpen={dialogConfig.isOpen}
                onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                title={dialogConfig.title}
                description={dialogConfig.description}
                variant={dialogConfig.variant}
                confirmLabel="Verstanden"
                showCancel={false}
            />

            <ModuleActionBanner
                icon={Layers}
                title="Planer"
                backHref={`/${projektId}`}
                ctaLabel="Neue TS erfassen"
                ctaHref={`/${projektId}/teilsysteme/erfassen`}
            />

            {loading && items.length === 0 ? (
                <Card className="border-2 rounded-2xl">
                    <CardContent className="py-32 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                    </CardContent>
                </Card>
            ) : items.length === 0 ? (
                <Card className="border-2 border-dashed rounded-2xl">
                    <CardContent className="py-32 text-center flex flex-col items-center">
                        <div className="p-6 bg-muted/30 rounded-full mb-6">
                            <Layers className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme</h3>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">Es wurden keine geplanten Systeme für diese Abteilung gefunden.</p>
                    </CardContent>
                </Card>
            ) : (
                <SplitLayout>
                    {/* Left: Table */}
                    <SplitLayoutList>
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-md z-20 shadow-sm border-b-2">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 bg-muted/95">KS</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 w-24 bg-muted/95">TS Nummer</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 bg-muted/95">Name</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 bg-muted/95">Abgabe Plan</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 w-12 text-center bg-muted/95">KW</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 bg-muted/95">Liefertermin</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-wider text-muted-foreground/80 h-10 w-12 text-center bg-muted/95">KW</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(ts => {
                                        const isSelected = ts.id === selectedId;
                                        return (
                                            <TableRow
                                                key={ts.id}
                                                onClick={() => handleSelect(ts)}
                                                className={cn(
                                                    'cursor-pointer transition-all border-b',
                                                    isSelected ? 'bg-orange-50/50 hover:bg-orange-50/80' : 'hover:bg-accent/50'
                                                )}
                                            >
                                                <TableCell className={cn('font-medium py-2.5', isSelected ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : 'border-l-4 border-l-transparent')}>
                                                    <div className="text-xs truncate max-w-[80px]">{ts.ks || '-'}</div>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <Badge variant="outline" className={cn('font-bold text-xs truncate max-w-[100px]', isSelected ? 'border-orange-500 text-orange-700 bg-orange-100/50' : 'bg-white')}>
                                                        {ts.teilsystemNummer || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="font-bold text-sm truncate max-w-[160px]">{ts.name}</div>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-sm">{formatDate(ts.abgabePlaner)}</TableCell>
                                                <TableCell className="py-2.5 text-center border-r bg-muted/10 font-mono text-xs font-bold text-muted-foreground">{getISOWeek(ts.abgabePlaner)}</TableCell>
                                                <TableCell className="py-2.5 text-sm">{formatDate(ts.lieferfrist)}</TableCell>
                                                <TableCell className="py-2.5 text-center bg-muted/10 font-mono text-xs font-bold text-muted-foreground border-r">{getISOWeek(ts.lieferfrist)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                    </SplitLayoutList>

                    {/* Right: Detail Widget */}
                    <SplitLayoutDetail isEmpty={!selectedTs}>
                        {selectedTs && (
                            <>
                                <div className="h-1.5 w-full bg-orange-500" />
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
                                <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto">
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">TS Status</label>
                                        <Select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                            className={cn(
                                                'font-bold h-12 rounded-xl border-2 focus:ring-orange-500 outline-none transition-colors',
                                                getStatusColorClass(editStatus)
                                            )}
                                            options={[
                                                { label: 'Offen', value: 'offen' },
                                                { label: 'In Arbeit', value: 'in_arbeit' },
                                                { label: 'Fertig', value: 'fertig' }
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-2.5 pt-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">EROEFFNET DURCH</span>
                                        </div>
                                        <SearchableSelect
                                            label=""
                                            options={employeeOptions}
                                            value={editOpenedBy}
                                            onChange={setEditOpenedBy}
                                            placeholder="Mitarbeiter suchen..."
                                            className="font-bold h-12 rounded-xl border-2 focus:ring-orange-500 hover:border-accent-foreground/50 bg-white transition-colors"
                                            variant="neutral"
                                        />
                                    </div>
                                </CardContent>
                                <div className="p-5 border-t bg-muted/10 flex justify-end shrink-0">
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="font-black text-xs uppercase bg-orange-600 hover:bg-orange-700 text-white h-12 shadow-md shadow-orange-500/20 rounded-xl px-8 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Speichern
                                    </Button>
                                </div>
                            </>
                        )}
                    </SplitLayoutDetail>
                </SplitLayout>
            )}
        </div>
    );
}
