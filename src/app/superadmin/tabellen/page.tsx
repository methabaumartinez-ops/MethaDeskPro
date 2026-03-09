'use client';

import React, { useMemo } from 'react';
import { Shield, Save, RotateCcw, Check, Table as TableIcon, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { ABTEILUNGEN_CONFIG } from '@/types';
import {
    ALL_TABLES,
    ALL_PERMS,
    TABLE_LABELS,
    PERM_LABELS,
    DEFAULT_TABLE_PERMISSIONS,
    loadTablePermissions,
    saveTablePermissions,
    type TableId,
    type TablePerms,
} from '@/lib/config/tablePermissions';
import { toast } from '@/lib/toast';

const PERM_COLORS: Record<keyof TablePerms, string> = {
    read: '#38bdf8', // sky
    export: '#a78bfa', // violet
    edit: '#ff6b35', // methabau orange
    delete: '#f87171', // red
};

export default function TabellenPermissionsPage() {
    const [perms, setPerms] = React.useState<Record<string, Record<TableId, TablePerms>>>({});
    const [activeAbt, setActiveAbt] = React.useState<string>(ABTEILUNGEN_CONFIG[0].id);
    const [saved, setSaved] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');

    React.useEffect(() => { setPerms(loadTablePermissions()); }, []);

    const toggle = (tableId: TableId, perm: keyof TablePerms) => {
        setPerms(prev => {
            const currentAbt: Record<TableId, TablePerms> =
                (prev[activeAbt] ?? DEFAULT_TABLE_PERMISSIONS[activeAbt] ?? {}) as Record<TableId, TablePerms>;
            const currentTable = currentAbt[tableId] ?? { read: false, export: false, edit: false, delete: false };
            return {
                ...prev,
                [activeAbt]: {
                    ...currentAbt,
                    [tableId]: { ...currentTable, [perm]: !currentTable[perm] },
                } as Record<TableId, TablePerms>,
            };
        });
        setSaved(false);
    };

    const setAllForTable = (tableId: TableId, value: boolean) => {
        setPerms(prev => {
            const currentAbt = prev[activeAbt] ?? DEFAULT_TABLE_PERMISSIONS[activeAbt] ?? {} as Record<TableId, TablePerms>;
            return {
                ...prev,
                [activeAbt]: {
                    ...currentAbt,
                    [tableId]: { read: value, export: value, edit: value, delete: value },
                } as Record<TableId, TablePerms>,
            };
        });
        setSaved(false);
    };

    const setAllForAbt = (value: boolean) => {
        setPerms(prev => {
            const full: Record<TableId, TablePerms> = ALL_TABLES.reduce((acc, t) => {
                acc[t] = { read: value, export: value, edit: value, delete: value };
                return acc;
            }, {} as Record<TableId, TablePerms>);
            return { ...prev, [activeAbt]: full };
        });
        setSaved(false);
    };

    const resetToDefault = () => {
        setPerms(prev => ({ ...prev, [activeAbt]: DEFAULT_TABLE_PERMISSIONS[activeAbt] }));
        setSaved(false);
    };

    const handleSave = () => {
        saveTablePermissions(perms);
        setSaved(true);
        toast.success('Tabellenrechte gespeichert');
        setTimeout(() => setSaved(false), 2000);
    };

    const currentAbtPerms = perms[activeAbt] ?? DEFAULT_TABLE_PERMISSIONS[activeAbt] ?? {};
    const activeAbtConfig = ABTEILUNGEN_CONFIG.find(a => a.id === activeAbt);

    // Count enabled permissions per abteilung for the left list badge
    const countEnabled = (abtId: string) => {
        const ap = perms[abtId] ?? DEFAULT_TABLE_PERMISSIONS[abtId] ?? {};
        return ALL_TABLES.reduce((sum, t) => {
            return sum + ALL_PERMS.filter(p => ap[t]?.[p]).length;
        }, 0);
    };
    const maxPerms = ALL_TABLES.length * ALL_PERMS.length;

    const filteredTables = useMemo(() => {
        if (!searchTerm) return ALL_TABLES;
        const lowerTerm = searchTerm.toLowerCase();
        return ALL_TABLES.filter(t => TABLE_LABELS[t].toLowerCase().includes(lowerTerm));
    }, [searchTerm]);

    return (
        <div className="min-h-screen text-white pb-10">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-8 py-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                            style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)' }}>
                            <TableIcon className="h-6 w-6" style={{ color: '#ff6b35' }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight"
                                style={{ backgroundImage: 'linear-gradient(90deg,#fff 0%,#ff6b35 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Tabellen-Berechtigungen
                            </h1>
                            <p className="text-sm text-slate-400 font-medium">Welche Tabellen darf jede Abteilung lesen, edtiieren oder loeschen?</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-emerald-600 text-white' : 'text-white'}`}
                        style={!saved ? { background: '#ff6b35', boxShadow: '0 4px 14px rgba(255,107,53,0.35)' } : {}}
                    >
                        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {saved ? 'Gespeichert' : 'Speichern'}
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-8 flex gap-6">
                {/* Left: Abteilung list */}
                <div className="w-52 shrink-0 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3 px-2">Abteilungen</p>
                    {ABTEILUNGEN_CONFIG.map(abt => {
                        const count = countEnabled(abt.id);
                        const isActive = abt.id === activeAbt;
                        return (
                            <button
                                key={abt.id}
                                onClick={() => setActiveAbt(abt.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'text-white' : 'text-slate-400 bg-slate-900/20 hover:bg-slate-800 hover:text-white'}`}
                                style={isActive ? { background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)' } : {}}
                            >
                                <span className="font-semibold">{abt.name}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'text-white' : 'bg-white/10 text-slate-500'}`}
                                    style={isActive ? { background: 'rgba(255,107,53,0.35)' } : {}}>
                                    {count}/{maxPerms}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Table permission grid */}
                <div className="flex-1 space-y-4">
                    {/* Abteilung header + global actions */}
                    <div className="flex items-center justify-between">
                        <p className="font-black text-white text-lg">{activeAbtConfig?.name}</p>
                        <div className="flex items-center gap-4">
                            {/* Search Input */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-[#ff6b35] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tabellen suchen..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-9 w-64 bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50 focus:border-[#ff6b35] transition-all"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setAllForAbt(true)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 transition-all">
                                    Alle aktivieren
                                </button>
                                <button onClick={() => setAllForAbt(false)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 transition-all">
                                    Alle deaktivieren
                                </button>
                                <button onClick={resetToDefault}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 transition-all">
                                    <RotateCcw className="h-3 w-3" />
                                    Standard
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-3 px-1">
                        {ALL_PERMS.map(p => (
                            <div key={p} className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ background: PERM_COLORS[p] }} />
                                <span className="text-[10px] font-bold text-slate-400">{PERM_LABELS[p]}</span>
                            </div>
                        ))}
                    </div>

                    {/* Table permission rows */}
                    <div className="space-y-2">
                        {filteredTables.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <Search className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">Keine Tabellen gefunden für "{searchTerm}"</p>
                            </div>
                        ) : (
                            filteredTables.map(tableId => {
                                const tablePerms = currentAbtPerms[tableId] ?? { read: false, export: false, edit: false, delete: false };
                                const allEnabled = ALL_PERMS.every(p => tablePerms[p]);
                                const noneEnabled = ALL_PERMS.every(p => !tablePerms[p]);

                                return (
                                    <div key={tableId} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                                        {/* Table header row */}
                                        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <TableIcon className="h-4 w-4 text-slate-500" />
                                                <span className="font-bold text-white text-sm">{TABLE_LABELS[tableId]}</span>
                                            </div>
                                            {/* Quick toggle: all on/off for this table */}
                                            <button
                                                onClick={() => setAllForTable(tableId, !allEnabled)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold transition-colors"
                                                style={{ color: allEnabled ? '#ff6b35' : '#64748b' }}
                                            >
                                                {allEnabled
                                                    ? <ToggleRight className="h-4 w-4" />
                                                    : <ToggleLeft className="h-4 w-4" />
                                                }
                                                {allEnabled ? 'Alle an' : noneEnabled ? 'Alle aus' : 'Teils'}
                                            </button>
                                        </div>

                                        {/* Permission toggles */}
                                        <div className="grid grid-cols-4 divide-x divide-slate-800 bg-slate-900/50">
                                            {ALL_PERMS.map(perm => {
                                                const enabled = tablePerms[perm];
                                                return (
                                                    <button
                                                        key={perm}
                                                        onClick={() => toggle(tableId, perm)}
                                                        className="flex flex-col items-center gap-2 px-4 py-3.5 hover:bg-slate-800 transition-colors"
                                                    >
                                                        {/* Color dot + toggle pill */}
                                                        <div className={`relative h-5 w-9 rounded-full transition-all ${!enabled ? 'bg-slate-700' : ''}`}
                                                            style={enabled ? { background: PERM_COLORS[perm] } : {}}>
                                                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold transition-colors ${enabled ? 'text-white' : 'text-slate-600'}`}>
                                                            {PERM_LABELS[perm]}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <p className="text-xs text-slate-500 text-center pt-2">
                        Superadmin und Admin haben immer vollen Zugriff auf alle Tabellen.
                    </p>
                </div>
            </div>
        </div>
    );
}
