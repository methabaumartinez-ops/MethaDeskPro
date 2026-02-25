'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Layers,
    ListTodo,
    Package,
    Users,
    LayoutDashboard,
    Calendar,
    Warehouse,
    Hammer,
    Car,
    MessageSquare,
    QrCode,
    DollarSign,
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

export function Sidebar({ projektId, className }: { projektId: string; className?: string }) {
    const pathname = usePathname();
    const { can, role } = usePermissions();

    const menuItems: MenuItem[] = [
        { title: 'Übersicht', href: `/${projektId}`, icon: LayoutDashboard },
        { title: 'Planer', href: `/${projektId}/planer`, icon: Calendar },
        { title: 'Produktion', href: `/${projektId}/teilsysteme`, icon: Layers },
        {
            title: 'Einkauf',
            href: `/einkauf`,
            icon: Package,
            permission: 'viewKosten', // Solo los que ven costes ven compras
            subItems: [
                { title: 'Globale Übersicht', href: `/einkauf` },
                { title: 'Materialliste (Projekt)', href: `/${projektId}/material` },
                { title: 'Lieferanten', href: `/${projektId}/lieferanten` }
            ]
        },
        { title: 'Ausführung', href: `/${projektId}/ausfuehrung`, icon: Hammer },
        { title: 'Werkhof', href: `/${projektId}/werkhof`, icon: Warehouse },
        {
            title: 'Lager & QR',
            href: `/${projektId}/lagerorte`,
            icon: QrCode,
            permission: 'qrMove',
            subItems: [
                { title: '📦 Lagerorte verwalten', href: `/${projektId}/lagerorte` },
                { title: '📷 QR Scan', href: `/${projektId}/lager-scan` },
            ]
        },
        { title: 'Kostenerfassung', href: `/${projektId}/kosten`, icon: DollarSign, permission: 'viewKosten' },
        { title: 'Fuhrpark', href: `/fuhrpark`, icon: Car, permission: 'viewKosten' }, // Por ahora restringido
        { title: 'Mitarbeiter', href: `/${projektId}/mitarbeiter`, icon: Users, permission: 'manageUsers' },
        { title: 'Tabellen', href: `/${projektId}/tabellen`, icon: ListTodo, permission: 'read' },
        { title: 'AI Assistant', href: `/${projektId}/chat`, icon: MessageSquare },
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
                        (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href))) ||
                        (isProjectRoot ? pathname === item.href : (pathname === item.href || pathname.startsWith(`${item.href}/`)));

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

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 transition-colors border-t border-sidebar z-10">
                <div className="flex justify-center mb-4">
                    <ChatAssistant isSidebarMode={true} />
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200/50">
                    <div className="mb-2 px-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest leading-none mb-1">Version</p>
                        <p className="text-[10px] font-extrabold text-foreground/70">v1.3.0-PRO</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                        <Signature />
                    </div>
                </div>
            </div>
        </aside>
    );
}
