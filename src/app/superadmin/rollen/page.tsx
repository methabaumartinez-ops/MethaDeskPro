'use client';

import React from 'react';
import { Shield, Users, RefreshCw, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import type { UserRole } from '@/types';
import { ABTEILUNGEN_CONFIG } from '@/types';

const ALL_ROLES: { value: UserRole; label: string; color: string }[] = [
    { value: 'superadmin', label: 'Super Admin', color: 'bg-purple-600' },
    { value: 'admin', label: 'Admin', color: 'bg-red-600' },
    { value: 'projektleiter', label: 'Projektleiter', color: 'bg-blue-600' },
    { value: 'bauprojektleiter', label: 'Bauprojektleiter', color: 'bg-cyan-600' },
    { value: 'baufuhrer', label: 'Bauführer', color: 'bg-sky-600' },
    { value: 'planer', label: 'Planer', color: 'bg-teal-600' },
    { value: 'polier', label: 'Polier', color: 'bg-green-600' },
    { value: 'monteur', label: 'Monteur', color: 'bg-amber-600' },
    { value: 'werkhof', label: 'Werkhof', color: 'bg-orange-600' },
    { value: 'produktion', label: 'Produktion', color: 'bg-yellow-600' },
    { value: 'mitarbeiter', label: 'Mitarbeiter', color: 'bg-slate-500' },
];

const ABT_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
    blue: { bg: '#dbeafe', border: '#93c5fd', icon: '#3b82f6' },
    sky: { bg: '#e0f2fe', border: '#7dd3fc', icon: '#0ea5e9' },
    teal: { bg: '#ccfbf1', border: '#5eead4', icon: '#14b8a6' },
    warning: { bg: '#fef9c3', border: '#fde047', icon: '#eab308' },
    info: { bg: '#e0e7ff', border: '#a5b4fc', icon: '#6366f1' },
    gray: { bg: '#f3f4f6', border: '#d1d5db', icon: '#9ca3af' },
    orange: { bg: '#ffedd5', border: '#fdba74', icon: '#f97316' },
    violet: { bg: '#ede9fe', border: '#c4b5fd', icon: '#8b5cf6' },
    success: { bg: '#dcfce7', border: '#86efac', icon: '#22c55e' },
    error: { bg: '#fee2e2', border: '#fca5a5', icon: '#ef4444' },
    default: { bg: '#f1f5f9', border: '#cbd5e1', icon: '#94a3b8' },
    outline: { bg: '#f8fafc', border: '#e2e8f0', icon: '#94a3b8' },
};

// Map Abteilung -> suggested roles
const ABTEILUNG_ROLES: Record<string, UserRole[]> = {
    planung: ['planer', 'projektleiter'],
    einkauf: ['mitarbeiter', 'projektleiter'],
    avor: ['mitarbeiter', 'planer'],
    schlosserei: ['produktion', 'monteur'],
    blech: ['produktion', 'monteur'],
    werkhof: ['werkhof'],
    montage: ['monteur', 'polier'],
    bau: ['baufuhrer', 'bauprojektleiter', 'polier'],
    zimmerei: ['monteur', 'polier'],
    subunternehmer: ['mitarbeiter'],
    unternehmer: ['mitarbeiter'],
};

interface UserEntry {
    id: string;
    vorname: string;
    nachname: string;
    email: string;
    role: UserRole;
    abteilung?: string;
}

export default function SuperadminRollenPage() {
    const { currentUser } = useProjekt();
    const router = useRouter();

    const [users, setUsers] = React.useState<UserEntry[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [savingId, setSavingId] = React.useState<string | null>(null);
    const [viewMode, setViewMode] = React.useState<'abteilung' | 'worker'>('abteilung');
    const [expandedAbt, setExpandedAbt] = React.useState<Set<string>>(new Set());

    // Access guard
    React.useEffect(() => {
        if (currentUser && currentUser.role !== 'superadmin') {
            router.replace('/projekte');
        }
    }, [currentUser, router]);

    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Fehler beim Laden');
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            toast.error(err.message || 'Fehler beim Laden der Benutzer');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { loadUsers(); }, [loadUsers]);

    const updateRole = async (userId: string, role: UserRole) => {
        setSavingId(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Fehler');
            }
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
            toast.success('Rolle aktualisiert');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSavingId(null);
        }
    };

    const roleInfo = (role: UserRole) => ALL_ROLES.find(r => r.value === role);

    // Group users by abteilung
    const byAbteilung = React.useMemo(() => {
        const map: Record<string, UserEntry[]> = { _ohne: [] };
        for (const abt of ABTEILUNGEN_CONFIG) map[abt.id] = [];
        for (const u of users) {
            const key = u.abteilung || '_ohne';
            if (!map[key]) map[key] = [];
            map[key].push(u);
        }
        return map;
    }, [users]);

    if (currentUser?.role !== 'superadmin') return null;

    return (
        <div className="min-h-screen text-gray-900 pb-10 relative" style={{ backgroundImage: "url('/construction_bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: 'rgba(255,255,255,0.91)' }} />
            <div className="relative z-10">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-6">
                <a href="/projekte" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-white shrink-0" style={{ background: '#ff6b35', boxShadow: '0 4px 14px rgba(255,107,53,0.35)' }}>
                    <ChevronLeft className="h-4 w-4" />
                    Zu Projekten
                </a>
                <div className="flex-1 w-full max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Shield icon — matches sidebar visual language */}
                        <div
                            className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                            style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)' }}
                        >
                            <Shield className="h-6 w-6" style={{ color: '#ff6b35' }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900">
                                Rollenverwaltung
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">Rollen nach Abteilung und Mitarbeiter verwalten</p>
                        </div>
                    </div>
                    <button
                        onClick={loadUsers}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all"
                        style={{ background: 'rgba(255,107,53,0.10)', borderColor: 'rgba(255,107,53,0.25)', color: '#ff6b35' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.20)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.10)')}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Aktualisieren
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
                {/* View Toggle */}
                <div className="flex bg-white border border-gray-200 rounded-2xl p-1 w-fit gap-1">
                    {(['abteilung', 'worker'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                            style={viewMode === mode
                                ? { background: '#ff6b35', color: '#fff', boxShadow: '0 4px 14px rgba(255,107,53,0.35)' }
                                : { color: '#64748b' }
                            }
                        >
                            {mode === 'abteilung' ? 'Nach Abteilung' : 'Nach Mitarbeiter'}
                        </button>
                    ))}
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Gesamt</p>
                        <p className="text-3xl font-black text-gray-900">{users.length}</p>
                        <p className="text-xs text-gray-400 font-medium mt-1">Benutzer</p>
                    </div>
                    {['superadmin', 'admin', 'projektleiter'].map(role => (
                        <div key={role} className="bg-white border border-gray-200 rounded-2xl p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">{roleInfo(role as UserRole)?.label}</p>
                            <p className="text-3xl font-black text-gray-900">{users.filter(u => u.role === role).length}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">Benutzer</p>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#ff6b35', borderTopColor: 'transparent' }} />
                    </div>
                ) : viewMode === 'abteilung' ? (
                    /* ─── BY ABTEILUNG ───── */
                    <div className="space-y-3">
                        {ABTEILUNGEN_CONFIG.map(abt => {
                            const abtUsers = byAbteilung[abt.id] || [];
                            const isOpen = expandedAbt.has(abt.id);
                            const suggestedRoles = ABTEILUNG_ROLES[abt.id] || [];

                            return (
                                <div key={abt.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                    <button
                                        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        onClick={() => setExpandedAbt(prev => {
                                            const next = new Set(prev);
                                            isOpen ? next.delete(abt.id) : next.add(abt.id);
                                            return next;
                                        })}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                                style={{
                                                    background: ABT_COLORS[abt.color]?.bg ?? 'rgba(100,116,139,0.15)',
                                                    border: `1px solid ${ABT_COLORS[abt.color]?.border ?? 'rgba(100,116,139,0.3)'}`,
                                                }}
                                            >
                                                <Users className="h-4 w-4" style={{ color: ABT_COLORS[abt.color]?.icon ?? '#94a3b8' }} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-900 text-sm">{abt.name}</p>
                                                <p className="text-xs text-gray-500">{abtUsers.length} Mitarbeiter</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1">
                                                {suggestedRoles.map(r => (
                                                    <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${roleInfo(r)?.color || 'bg-slate-600'}`}>
                                                        {roleInfo(r)?.label}
                                                    </span>
                                                ))}
                                            </div>
                                            {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="bg-gray-50 divide-y divide-gray-100">
                                            {abtUsers.length === 0 ? (
                                                <p className="px-8 py-4 text-sm text-slate-500 italic">Keine Mitarbeiter in dieser Abteilung</p>
                                            ) : (
                                                abtUsers.map(u => (
                                                    <UserRoleRow
                                                        key={u.id}
                                                        user={u}
                                                        saving={savingId === u.id}
                                                        onRoleChange={(role) => updateRole(u.id, role)}
                                                        roleInfo={roleInfo}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Ohne Abteilung */}
                        {(byAbteilung['_ohne'] || []).length > 0 && (
                            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)' }}
                                        >
                                            <Users className="h-4 w-4" style={{ color: '#94a3b8' }} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Ohne Abteilung</p>
                                            <p className="text-xs text-gray-500">{byAbteilung['_ohne'].length} Mitarbeiter</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 divide-y divide-gray-100">
                                    {byAbteilung['_ohne'].map(u => (
                                        <UserRoleRow
                                            key={u.id}
                                            user={u}
                                            saving={savingId === u.id}
                                            onRoleChange={(role) => updateRole(u.id, role)}
                                            roleInfo={roleInfo}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ─── BY WORKER ───── */
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        {/* Header — same visual weight as department accordion headers */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.28)' }}
                                >
                                    <Users className="h-4 w-4" style={{ color: '#ff6b35' }} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">Alle Mitarbeiter</p>
                                    <p className="text-xs text-gray-500">{users.length} Mitarbeiter</p>
                                </div>
                            </div>
                        </div>
                        {/* Column labels */}
                        <div className="grid grid-cols-[2fr_1fr_1.5fr] gap-4 px-6 py-2.5 border-y border-gray-200 bg-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Mitarbeiter</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Abteilung</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rolle</span>
                        </div>
                        {/* Rows */}
                        <div className="divide-y divide-gray-100 bg-white">
                            {users
                                .slice()
                                .sort((a, b) => `${a.nachname} ${a.vorname}`.localeCompare(`${b.nachname} ${b.vorname}`, 'de'))
                                .map(u => (
                                    <UserRoleRow
                                        key={u.id}
                                        user={u}
                                        saving={savingId === u.id}
                                        onRoleChange={(role) => updateRole(u.id, role)}
                                        roleInfo={roleInfo}
                                        showAbteilung
                                    />
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
// ─── Sub-component ──────────────────────────────────────────────────────────

function UserRoleRow({
    user,
    saving,
    onRoleChange,
    roleInfo,
    showAbteilung = false,
}: {
    user: UserEntry;
    saving: boolean;
    onRoleChange: (role: UserRole) => void;
    roleInfo: (role: UserRole) => { value: UserRole; label: string; color: string } | undefined;
    showAbteilung?: boolean;
}) {
    const current = roleInfo(user.role);
    const abtLabel = ABTEILUNGEN_CONFIG.find(a => a.id === user.abteilung)?.name || '–';

    return (
        <div className="grid grid-cols-[2fr_1fr_1.5fr] gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors">
            <div>
                <p className="font-bold text-gray-900 text-sm">{user.vorname} {user.nachname}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div>
                {showAbteilung && (
                    <span className="text-xs font-semibold text-gray-700">{abtLabel}</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${current?.color || 'bg-slate-600'}`}>
                    {current?.label || user.role}
                </span>
                <select
                    value={user.role}
                    disabled={saving}
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    className="flex-1 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50 cursor-pointer font-semibold border border-gray-200 bg-white text-gray-900"
                >
                    {ALL_ROLES.map(r => (
                        <option key={r.value} value={r.value} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                            {r.label}
                        </option>
                    ))}
                </select>
                {saving && <div className="h-3.5 w-3.5 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ff6b35', borderTopColor: 'transparent' }} />}
            </div>
        </div>
    );
}


