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

    const menuItems: MenuItem[] = [
        { title: 'My_Dashboard', href: forceProjectSelection ? '/projekte' : `/${projektId}/my-dashboard`, icon: Sparkles },
        {
            title: 'Produktion',
            href: forceProjectSelection ? '/projekte' : `/${projektId}/teilsysteme`,
            icon: Layers,
            subItems: [
                { title: 'Blechabteilung', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/blech` },
                { title: 'Schlosserei', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/schlosserei` },
                { title: 'AVOR', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/avor` },
                { title: 'Einkauf', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/einkauf` },
                { title: 'Zimmerei', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/zimmerei` },
                { title: 'Montage', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/montage` },
                { title: 'Planung', href: forceProjectSelection ? '/projekte' : `/${projektId}/produktion/planung` },
            ]
        },
        { title: 'Ausführung', href: forceProjectSelection ? '/projekte' : `/${projektId}/ausfuehrung`, icon: Hammer },
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
        { title: 'Mitarbeiter', href: forceProjectSelection ? '/projekte' : `/${projektId}/mitarbeiter`, icon: Users, permission: 'manageUsers' as keyof RolePermissions },
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
                            {item.subItems && isActive && (
                                <div className="ml-12 mt-1 flex flex-col gap-1 border-l pl-2">
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
