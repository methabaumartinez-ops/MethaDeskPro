'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shield, Users, ChevronRight, Eye, EyeOff, LogOut, Table as TableIcon, LayoutList } from 'lucide-react';
import { ABTEILUNGEN_CONFIG } from '@/types';
import { usePreviewAbteilung } from '@/lib/context/PreviewAbteilungContext';

type AdminNavItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    description: string;
};

const ADMIN_NAV: AdminNavItem[] = [
    {
        title: 'Rollenverwaltung',
        href: '/superadmin/rollen',
        icon: Users,
        description: 'Rollen & Benutzer',
    },
    {
        title: 'Seitenzugriff',
        href: '/superadmin/zugriff',
        icon: Shield,
        description: 'Abteilung → Seiten',
    },
    {
        title: 'Tabellen-Rechte',
        href: '/superadmin/tabellen',
        icon: TableIcon,
        description: 'Zugriff auf Tabellen',
    },
];

const ABT_COLORS: Record<string, string> = {
    planung:        'bg-teal-500',
    einkauf:        'bg-yellow-500',
    avor:           'bg-sky-500',
    schlosserei:    'bg-slate-400',
    blech:          'bg-orange-400',
    werkhof:        'bg-violet-500',
    montage:        'bg-emerald-500',
    bau:            'bg-red-500',
    zimmerei:       'bg-indigo-400',
    subunternehmer: 'bg-zinc-400',
    unternehmer:    'bg-stone-400',
};

export function SuperadminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { previewAbteilung, setPreviewAbteilung, isPreviewMode } = usePreviewAbteilung();
    const [showAbtPicker, setShowAbtPicker] = React.useState(false);

    const handlePreview = (abtId: string) => {
        setPreviewAbteilung(abtId);
        setShowAbtPicker(false);
        // Navigate to projekte so the user can see the filtered sidebar
        router.push('/projekte');
    };

    const handleStopPreview = () => {
        setPreviewAbteilung(null);
        setShowAbtPicker(false);
    };

    const activeAbt = ABTEILUNGEN_CONFIG.find(a => a.id === previewAbteilung);

    return (
        <aside className="w-64 min-h-screen bg-slate-950 border-r border-white/10 flex flex-col font-[Inter,system-ui,sans-serif]">

            {/* ── Logo / Identity Box (Blue-marked area) ──── */}
            <div
                className="px-5 pt-5 pb-5 border-b shrink-0"
                style={{ borderColor: 'rgba(255,107,53,0.15)', background: 'rgba(255,107,53,0.04)' }}
            >
                {/* App logotype — the real brand identity */}
                <div className="flex items-center gap-2.5">
                    <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm select-none"
                        style={{ background: '#ff6b35', boxShadow: '0 4px 12px rgba(255,107,53,0.4)' }}
                    >
                        M
                    </div>
                    <div className="leading-none">
                        <div className="flex items-baseline gap-0.5">
                            <span className="font-black text-sm tracking-tight text-white">METHA</span>
                            <span className="font-black text-sm tracking-tight" style={{ color: '#ff6b35' }}>Desk</span>
                            <span className="text-[9px] font-bold text-slate-500 ml-0.5 tracking-wide">pro</span>
                        </div>
                        <p className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase mt-0.5">Superadmin</p>
                    </div>
                </div>
            </div>

            {/* ── Navigation ────────────────────────────────── */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2 mb-2 mt-1">Verwaltung</p>

                {ADMIN_NAV.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group',
                                isActive
                                    ? 'text-white'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            )}
                            style={isActive ? {
                                background: 'rgba(255,107,53,0.12)',
                                border: '1px solid rgba(255,107,53,0.25)',
                            } : {}}
                        >
                            <Icon className={cn('h-4 w-4 shrink-0 transition-colors',
                                isActive ? '' : 'text-slate-500 group-hover:text-slate-300'
                            )}
                            style={isActive ? { color: '#ff6b35' } : {}}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold leading-none">{item.title}</p>
                                <p className="text-[10px] mt-0.5 opacity-50">{item.description}</p>
                            </div>
                            {isActive && <ChevronRight className="h-3 w-3 shrink-0" style={{ color: '#ff6b35' }} />}
                        </Link>
                    );
                })}

                {/* ── App links ───────────────────────────────── */}
                <div className="pt-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2 mb-2">App</p>
                    <Link
                        href="/projekte"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group text-slate-400 hover:bg-white/5 hover:text-white"
                    >
                        <LayoutList className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold leading-none">Projekte</p>
                            <p className="text-[10px] mt-0.5 opacity-50">Zur Projektliste</p>
                        </div>
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-30" />
                    </Link>
                </div>

                {/* ── Preview-Abteilung section ───────────────── */}
                <div className="pt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-2 mb-2">Ansicht simulieren</p>

                    {isPreviewMode ? (
                        /* Active preview banner */
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <div className="px-3 py-2.5 flex items-center gap-2"
                                 style={{ background: 'rgba(255,107,53,0.10)', borderBottom: '1px solid rgba(255,107,53,0.15)' }}>
                                <Eye className="h-3.5 w-3.5 shrink-0" style={{ color: '#ff6b35' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: '#ff6b35' }}>
                                        Vorschau aktiv
                                    </p>
                                    <p className="text-xs font-bold text-white truncate">{activeAbt?.name}</p>
                                </div>
                                <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', ABT_COLORS[previewAbteilung!] ?? 'bg-slate-500')} />
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-white/5">
                                <button
                                    onClick={() => setShowAbtPicker(v => !v)}
                                    className="px-3 py-2 text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    Wechseln
                                </button>
                                <button
                                    onClick={handleStopPreview}
                                    className="px-3 py-2 text-[10px] font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-1"
                                >
                                    <EyeOff className="h-3 w-3" />
                                    Beenden
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Trigger button */
                        <button
                            onClick={() => setShowAbtPicker(v => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all border border-dashed border-white/10 hover:border-white/20"
                        >
                            <Eye className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="text-sm font-semibold">Als Abteilung navigieren</span>
                        </button>
                    )}

                    {/* Abteilung picker dropdown */}
                    {showAbtPicker && (
                        <div className="mt-2 rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-white/5">
                                Abteilung wählen
                            </p>
                            <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                                {ABTEILUNGEN_CONFIG.map(abt => (
                                    <button
                                        key={abt.id}
                                        onClick={() => handlePreview(abt.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', ABT_COLORS[abt.id] ?? 'bg-slate-500')} />
                                        <span className="text-sm font-semibold text-slate-300 hover:text-white">{abt.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Footer ────────────────────────────────────── */}
            <div className="p-3 border-t border-white/8">
                <Link href="/projekte" className="block w-full">
                    <Button variant="metha-orange" className="w-full flex items-center justify-center gap-2 font-bold py-2.5 h-auto">
                        <LogOut className="h-4 w-4 rotate-180" />
                        Zurück zur App
                    </Button>
                </Link>
            </div>
        </aside>
    );
}
