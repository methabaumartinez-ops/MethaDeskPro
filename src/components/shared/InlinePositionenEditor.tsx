'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Position, Unterposition, ItemStatus, Lagerort, ABTEILUNGEN_CONFIG } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Save, Trash2, Loader2, Package, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    teilsystemId: string;
    projektId: string;
}

interface EditablePos extends Position {
    _dirty?: boolean;
    _new?: boolean;
    _deleted?: boolean;
    _expanded?: boolean;
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

export function InlinePositionenEditor({ teilsystemId, projektId }: Props) {
    const [positionen, setPositionen] = useState<EditablePos[]>([]);
    const [unterpositionen, setUnterpositionen] = useState<EditableUPos[]>([]);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [posData, lagerortData] = await Promise.all([
                PositionService.getPositionenByTeilsystem(teilsystemId),
                LagerortService.getLagerorte(projektId).catch(() => [] as Lagerort[]),
            ]);
            const allUPos: Unterposition[] = [];
            for (const p of posData) {
                const upos = await SubPositionService.getUnterpositionen(p.id);
                allUPos.push(...upos);
            }
            setPositionen(posData.map(p => ({ ...p, _expanded: false })));
            setUnterpositionen(allUPos as EditableUPos[]);
            setLagerorte(lagerortData);
        } catch (e) {
            console.error('Failed to load positions', e);
        } finally {
            setLoading(false);
        }
    }, [teilsystemId, projektId]);

    useEffect(() => { load(); }, [load]);

    const updatePos = (id: string, field: keyof Position, value: any) => {
        setPositionen(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value, _dirty: true } : p
        ));
    };

    const updateUPos = (id: string, field: keyof Unterposition, value: any) => {
        setUnterpositionen(prev => prev.map(u =>
            u.id === id ? { ...u, [field]: value, _dirty: true } : u
        ));
    };

    const toggleExpand = (id: string) => {
        setPositionen(prev => prev.map(p =>
            p.id === id ? { ...p, _expanded: !p._expanded } : p
        ));
    };

    const addPosition = () => {
        const tempId = `new-pos-${Date.now()}`;
        const nextNr = String(positionen.length + 1).padStart(3, '0');
        setPositionen(prev => [...prev, {
            id: tempId, teilsystemId, projektId, name: '', menge: 1, einheit: 'Stk',
            status: 'offen' as ItemStatus, posNummer: nextNr,
            _new: true, _dirty: true, _expanded: false,
        } as EditablePos]);
    };

    const addUnterposition = (positionId: string) => {
        const tempId = `new-upos-${Date.now()}`;
        const existing = unterpositionen.filter(u => u.positionId === positionId);
        const nextNr = String(existing.length + 1).padStart(3, '0');
        setUnterpositionen(prev => [...prev, {
            id: tempId, positionId, teilsystemId, projektId,
            name: '', menge: 1, einheit: 'Stk', posNummer: nextNr,
            status: 'offen' as ItemStatus,
            _new: true, _dirty: true,
        } as EditableUPos]);
        // Auto-expand parent
        setPositionen(prev => prev.map(p =>
            p.id === positionId ? { ...p, _expanded: true } : p
        ));
    };

    const markPosDeleted = (id: string) => {
        setPositionen(prev => prev.map(p =>
            p.id === id ? { ...p, _deleted: !p._deleted } : p
        ));
    };

    const markUPosDeleted = (id: string) => {
        setUnterpositionen(prev => prev.map(u =>
            u.id === id ? { ...u, _deleted: !u._deleted } : u
        ));
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            let created = 0, updated = 0, deleted = 0;

            // Process positions
            for (const p of positionen) {
                if (p._deleted && !p._new) {
                    await PositionService.deletePosition(p.id);
                    deleted++;
                } else if (p._new && !p._deleted && p.name) {
                    const { _dirty, _new, _deleted, _expanded, ...data } = p;
                    const result = await PositionService.createPosition(data);
                    // Update unterposition refs that point to temp ID
                    setUnterpositionen(prev => prev.map(u =>
                        u.positionId === p.id ? { ...u, positionId: result.id } : u
                    ));
                    created++;
                } else if (p._dirty && !p._new && !p._deleted) {
                    const { _dirty, _new, _deleted, _expanded, ...data } = p;
                    await PositionService.updatePosition(p.id, data);
                    updated++;
                }
            }

            // Process unterpositionen
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
            await load(); // Reload clean data
        } catch (e: any) {
            console.error('Save failed', e);
            toast.error(`Fehler beim Speichern: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const hasDirty = positionen.some(p => p._dirty || p._deleted) || unterpositionen.some(u => u._dirty || u._deleted);

    if (loading) return (
        <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    );

    const inputBase = "h-8 px-2 text-xs border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-colors font-medium text-foreground";
    const selectBase = "h-8 px-1 text-xs border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-bold";

    return (
        <div className="flex flex-col gap-3 min-h-0">
            {/* Action bar — always visible, never scrolls */}
            <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-bold text-muted-foreground">
                    {positionen.filter(p => !p._deleted).length} Position{positionen.filter(p => !p._deleted).length !== 1 ? 'en' : ''}
                </span>
                <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5" onClick={addPosition}>
                        <Plus className="h-3.5 w-3.5" /> Position
                    </Button>
                    {hasDirty && (
                        <Button type="button" size="sm" className="h-8 text-xs font-bold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white" onClick={saveAll} disabled={saving}>
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {saving ? 'Speichern...' : 'Positionen speichern'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Table — scrollable body */}
            {positionen.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground italic border-2 border-dashed border-border rounded-xl bg-muted/20">
                    Keine Positionen vorhanden. Klicken Sie auf &quot;+ Position&quot; um eine zu erstellen.
                </div>
            ) : (
                <div className="border-2 border-border rounded-xl overflow-hidden flex flex-col min-h-0">
                    {/* Column Headers — sticky inside the scroll container */}
                    <div className="grid grid-cols-[32px_60px_1fr_70px_60px_110px_100px_110px_36px] gap-1 px-3 py-2 bg-muted/60 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground flex-shrink-0">
                        <div></div>
                        <div>Nr</div>
                        <div>Bezeichnung</div>
                        <div>Menge</div>
                        <div>Einh.</div>
                        <div>Abteilung</div>
                        <div>Status</div>
                        <div className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />Lagerort</div>
                        <div></div>
                    </div>

                    {/* Scrollable rows area */}
                    <div className="overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {positionen.map(pos => {
                            const childUPos = unterpositionen.filter(u => u.positionId === pos.id && !u._deleted);

                            return (
                                <React.Fragment key={pos.id}>
                                    {/* Position Row */}
                                    <div className={cn(
                                        "grid grid-cols-[32px_60px_1fr_70px_60px_110px_100px_110px_36px] gap-1 px-3 py-1.5 items-center border-b border-border/50 transition-colors",
                                        pos._deleted ? "bg-red-50 opacity-50" : "hover:bg-muted/20",
                                        pos._new ? "bg-green-50/50" : ""
                                    )}>
                                        <button type="button" onClick={() => toggleExpand(pos.id)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
                                            {pos._expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        <input className={inputBase} value={pos.posNummer || ''} onChange={e => updatePos(pos.id, 'posNummer', e.target.value)} />
                                        <input className={cn(inputBase, "font-bold")} value={pos.name} onChange={e => updatePos(pos.id, 'name', e.target.value)} placeholder="Bezeichnung..." />
                                        <input className={inputBase} type="number" step="0.01" value={pos.menge} onChange={e => updatePos(pos.id, 'menge', Number(e.target.value))} />
                                        <input className={inputBase} value={pos.einheit} onChange={e => updatePos(pos.id, 'einheit', e.target.value)} />
                                        <select
                                            className={cn(selectBase, "text-[10px]", getAbteilungColorClasses(pos.abteilung))}
                                            value={pos.abteilung || ''}
                                            onChange={e => updatePos(pos.id, 'abteilung', e.target.value || undefined)}
                                        >
                                            <option value="">— Abt.</option>
                                            {ABTEILUNGEN_CONFIG.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                        </select>
                                        <select className={cn(selectBase, getStatusColorClasses(pos.status))} value={pos.status} onChange={e => updatePos(pos.id, 'status', e.target.value)}>
                                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                        {/* Lagerort select */}
                                        <select
                                            className={cn(selectBase, "h-8 text-[10px]", pos.lagerortId ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-input bg-background text-muted-foreground')}
                                            value={pos.lagerortId || ''}
                                            onChange={e => updatePos(pos.id, 'lagerortId', e.target.value || undefined)}
                                        >
                                            <option value="">— Kein</option>
                                            {lagerorte.map(l => <option key={l.id} value={l.id}>{l.bezeichnung}</option>)}
                                        </select>
                                        <button type="button" onClick={() => markPosDeleted(pos.id)} className={cn("h-6 w-6 flex items-center justify-center rounded transition-colors", pos._deleted ? "text-green-600 hover:bg-green-50" : "text-red-400 hover:text-red-600 hover:bg-red-50")}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Expanded Unterpositionen */}
                                    {pos._expanded && (
                                        <div className="bg-muted/10 border-b border-border">
                                            {childUPos.length === 0 ? (
                                                <div className="pl-12 py-2 text-[10px] text-muted-foreground italic">
                                                    Keine Teile
                                                </div>
                                            ) : childUPos.map(upos => (
                                                <div key={upos.id} className={cn(
                                                    "grid grid-cols-[32px_60px_1fr_70px_60px_110px_100px_110px_36px] gap-1 px-3 py-1 items-center border-b border-border/30",
                                                    upos._deleted ? "bg-red-50 opacity-50" : "",
                                                    upos._new ? "bg-green-50/30" : ""
                                                )}>
                                                    <div className="flex items-center justify-center">
                                                        <Package className="h-3 w-3 text-muted-foreground/40" />
                                                    </div>
                                                    <input className={cn(inputBase, "h-7 text-[10px]")} value={upos.posNummer || ''} onChange={e => updateUPos(upos.id, 'posNummer', e.target.value)} />
                                                    <input className={cn(inputBase, "h-7 text-[10px]")} value={upos.name} onChange={e => updateUPos(upos.id, 'name', e.target.value)} placeholder="Teil-Bezeichnung..." />
                                                    <input className={cn(inputBase, "h-7 text-[10px]")} type="number" step="0.01" value={upos.menge} onChange={e => updateUPos(upos.id, 'menge', Number(e.target.value))} />
                                                    <input className={cn(inputBase, "h-7 text-[10px]")} value={upos.einheit} onChange={e => updateUPos(upos.id, 'einheit', e.target.value)} />
                                                    <select
                                                        className={cn(selectBase, "h-7 text-[10px]", getAbteilungColorClasses(upos.abteilung))}
                                                        value={upos.abteilung || ''}
                                                        onChange={e => updateUPos(upos.id, 'abteilung', e.target.value || undefined)}
                                                    >
                                                        <option value="">— Abt.</option>
                                                        {ABTEILUNGEN_CONFIG.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                                    </select>
                                                    <select className={cn(selectBase, "h-7 text-[10px]", getStatusColorClasses(upos.status))} value={upos.status} onChange={e => updateUPos(upos.id, 'status', e.target.value)}>
                                                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                    {/* Lagerort select */}
                                                    <select
                                                        className={cn(selectBase, "h-7 text-[10px]", upos.lagerortId ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-input bg-background text-muted-foreground')}
                                                        value={upos.lagerortId || ''}
                                                        onChange={e => updateUPos(upos.id, 'lagerortId', e.target.value || undefined)}
                                                    >
                                                        <option value="">— Kein</option>
                                                        {lagerorte.map(l => <option key={l.id} value={l.id}>{l.bezeichnung}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => markUPosDeleted(upos.id)} className={cn("h-5 w-5 flex items-center justify-center rounded transition-colors", upos._deleted ? "text-green-600 hover:bg-green-50" : "text-red-400 hover:text-red-600 hover:bg-red-50")}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="pl-10 py-1.5">
                                                <button type="button" onClick={() => addUnterposition(pos.id)} className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                                    <Plus className="h-3 w-3" /> Teil hinzufuegen
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
