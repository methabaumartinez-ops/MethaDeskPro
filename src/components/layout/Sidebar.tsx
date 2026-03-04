'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Layers,
    ListTodo,
    Users,
    LayoutDashboard,
    Warehouse,
    Hammer,
    Car,
    MessageSquare,
    QrCode,
    DollarSign,
    Sparkles,
} from 'lucide-react';
import { ChatAssistant } from '@/components/shared/ChatAssistant';
import { Signature } from '@/components/shared/Signature';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { RolePermissions } from '@/lib/permissions';
import { ABTEILUNGEN_CONFIG } from '@/types';

type MenuItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    permission?: keyof RolePermissions;
    subItems?: { title: string; href: string }[];
};

export function Sidebar({ projektId, className, forceProjectSelection = false }: { projektId: string; className?: string; forceProjectSelection?: boolean }) {
    const pathname = usePathname();
    const { can, role } = usePermissions();

    const isDashboardMode = pathname.includes('/dashboard-builder') || pathname.includes('/my-dashboard');

    const menuItems: MenuItem[] = isDashboardMode
        ? [
            { title: 'Dashboard Builder', href: `/${projektId}/dashboard-builder`, icon: Sparkles },
            { title: 'My Dashboard', href: `/${projektId}/my-dashboard`, icon: LayoutDashboard },
            {
                title: 'Methabau Infrastruktur',
                href: forceProjectSelection ? '/projekte' : `/${projektId}/teilsysteme`,
                icon: Layers,
                subItems: [
                    { title: 'Produktion', href: `/${projektId}/teilsysteme` },
                    { title: 'Ausführung', href: `/${projektId}/ausfuehrung` },
                    { title: 'Werkhof', href: `/${projektId}/werkhof` },
                    { title: 'Fuhrpark', href: `/fuhrpark` },
                    { title: 'Kostenerfassung', href: `/${projektId}/kosten` },
                    { title: 'Tabellen', href: `/${projektId}/tabellen` },
                    { title: 'Analyse', href: `/${projektId}/analyse` },
                ]
            },
        ]
        : [

            { title: 'Dashboard Builder', href: `/${projektId}/dashboard-builder`, icon: Sparkles },
            { title: 'My Dashboard', href: `/${projektId}/my-dashboard`, icon: LayoutDashboard },
            {
                title: 'Produktion',
                href: forceProjectSelection ? '/projekte' : `/${projektId}/teilsysteme`,
                icon: Layers,
                subItems: [
                    ...[
                        'planung', 'einkauf', 'avor', 'schlosserei', 'blech', 'werkhof', 'montage'
                    ].map(id => {
                        const dept = ABTEILUNGEN_CONFIG.find(a => a.id === id);
                        return {
                            title: dept?.name || id,
                            href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/${id}`
                        };
                    }),
                    {
                        title: 'Lieferanten',
                        href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/lieferanten`
                    }
                ]
            },
            {
                title: 'Ausführung',
                href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung`,
                icon: Hammer,
                subItems: [
                    { title: 'TS - Alle', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung?tab=teilsysteme` },
                    { title: 'TS am Baustelle', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung?tab=ts_baustelle` },
                    { title: 'Bestellungen', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung?tab=logistik` },
                    { title: 'Aufgaben', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung/tasks` },
                    { title: 'Teams', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung/teams` },
                ]
            },
            {
                title: 'Werkhof',
                href: forceProjectSelection ? '/projekte' : `/${projektId}/werkhof`,
                icon: Warehouse,
                subItems: [
                    { title: 'Bestellungen', href: forceProjectSelection ? '/projekte' : `/${projektId}/werkhof` },
                    { title: 'Lager & QR', href: forceProjectSelection ? '/projekte' : `/${projektId}/lagerorte` },
                    { title: 'QR Scan', href: forceProjectSelection ? '/projekte' : `/${projektId}/lager-scan` },
                ]
            },
            { title: 'Fuhrpark', href: `/fuhrpark`, icon: Car, permission: 'viewKosten' },
            // Technische Tabs, die nur bei ausgewähltem Projekt angezeigt werden
            ...(!forceProjectSelection ? [
                { title: 'Kostenerfassung', href: `/${projektId}/kosten`, icon: DollarSign, permission: 'viewKosten' as keyof RolePermissions },
                { title: 'Tabellen', href: `/${projektId}/tabellen`, icon: ListTodo, permission: 'read' as keyof RolePermissions },
                { title: 'Analyse', href: `/${projektId}/analyse`, icon: BarChart3 },
            ] : []),
        ];

    // Filtrar items permitidos
    const allowedItems = menuItems.filter(item => {
        if (!item.permission) return true;
        return can(item.permission);
    });

    return (
        <aside className={cn("relative flex flex-col h-[calc(100vh-4rem)] w-64 border-r bg-white dark:bg-slate-950 dark:border-slate-800 transition-colors", className)}>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pb-40">
                {allowedItems.map((item) => {
                    const isProjectRoot = item.href === `/${projektId}`;
                    const isActive =
                        !forceProjectSelection && (
                            (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href))) ||
                            (isProjectRoot ? pathname === item.href : (pathname === item.href || pathname.startsWith(`${item.href}/`)))
                        );

                    return (
                        <div key={item.title}>
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all group',
                                    isActive && !item.subItems
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100',
                                    isActive && item.subItems ? 'text-foreground bg-accent' : ''
                                )}
                            >
                                <item.icon className={cn('h-5 w-5 shrink-0', isActive && !item.subItems ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                                <span>{item.title}</span>
                            </Link>

                            {/* Sub-items */}
                            {item.subItems && (isActive || (isDashboardMode && item.title === 'Methabau Infrastruktur')) && (
                                <div className="ml-12 mt-1 flex flex-col gap-1 border-l pl-2 animate-in slide-in-from-left-2 duration-300">
                                    {item.subItems.map((sub) => {
                                        const isSubActive = pathname === sub.href;
                                        return (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                className={cn(
                                                    'block rounded-md px-3 py-2 text-xs font-medium transition-colors',
                                                    isSubActive
                                                        ? 'text-primary bg-primary/5 font-bold'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                                )}
                                            >
                                                {sub.title}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-slate-950 transition-colors z-10">
                <div className="flex items-end justify-between gap-2">
                    <Signature />
                    <div className="flex flex-col items-end gap-0.5 opacity-60">
                        <p className="text-[8px] font-bold uppercase text-muted-foreground/60 tracking-widest leading-none">Version</p>
                        <p className="text-[9px] font-extrabold text-foreground/70">v1.3.0-PRO</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
