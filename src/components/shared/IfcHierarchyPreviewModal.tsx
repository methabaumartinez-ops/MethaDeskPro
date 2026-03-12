'use client';

import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Package, Layers, BoxIcon, Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IFCHierarchyData {
    teilsystem: {
        name?: string;
        teilsystemNummer?: string;
        gewicht?: number;
        teileart?: string;
    };
    positionen: IFCPosition[];
    unterpositionen: IFCUnterposition[];
}

export interface IFCPosition {
    signature: string;
    name?: string;
    posNummer?: string;
    menge?: number;
    einheit?: string;
    gewicht?: number;
    teileart?: string;
    [key: string]: any;
}

export interface IFCUnterposition {
    signature: string;
    name?: string;
    posNummer?: string;
    menge?: number;
    einheit?: string;
    materialProp?: string;
    teileart?: string;
    gewichtKg?: number;
    dimensions?: Record<string, number>;
    [key: string]: any;
}

interface Props {
    data: IFCHierarchyData;
    onConfirm: (result: { positionen: IFCPosition[]; unterpositionen: IFCUnterposition[]; tsInfo?: any }) => void;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEILEART_COLORS: Record<string, string> = {
    Baugruppe: 'bg-blue-50 text-blue-700 border-blue-200',
    Bleche:    'bg-orange-50 text-orange-700 border-orange-200',
    Schraube:  'bg-purple-50 text-purple-700 border-purple-200',
    Profil:    'bg-green-50 text-green-700 border-green-200',
};

function teileartBadge(teileart?: string) {
    if (!teileart) return null;
    const cls = TEILEART_COLORS[teileart] || 'bg-muted text-muted-foreground border-border';
    return (
        <Badge variant="outline" className={cn('text-[9px] font-bold h-4 px-1.5', cls)}>
            {teileart}
        </Badge>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IfcHierarchyPreviewModal({ data, onConfirm, onClose }: Props) {
    // Selected set: stores signatures of DESELECTED items (everything selected by default)
    const [deselected, setDeselected] = useState<Set<string>>(new Set());
    const [expandedPos, setExpandedPos] = useState<Set<string>>(new Set(data.positionen.map(p => p.signature)));
    const [search, setSearch] = useState('');

    // Group unterpositionen by parent signature prefix (first segment of signature)
    const childrenByParent = useMemo(() => {
        const map = new Map<string, IFCUnterposition[]>();
        for (const unt of data.unterpositionen) {
            // Signature format: "parentSig|childSig"
            const parentSig = unt.signature.split('|')[0];
            if (!map.has(parentSig)) map.set(parentSig, []);
            map.get(parentSig)!.push(unt);
        }
        return map;
    }, [data.unterpositionen]);

    const filteredPositionen = useMemo(() =>
        data.positionen.filter(p =>
            !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.posNummer?.includes(search)
        ), [data.positionen, search]);

    // ─── Selection helpers ──────────────────────────────────────────────────

    const isSelected = (sig: string) => !deselected.has(sig);

    const togglePos = (sig: string) => {
        const children = childrenByParent.get(sig) || [];
        const nowSelected = isSelected(sig);
        const next = new Set(deselected);
        if (nowSelected) {
            // Deselect pos and all its children
            next.add(sig);
            children.forEach(c => next.add(c.signature));
        } else {
            // Select pos and all its children
            next.delete(sig);
            children.forEach(c => next.delete(c.signature));
        }
        setDeselected(next);
    };

    const toggleUnt = (sig: string, parentSig: string) => {
        if (!isSelected(parentSig)) return; // Parent must be selected
        const next = new Set(deselected);
        if (isSelected(sig)) next.add(sig); else next.delete(sig);
        setDeselected(next);
    };

    const selectAll = () => setDeselected(new Set());
    const deselectAll = () => {
        const all = new Set<string>();
        data.positionen.forEach(p => all.add(p.signature));
        data.unterpositionen.forEach(u => all.add(u.signature));
        setDeselected(all);
    };

    // ─── Confirm handler ────────────────────────────────────────────────────

    const handleConfirm = () => {
        const selectedPos = data.positionen.filter(p => isSelected(p.signature));
        const selectedUnt = data.unterpositionen.filter(u => isSelected(u.signature));
        onConfirm({
            positionen: selectedPos,
            unterpositionen: selectedUnt,
            tsInfo: {
                nummer: data.teilsystem.teilsystemNummer,
                name: data.teilsystem.name,
            }
        });
    };

    const selectedPosCount = data.positionen.filter(p => isSelected(p.signature)).length;
    const selectedUntCount = data.unterpositionen.filter(u => isSelected(u.signature)).length;

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-none shadow-2xl border-2 border-orange-500 w-full max-w-3xl flex flex-col max-h-[90vh]">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-orange-500 bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-black uppercase tracking-widest">
                            IFC Import — Auswahl
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase tracking-wider">
                            Waehlen Sie, was in die Datenbank importiert werden soll
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-black hover:bg-orange-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ── TS Info banner ── */}
                <div className="px-6 py-3 bg-orange-50 border-b border-orange-200 shrink-0 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-orange-600" />
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">Teilsystem</span>
                    </div>
                    {data.teilsystem.teilsystemNummer && (
                        <span className="text-xs font-black text-black border border-orange-400 px-2 py-0.5">
                            Nr. {data.teilsystem.teilsystemNummer}
                        </span>
                    )}
                    {data.teilsystem.name && (
                        <span className="text-xs font-bold text-gray-700">{data.teilsystem.name}</span>
                    )}
                    {data.teilsystem.gewicht != null && (
                        <span className="text-[10px] font-bold text-gray-500">
                            {data.teilsystem.gewicht} kg
                        </span>
                    )}
                    {teileartBadge(data.teilsystem.teileart)}
                </div>

                {/* ── Toolbar ── */}
                <div className="px-6 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0 flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Suchen..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="text-xs font-bold border border-gray-300 rounded px-2 py-1 w-40 focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-[10px] text-gray-500 font-bold flex-1">
                        <span className="text-orange-600">{selectedPosCount}</span> Pos. /&nbsp;
                        <span className="text-orange-600">{selectedUntCount}</span> Teile ausgewaehlt
                    </span>
                    <button onClick={selectAll} className="text-[10px] font-black text-orange-600 hover:underline uppercase">Alle</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={deselectAll} className="text-[10px] font-black text-gray-500 hover:underline uppercase">Keine</button>
                </div>

                {/* ── Tree ── */}
                <div className="flex-1 overflow-y-auto">
                    {filteredPositionen.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="text-xs font-bold">Keine Positionen gefunden</p>
                        </div>
                    )}

                    {filteredPositionen.map(pos => {
                        const children = childrenByParent.get(pos.signature) || [];
                        const isExpanded = expandedPos.has(pos.signature);
                        const posSelected = isSelected(pos.signature);
                        const selectedChildCount = children.filter(c => isSelected(c.signature)).length;

                        return (
                            <div key={pos.signature} className={cn(
                                'border-b border-gray-100 transition-colors',
                                !posSelected && 'opacity-40'
                            )}>
                                {/* ── POS row ── */}
                                <div className={cn(
                                    'flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 transition-colors',
                                    posSelected && 'bg-white'
                                )}>
                                    {/* Expand toggle */}
                                    <button
                                        onClick={() => {
                                            const next = new Set(expandedPos);
                                            isExpanded ? next.delete(pos.signature) : next.add(pos.signature);
                                            setExpandedPos(next);
                                        }}
                                        className="text-gray-400 hover:text-orange-600 shrink-0 w-4"
                                        disabled={children.length === 0}
                                    >
                                        {children.length > 0
                                            ? (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
                                            : <span className="w-3.5" />
                                        }
                                    </button>

                                    {/* POS checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={posSelected}
                                        onChange={() => togglePos(pos.signature)}
                                        className="h-4 w-4 accent-orange-500 cursor-pointer shrink-0"
                                    />

                                    {/* POS icon */}
                                    <Package className="h-3.5 w-3.5 text-orange-500 shrink-0" />

                                    {/* POS data */}
                                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-black truncate">
                                            {pos.name || 'Unbenannt'}
                                        </span>
                                        {pos.posNummer && (
                                            <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1 rounded shrink-0">
                                                Pos. {pos.posNummer}
                                            </span>
                                        )}
                                        {teileartBadge(pos.teileart)}
                                    </div>

                                    {/* POS meta right */}
                                    <div className="flex items-center gap-3 shrink-0 text-[10px] font-bold text-gray-500">
                                        {pos.gewicht != null && <span>{pos.gewicht} kg</span>}
                                        <span className="text-orange-600">{pos.menge}×</span>
                                        {children.length > 0 && (
                                            <span className="text-[9px] text-gray-400">
                                                ({selectedChildCount}/{children.length} Teile)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* ── UNTPOS rows ── */}
                                {isExpanded && children.map(unt => {
                                    const untSelected = isSelected(unt.signature) && posSelected;
                                    return (
                                        <div
                                            key={unt.signature}
                                            className={cn(
                                                'flex items-center gap-3 pl-12 pr-4 py-1.5 border-t border-gray-50 transition-colors hover:bg-orange-50/30',
                                                !untSelected && 'opacity-40'
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected(unt.signature) && posSelected}
                                                disabled={!posSelected}
                                                onChange={() => toggleUnt(unt.signature, pos.signature)}
                                                className="h-3.5 w-3.5 accent-orange-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                            />
                                            <BoxIcon className="h-3 w-3 text-gray-400 shrink-0" />

                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                <span className={cn('text-[11px] font-bold truncate', untSelected ? 'text-gray-800' : 'text-gray-400')}>
                                                    {unt.name || 'Unbekannt'}
                                                </span>
                                                {unt.posNummer && (
                                                    <span className="text-[9px] text-gray-400 border border-gray-200 px-1 rounded shrink-0">
                                                        {unt.posNummer}
                                                    </span>
                                                )}
                                                {unt.materialProp && (
                                                    <span className="text-[9px] font-bold text-gray-500 shrink-0">{unt.materialProp}</span>
                                                )}
                                                {teileartBadge(unt.teileart)}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 text-[9px] font-bold text-gray-400">
                                                {unt.dimensions?.laenge != null && (
                                                    <span>{unt.dimensions.laenge}×{unt.dimensions.breite}×{unt.dimensions.hoehe || unt.dimensions.blechdicke}</span>
                                                )}
                                                {unt.gewichtKg != null && <span>{unt.gewichtKg} kg</span>}
                                                <span className="text-orange-500">{unt.menge}×</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t-2 border-orange-500 flex items-center justify-between bg-white shrink-0">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {selectedPosCount} Positionen &nbsp;·&nbsp; {selectedUntCount} Teile werden importiert
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-2 border-black text-black font-bold rounded-none h-10 px-6 uppercase text-[11px] hover:bg-black hover:text-white"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedPosCount === 0}
                            className="border-2 border-orange-500 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-none h-10 px-8 uppercase text-[11px] shadow-none disabled:opacity-50"
                        >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Uebernehmen
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
