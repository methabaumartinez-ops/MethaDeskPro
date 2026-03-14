'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { SubPositionService } from '@/lib/services/subPositionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Unterposition, ItemStatus, Lagerort, ABTEILUNGEN_CONFIG } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { getAllowedStatuses } from '@/lib/workflow/workflowEngine';
import { cn } from '@/lib/utils';
import { Plus, Save, Trash2, Loader2, Package, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    positionId: string;
    teilsystemId: string;
    projektId: string;
    readonly?: boolean;
}

interface EditableUPos extends Unterposition {
    _dirty?: boolean;
    _new?: boolean;
    _deleted?: boolean;
}

const STATUS_OPTIONS = POS_ALLOWED_STATUSES.map(st => ({
    value: STATUS_UI_CONFIG[st].value,
    label: STATUS_UI_CONFIG[st].label,
}));

/** Returns status options filtered by department workflow rules */
function getStatusOptionsForDept(abteilung: string | undefined): { value: string; label: string }[] {
    const allowed = getAllowedStatuses(abteilung);
    return allowed
        .filter(st => STATUS_UI_CONFIG[st])
        .map(st => ({ value: STATUS_UI_CONFIG[st].value, label: STATUS_UI_CONFIG[st].label }));
}

export function InlineUnterpositionenEditor({ positionId, teilsystemId, projektId, readonly }: Props) {
    const [unterpositionen, setUnterpositionen] = useState<EditableUPos[]>([]);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [uposData, lagerortData] = await Promise.all([
                SubPositionService.getUnterpositionen(positionId),
                LagerortService.getLagerorte(projektId).catch(() => [] as Lagerort[]),
            ]);
            setUnterpositionen(uposData as EditableUPos[]);
            setLagerorte(lagerortData);
        } catch (e) {
            console.error('Failed to load unterpositionen', e);
        } finally {
            setLoading(false);
        }
    }, [positionId, projektId]);

    useEffect(() => { load(); }, [load]);

    const updateUPos = (id: string, field: keyof Unterposition, value: any) => {
        setUnterpositionen(prev => prev.map(u =>
            u.id === id ? { ...u, [field]: value, _dirty: true } : u
        ));
    };

    const addUnterposition = () => {
        const tempId = `new-upos-${Date.now()}`;
        const existing = unterpositionen.filter(u => !u._deleted);
        const nextNr = String(existing.length + 1).padStart(3, '0');
        setUnterpositionen(prev => [...prev, {
            id: tempId, positionId, teilsystemId, projektId,
            name: '', menge: 1, einheit: 'Stk', posNummer: nextNr,
            status: 'offen' as ItemStatus,
            abteilung: 'AVOR',
            _new: true, _dirty: true,
        } as EditableUPos]);
    };

    const markDeleted = (id: string) => {
        setUnterpositionen(prev => prev.map(u =>
            u.id === id ? { ...u, _deleted: !u._deleted } : u
        ));
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            let created = 0, updated = 0, deleted = 0;

            for (const u of unterpositionen) {
                if (u._deleted && !u._new) {
                    await SubPositionService.deleteUnterposition(u.id);
                    deleted++;
                } else if (u._new && !u._deleted && u.name) {
                    const { _dirty, _new, _deleted, ...data } = u;
                    await SubPositionService.createUnterposition(data);
                    created++;
                } else if (u._dirty && !u._new && !u._deleted) {
                    const { _dirty, _new, _deleted, ...data } = u;
                    await SubPositionService.updateUnterposition(u.id, data);
                    updated++;
                }
            }

            toast.success(`Gespeichert: ${created} neu, ${updated} geaendert, ${deleted} geloescht`);
            await load();
        } catch (e: any) {
            console.error('Save failed', e);
            toast.error(`Fehler beim Speichern: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const hasDirty = unterpositionen.some(u => u._dirty || u._deleted);

    if (loading) return (
        <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );

    const inputBase = "h-8 px-2 text-xs border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors font-medium text-foreground";
    const selectBase = "h-8 px-1 text-xs border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold";

    return (
        <div className="flex flex-col gap-1.5 min-h-0">
            {/* Action bar */}
            <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-bold text-muted-foreground">
                    {unterpositionen.filter(u => !u._deleted).length} Unterposition{unterpositionen.filter(u => !u._deleted).length !== 1 ? 'en' : ''}
                </span>
                {!readonly && (
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" className="h-8 text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white" onClick={addUnterposition}>
                            <Plus className="h-3.5 w-3.5" /> Teil hinzufuegen
                        </Button>
                        {hasDirty && (
                            <Button type="button" size="sm" className="h-8 text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white" onClick={saveAll} disabled={saving}>
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                {saving ? 'Speichern...' : 'Speichern'}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            {unterpositionen.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground italic border-2 border-dashed border-border rounded-xl bg-muted/20">
                    Keine Unterpositionen vorhanden. Klicken Sie auf &quot;+ Teil hinzufuegen&quot; um eine zu erstellen.
                </div>
            ) : (
                <div className="border-2 border-border rounded-xl overflow-hidden flex flex-col min-h-0">
                    {/* Column Headers */}
                    <div className="grid grid-cols-[60px_1fr_70px_60px_110px_100px_110px_36px] gap-1 px-3 py-1.5 bg-muted/60 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground flex-shrink-0">
                        <div>Nr</div>
                        <div>Bezeichnung</div>
                        <div>Menge</div>
                        <div>Einh.</div>
                        <div>Abteilung</div>
                        <div>Status</div>
                        <div className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />Lagerort</div>
                        <div></div>
                    </div>

                    {/* Scrollable rows */}
                    <div className="overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {unterpositionen.map(upos => (
                            <div key={upos.id} className={cn(
                                "grid grid-cols-[60px_1fr_70px_60px_110px_100px_110px_36px] gap-1 px-3 py-1.5 items-center border-b border-border/50 transition-colors",
                                upos._deleted ? "bg-red-50 opacity-50" : "hover:bg-muted/20",
                                upos._new ? "bg-green-50/50" : ""
                            )}>
                                {readonly ? (
                                    <>
                                        <span className="text-xs font-black text-primary">{upos.posNummer || '—'}</span>
                                        <span className="text-xs font-bold text-foreground truncate">{upos.name}</span>
                                        <span className="text-xs font-bold text-muted-foreground">{upos.menge} {upos.einheit}</span>
                                        <span className="text-xs font-medium text-muted-foreground">{upos.einheit}</span>
                                        <span className={cn("text-[10px] font-bold px-1 rounded", getAbteilungColorClasses(upos.abteilung))}>{upos.abteilung || 'AVOR'}</span>
                                        <span className={cn("text-[10px] font-bold px-1 rounded", getStatusColorClasses(upos.status))}>{STATUS_UI_CONFIG[upos.status as keyof typeof STATUS_UI_CONFIG]?.label || upos.status}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground truncate">
                                            {lagerorte.find(l => l.id === upos.lagerortId)?.bezeichnung || '—'}
                                        </span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <input className={inputBase} value={upos.posNummer || ''} onChange={e => updateUPos(upos.id, 'posNummer', e.target.value)} />
                                        <input className={cn(inputBase, "font-bold")} value={upos.name} onChange={e => updateUPos(upos.id, 'name', e.target.value)} placeholder="Bezeichnung..." />
                                        <input className={inputBase} type="number" step="0.01" value={upos.menge} onChange={e => updateUPos(upos.id, 'menge', Number(e.target.value))} />
                                        <input className={inputBase} value={upos.einheit} onChange={e => updateUPos(upos.id, 'einheit', e.target.value)} />
                                        <select
                                            className={cn(selectBase, "text-[10px]", getAbteilungColorClasses(upos.abteilung))}
                                            value={upos.abteilung || 'AVOR'}
                                            onChange={e => updateUPos(upos.id, 'abteilung', e.target.value || undefined)}
                                        >
                                            {ABTEILUNGEN_CONFIG.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                        </select>
                                        <select className={cn(selectBase, getStatusColorClasses(upos.status))} value={upos.status} onChange={e => updateUPos(upos.id, 'status', e.target.value)}>
                                            {(upos.abteilung ? getStatusOptionsForDept(upos.abteilung) : STATUS_OPTIONS).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        <select
                                            className={cn(selectBase, "h-8 text-[10px]", upos.lagerortId ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-input bg-background text-muted-foreground')}
                                            value={upos.lagerortId || ''}
                                            onChange={e => updateUPos(upos.id, 'lagerortId', e.target.value || undefined)}
                                        >
                                            <option value="">— Kein</option>
                                            {lagerorte.map(l => <option key={l.id} value={l.id}>{l.bezeichnung}</option>)}
                                        </select>
                                        <button type="button" onClick={() => markDeleted(upos.id)} className={cn("h-6 w-6 flex items-center justify-center rounded transition-colors", upos._deleted ? "text-green-600 hover:bg-green-50" : "text-red-400 hover:text-red-600 hover:bg-red-50")}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
