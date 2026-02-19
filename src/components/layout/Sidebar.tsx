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
    Truck,
    Users,
    FileText,
    LayoutDashboard,
    Calendar,
    Warehouse,
    Hammer,
    Car,
    MessageSquare,
} from 'lucide-react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ChatAssistant } from '@/components/shared/ChatAssistant';

export function Sidebar({ projektId, className }: { projektId: string; className?: string }) {
    const pathname = usePathname();

    const menuItems = [
        { title: 'Übersicht', href: `/${projektId}`, icon: LayoutDashboard },
        { title: 'Planer', href: `/${projektId}/planer`, icon: Calendar },
        { title: 'Produktion', href: `/${projektId}/teilsysteme`, icon: Layers },
        // { title: 'Positionen', href: `/${projektId}/positionen`, icon: ListTodo }, // Hidden per request
        {
            title: 'Einkauf',
            href: `/einkauf`,
            icon: Package,
            subItems: [
                { title: 'Globale Übersicht', href: `/einkauf` },
                { title: 'Materialliste (Projekt)', href: `/${projektId}/material` },
                { title: 'Lieferanten', href: `/${projektId}/lieferanten` }
            ]
        },
        { title: 'Ausführung', href: `/${projektId}/ausfuehrung`, icon: Hammer },
        { title: 'Werkhof', href: `/${projektId}/werkhof`, icon: Warehouse },
        { title: 'Fuhrpark', href: `/fuhrpark`, icon: Car },
        { title: 'Mitarbeiter', href: `/${projektId}/mitarbeiter`, icon: Users },
        { title: 'Tabellen', href: `/${projektId}/tabellen`, icon: ListTodo },
        { title: 'AI Assistant', href: `/${projektId}/chat`, icon: MessageSquare },

        // { title: 'Berichte', href: `/${projektId}/berichte`, icon: FileText }, // Removed per request
    ];

    return (
        <aside className={cn("relative flex flex-col h-[calc(100vh-4rem)] w-64 border-r bg-white dark:bg-slate-950 dark:border-slate-800 transition-colors", className)}>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pb-40">
                {menuItems.map((item) => {
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
                <div className="rounded-2xl bg-muted p-4 border">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Version</p>
                    <p className="text-xs font-bold text-foreground/80">v1.0.0-prototype</p>
                </div>
            </div>
        </aside>
    );
}
