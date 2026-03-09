'use client';

import React from 'react';
import { Shield, Save, RotateCcw, Check } from 'lucide-react';
import { ABTEILUNGEN_CONFIG } from '@/types';
import {
    ALL_PAGES,
    PAGE_LABELS,
    DEFAULT_ABT_PERMISSIONS,
    loadAbtPermissions,
    saveAbtPermissions,
    type PageKey,
} from '@/lib/config/abteilungPagePermissions';
import { toast } from '@/lib/toast';

// Page groups for better UI organization
const PAGE_GROUPS: { label: string; pages: PageKey[] }[] = [
    { label: 'Dashboard', pages: ['dashboard-builder', 'my-dashboard'] },
    { label: 'Projekte', pages: ['bauleitung', 'analyse', 'produktion', 'planung', 'avor', 'einkauf', 'schlosserei', 'blech', 'kosten', 'tabellen'] },
    { label: 'Ausführung', pages: ['ausfuehrung'] },
    { label: 'Werkhof', pages: ['werkhof-bestellungen', 'lagerort', 'qr-scan'] },
    { label: 'Sonstiges', pages: ['fuhrpark'] },
];

export default function ZugriffPage() {
    const [perms, setPerms] = React.useState<Record<string, PageKey[]>>({});
    const [activeAbt, setActiveAbt] = React.useState<string>(ABTEILUNGEN_CONFIG[0].id);
    const [saved, setSaved] = React.useState(false);

    React.useEffect(() => {
        setPerms(loadAbtPermissions());
    }, []);

    const toggle = (page: PageKey) => {
        setPerms(prev => {
            const current = prev[activeAbt] ?? DEFAULT_ABT_PERMISSIONS[activeAbt] ?? [];
            const updated = current.includes(page)
                ? current.filter(p => p !== page)
                : [...current, page];
            return { ...prev, [activeAbt]: updated };
        });
        setSaved(false);
    };

    const enableAll = () => {
        setPerms(prev => ({ ...prev, [activeAbt]: [...ALL_PAGES] }));
        setSaved(false);
    };

    const disableAll = () => {
        setPerms(prev => ({ ...prev, [activeAbt]: [] }));
        setSaved(false);
    };

    const resetToDefault = () => {
        setPerms(prev => ({ ...prev, [activeAbt]: DEFAULT_ABT_PERMISSIONS[activeAbt] ?? [] }));
        setSaved(false);
    };

    const handleSave = () => {
        saveAbtPermissions(perms);
        setSaved(true);
        toast.success('Zugriffsrechte gespeichert');
        setTimeout(() => setSaved(false), 2000);
    };

    const currentPerms = perms[activeAbt] ?? DEFAULT_ABT_PERMISSIONS[activeAbt] ?? [];
    const activeAbtConfig = ABTEILUNGEN_CONFIG.find(a => a.id === activeAbt);

    return (
        <div className="min-h-screen text-white pb-10">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-8 py-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg"
                            style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)' }}>
                            <Shield className="h-6 w-6" style={{ color: '#ff6b35' }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight"
                                style={{ backgroundImage: 'linear-gradient(90deg,#fff 0%,#ff6b35 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Seitenzugriff nach Abteilung
                            </h1>
                            <p className="text-sm text-slate-400 font-medium">Welche Seiten sieht jede Abteilung im Menü?</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-emerald-600 text-white' : 'text-white'
                            }`}
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 px-2">Abteilungen</p>
                    {ABTEILUNGEN_CONFIG.map(abt => {
                        const abtPerms = perms[abt.id] ?? DEFAULT_ABT_PERMISSIONS[abt.id] ?? [];
                        const isActive = abt.id === activeAbt;
                        return (
                            <button
                                key={abt.id}
                                onClick={() => setActiveAbt(abt.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? 'text-white' : 'text-slate-400 bg-slate-900/20 hover:bg-slate-800 hover:text-white'
                                    }`}
                                style={isActive ? { background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)' } : {}}
                            >
                                <span className="font-semibold">{abt.name}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isActive ? 'text-white' : 'bg-white/10 text-slate-500'
                                    }`}
                                    style={isActive ? { background: 'rgba(255,107,53,0.35)', color: '#fff' } : {}}>
                                    {abtPerms.length}/{ALL_PAGES.length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Page toggles */}
                <div className="flex-1 space-y-5">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <p className="font-black text-white text-lg">{activeAbtConfig?.name}</p>
                        <div className="flex gap-2">
                            <button onClick={enableAll}
                                className="px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 transition-all">
                                Alle aktivieren
                            </button>
                            <button onClick={disableAll}
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

                    {/* Groups */}
                    {PAGE_GROUPS.map(group => (
                        <div key={group.label} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                            <div className="bg-slate-900 px-5 py-3 border-b border-slate-800">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{group.label}</p>
                            </div>
                            <div className="bg-slate-900/50 divide-y divide-slate-800">
                                {group.pages.map(page => {
                                    const enabled = currentPerms.includes(page);
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => toggle(page)}
                                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800 transition-colors"
                                        >
                                            <span className={`text-sm font-semibold ${enabled ? 'text-white' : 'text-slate-500'}`}>
                                                {PAGE_LABELS[page]}
                                            </span>
                                            <div className={`relative h-5 w-9 rounded-full transition-all ${enabled ? '' : 'bg-slate-700'
                                                }`}
                                                style={enabled ? { background: '#ff6b35' } : {}}>
                                                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'left-[18px]' : 'left-0.5'
                                                    }`} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <p className="text-xs text-slate-500 text-center">
                        Los cambios se aplican a todos los usuarios de esa Abteilung al recargar la página.
                        Superadmin y Admin siempre ven todo.
                    </p>
                </div>
            </div>
        </div>
    );
}
