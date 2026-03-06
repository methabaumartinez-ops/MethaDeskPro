'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Activity,
    PenTool,
    ClipboardList,
    ShoppingCart,
    Wrench,
    Box,
    DollarSign,
    Table,
    Package,
    MapPin,
    QrCode,
    Briefcase,
    Factory,
    Layers,
    LayoutDashboard,
    Warehouse,
    Hammer,
    Car,
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

export function Sidebar({ projektId, className }: { projektId: string; className?: string; forceProjectSelection?: boolean }) {
    const pathname = usePathname();
    const { can } = usePermissions();

    // Detect entry from project selection page and collapse all groups except "Projekte"
    const [forceOnlyProjekte, setForceOnlyProjekte] = React.useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const flag = sessionStorage.getItem('fromProjectSelection');
            if (flag) {
                setForceOnlyProjekte(true);
                sessionStorage.removeItem('fromProjectSelection');
            }
        }
    }, []);

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
                    title: 'Bauleitung',
                    href: `/${projektId}/produktion/bauleitung`,
                    icon: Briefcase,
                    subItems: [
                        { title: 'Analyse', href: `/${projektId}/analyse`, icon: Activity },
                    ]
                },
                {
                    title: 'Produktion',
                    href: `/${projektId}/teilsysteme`,
                    icon: Factory,
                    subItems: [
                        { title: 'Planer', href: `/${projektId}/produktion/planung`, icon: PenTool },
                        { title: 'AVOR', href: `/${projektId}/produktion/avor`, icon: ClipboardList },
                        { title: 'Einkauf', href: `/${projektId}/produktion/einkauf`, icon: ShoppingCart },
                        { title: 'Schlosserei', href: `/${projektId}/produktion/schlosserei`, icon: Wrench },
                        { title: 'Blechabteilung', href: `/${projektId}/produktion/blech`, icon: Box },
                        { title: 'Kosten', href: `/${projektId}/kosten`, permission: 'viewKosten', icon: DollarSign },
                        { title: 'Tabellen', href: `/${projektId}/tabellen`, permission: 'read', icon: Table },
                    ]
                },
                {
                    title: 'Ausfuehrung',
                    href: `/${projektId}/ausfuehrung`,
                    icon: Hammer,
                },
            ]
        },
        {
            title: 'Werkhof',
            icon: Warehouse,
            subItems: [
                { title: 'Bestellungen', href: `/${projektId}/werkhof`, icon: Package },
                { title: 'Lagerort', href: `/${projektId}/lagerorte`, icon: MapPin },
                { title: 'QR Scan', href: `/${projektId}/lager-scan`, icon: QrCode },
            ]
        },
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
                    <NavItem
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        depth={0}
                        forceOnlyProjekte={forceOnlyProjekte}
                    />
                ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-slate-950 transition-colors z-10">
                <div className="flex items-end justify-between gap-2">
                    <Signature />
                    <div className="flex flex-col items-end gap-0.5 opacity-60">
                        <p className="text-[8px] font-bold uppercase text-muted-foreground/60 tracking-widest leading-none">Version</p>
                        <p className="text-[9px] font-extrabold text-foreground/70">v1.0.6-BETA</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function NavItem({
    item,
    pathname,
    depth,
    forceOnlyProjekte,
}: {
    item: MenuItem;
    pathname: string;
    depth: number;
    forceOnlyProjekte?: boolean;
}) {
    const hasSubItems = item.subItems && item.subItems.length > 0;

    // Check if any subitem is active
    const isAnySubActive = (it: MenuItem): boolean => {
        if (it.href && pathname === it.href) return true;
        if (it.subItems) return it.subItems.some(isAnySubActive);
        return false;
    };

    const isActive = item.href ? pathname === item.href : isAnySubActive(item);

    // When entering from project selection, only "Projekte" starts open at depth 0
    const computeInitialOpen = () => {
        if (forceOnlyProjekte && depth === 0) {
            return item.title === 'Projekte';
        }
        // "Produktion" should be closed by default on initial load
        if (item.title === 'Produktion') {
            return false;
        }
        return isActive || isAnySubActive(item);
    };

    const [isOpen, setIsOpen] = React.useState(computeInitialOpen);

    // Update expansion if pathname changes to a child
    React.useEffect(() => {
        if (isAnySubActive(item) && item.title !== 'Produktion') {
            setIsOpen(true);
        }
    }, [pathname]);

    const Icon = item.icon;

    const content = (
        <div
            className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all group',
                item.href && !hasSubItems ? 'cursor-pointer' : '',
                !hasSubItems ? 'cursor-pointer' : '', // If it's a folder, leave cursor default but arrow gets pointer
                item.href ? 'cursor-pointer' : '', // Link parents get pointer
                isActive && !hasSubItems
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100',
                isActive && hasSubItems ? 'text-foreground font-bold' : '',
                depth > 0 ? 'py-1.5 font-medium' : ''
            )}
        >
            {Icon && <Icon className={cn('shrink-0', depth === 0 ? 'h-4 w-4' : 'h-3.5 w-3.5', isActive && !hasSubItems ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />}
            {!Icon && depth > 0 && <div className="w-1" />}
            <span className="flex-1 truncate">{item.title === 'Ausfuehrung' ? 'Ausführung' : item.title}</span>
            {hasSubItems && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="p-1.5 -mr-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm cursor-pointer"
                    aria-label={isOpen ? "Menü einklappen" : "Menü ausklappen"}
                >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 opacity-70" /> : <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                </button>
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
                                <NavItem
                                    key={sub.title}
                                    item={sub}
                                    pathname={pathname}
                                    depth={depth + 1}
                                    forceOnlyProjekte={forceOnlyProjekte}
                                />
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
                                <NavItem
                                    key={sub.title}
                                    item={sub}
                                    pathname={pathname}
                                    depth={depth + 1}
                                    forceOnlyProjekte={forceOnlyProjekte}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
