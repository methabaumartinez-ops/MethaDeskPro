'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Layers,
    ListTodo,
    LayoutDashboard,
    Warehouse,
    Hammer,
    Car,
    DollarSign,
    Sparkles,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { Signature } from '@/components/shared/Signature';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { RolePermissions } from '@/lib/permissions';

type MenuItem = {
    title: string;
    href?: string;
    icon?: React.ElementType;
    permission?: keyof RolePermissions;
    subItems?: MenuItem[];
};

export function Sidebar({ projektId, className, forceProjectSelection = false }: { projektId: string; className?: string; forceProjectSelection?: boolean }) {
    const pathname = usePathname();
    const { can } = usePermissions();

    const menuItems: MenuItem[] = [
        {
            title: 'Dashboard Builder',
            icon: Sparkles,
            href: `/${projektId}/dashboard-builder`,
            subItems: [
                { title: 'My Dashboard', href: `/${projektId}/my-dashboard`, icon: LayoutDashboard },
            ]
        },
        {
            title: 'Projekte',
            icon: Layers,
            subItems: [
                {
                    title: 'Produktion',
                    href: `/${projektId}/teilsysteme`,
                    subItems: [
                        { title: 'Bauleitung & Planner', href: `/${projektId}/produktion/planung` },
                        { title: 'AVOR', href: `/${projektId}/produktion/avor` },
                        { title: 'Einkauf', href: `/${projektId}/produktion/einkauf` },
                        { title: 'Schlosserei', href: `/${projektId}/produktion/schlosserei` },
                        { title: 'Blechabteilung', href: `/${projektId}/produktion/blech` },
                        { title: 'Kosten', href: `/${projektId}/kosten`, permission: 'viewKosten' },
                        { title: 'Tabellen', href: `/${projektId}/tabellen`, permission: 'read' },
                        { title: 'Analyse', href: `/${projektId}/analyse` },
                    ]
                },
                {
                    title: 'Baumeister',
                    href: `/${projektId}/ausfuehrung`,
                    subItems: [
                        { title: 'Ausführung', href: `/${projektId}/ausfuehrung` },
                    ]
                }
            ]
        },
        { title: 'Werkhof', href: `/${projektId}/werkhof`, icon: Warehouse },
        { title: 'Fuhrpark', href: `/fuhrpark`, icon: Car, permission: 'viewKosten' },
    ];

    const filterAllowed = (items: MenuItem[]): MenuItem[] => {
        return items
            .filter(item => !item.permission || can(item.permission))
            .map(item => ({
                ...item,
                subItems: item.subItems ? filterAllowed(item.subItems) : undefined
            }));
    };

    const allowedItems = filterAllowed(menuItems);

    return (
        <aside className={cn("relative flex flex-col h-[calc(100vh-5rem)] w-64 border-r bg-white dark:bg-slate-950 dark:border-slate-800 transition-colors", className)}>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 pb-40">
                {allowedItems.map((item) => (
                    <NavItem key={item.title} item={item} pathname={pathname} depth={0} />
                ))}
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

function NavItem({ item, pathname, depth }: { item: MenuItem; pathname: string; depth: number }) {
    const hasSubItems = item.subItems && item.subItems.length > 0;

    // Check if any subitem is active
    const isAnySubActive = (it: MenuItem): boolean => {
        if (it.href && pathname === it.href) return true;
        if (it.subItems) return it.subItems.some(isAnySubActive);
        return false;
    };

    const isActive = item.href ? pathname === item.href : isAnySubActive(item);
    const [isOpen, setIsOpen] = React.useState(isActive || isAnySubActive(item));

    // Update expansion if pathname changes to a child
    React.useEffect(() => {
        if (isAnySubActive(item)) {
            setIsOpen(true);
        }
    }, [pathname]);

    const Icon = item.icon;

    const content = (
        <div
            className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all group cursor-pointer',
                isActive && !hasSubItems
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100',
                isActive && hasSubItems ? 'text-foreground font-bold' : '',
                depth > 0 ? 'py-1.5 font-medium' : ''
            )}
            onClick={() => hasSubItems && setIsOpen(!isOpen)}
        >
            {Icon && <Icon className={cn('h-4 w-4 shrink-0', isActive && !hasSubItems ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />}
            {!Icon && depth > 0 && <div className="w-1" />}
            <span className="flex-1 truncate">{item.title}</span>
            {hasSubItems && (
                isOpen ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            )}
        </div>
    );

    return (
        <div className="flex flex-col">
            {item.href && !hasSubItems ? (
                <Link href={item.href}>{content}</Link>
            ) : item.href && hasSubItems ? (
                // Parent that is ALSO a link
                <div className="flex flex-col">
                    <div className="flex items-center">
                        <Link href={item.href} className="flex-1">{content}</Link>
                    </div>
                    {isOpen && (
                        <div className={cn("ml-4 mt-1 flex flex-col gap-1 border-l pl-2 animate-in slide-in-from-left-2")}>
                            {item.subItems?.map(sub => (
                                <NavItem key={sub.title} item={sub} pathname={pathname} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // Just a folder
                <>
                    {content}
                    {isOpen && (
                        <div className={cn("ml-4 mt-1 flex flex-col gap-1 border-l pl-2 animate-in slide-in-from-left-2", depth === 0 ? "ml-6" : "")}>
                            {item.subItems?.map(sub => (
                                <NavItem key={sub.title} item={sub} pathname={pathname} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
