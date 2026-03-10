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
    Database,
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
    ShieldAlert,
    CalendarClock,
} from 'lucide-react';
import { Signature } from '@/components/shared/Signature';
import { useProjekt } from '@/lib/context/ProjektContext';
import { abtCanSee, loadAbtPermissions, type PageKey } from '@/lib/config/abteilungPagePermissions';
import { usePreviewAbteilung } from '@/lib/context/PreviewAbteilungContext';
import { ABTEILUNGEN_CONFIG } from '@/types';


type MenuItem = {
    title: string;
    href?: string;
    icon?: React.ElementType;
    pageKey?: PageKey;        // used for Abteilung-based filtering
    alwaysVisible?: boolean; // for items that all roles should see
    subItems?: MenuItem[];
};

export function Sidebar({ projektId, className }: { projektId: string; className?: string; forceProjectSelection?: boolean }) {
    const pathname = usePathname();
    const { currentUser } = useProjekt();
    const { previewAbteilung, isPreviewMode, setPreviewAbteilung } = usePreviewAbteilung();
    const isSuperadmin = currentUser?.role === 'superadmin';
    const isAdmin = currentUser?.role === 'admin' || isSuperadmin;
    const realAbteilung = (currentUser as any)?.abteilung as string | undefined;

    // When in preview mode, use the simulated Abteilung; otherwise use the user's real one.
    // Admins/superadmins without preview always see everything.
    const effectiveAbteilung = isPreviewMode ? previewAbteilung ?? undefined : realAbteilung;
    const applyAbtFilter = isPreviewMode || (!isAdmin); // always filter in preview mode

    // Load Abteilung permissions (from localStorage, set in superadmin panel)
    const [abtPerms, setAbtPerms] = React.useState<Record<string, PageKey[]>>({});
    React.useEffect(() => { setAbtPerms(loadAbtPermissions()); }, []);

    const canSee = (pageKey?: PageKey): boolean => {
        if (!applyAbtFilter) return true;  // admin without preview sees all
        if (!pageKey) return true;          // items with no pageKey are always visible
        return abtCanSee(effectiveAbteilung, pageKey);
    };

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
            pageKey: 'dashboard-builder',
            subItems: [
                { title: 'My Dashboard', href: `/${projektId}/my-dashboard`, icon: LayoutDashboard, pageKey: 'my-dashboard' },
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
                    pageKey: 'bauleitung',
                    subItems: [
                        { title: 'Analyse', href: `/${projektId}/analyse`, icon: Activity, pageKey: 'analyse' },
                    ]
                },
                {
                    title: 'Produktion',
                    href: `/${projektId}/produktion`,
                    icon: Factory,
                    pageKey: 'produktion',
                    subItems: [
                        { title: 'Planer', href: `/${projektId}/produktion/planung`, icon: PenTool, pageKey: 'planung' as const },
                        { title: 'AVOR', href: `/${projektId}/produktion/avor`, icon: ClipboardList, pageKey: 'avor' as const },
                        { title: 'Einkauf', href: `/${projektId}/produktion/einkauf`, icon: ShoppingCart, pageKey: 'einkauf' as const },
                        { title: 'Schlosserei', href: `/${projektId}/produktion/schlosserei`, icon: Wrench, pageKey: 'schlosserei' as const },
                        { title: 'Blechabteilung', href: `/${projektId}/produktion/blech`, icon: Box, pageKey: 'blech' as const },
                        { title: 'Kosten', href: `/${projektId}/kosten`, icon: DollarSign, pageKey: 'kosten' as const },
                    ]
                },
                {
                    title: 'Ausfuehrung',
                    href: `/${projektId}/ausfuehrung`,
                    icon: Hammer,
                    pageKey: 'ausfuehrung',
                    subItems: [
                        { title: 'Arbeitsplan', href: `/${projektId}/arbeitsplan`, icon: CalendarClock, pageKey: 'arbeitsplan' as const },
                    ]
                },
            ]
        },
        {
            title: 'Werkhof',
            icon: Warehouse,
            subItems: [
                { title: 'Bestellungen', href: `/${projektId}/werkhof`, icon: Package, pageKey: 'werkhof-bestellungen' },
                { title: 'Lagerort', href: `/${projektId}/lagerorte`, icon: MapPin, pageKey: 'lagerort' },
                { title: 'QR Scan', href: `/${projektId}/lager-scan`, icon: QrCode, pageKey: 'qr-scan' },
            ]
        },
        { title: 'Fuhrpark', href: `/fuhrpark`, icon: Car, pageKey: 'fuhrpark' },
        { title: 'DatenBank', href: `/${projektId}/tabellen`, icon: Database, pageKey: 'tabellen' },
    ];

    const superadminItems: MenuItem[] = isSuperadmin ? [
        { title: 'Rollenverwaltung', href: '/superadmin/rollen', icon: ShieldAlert },
    ] : [];

    const filterAllowed = (items: MenuItem[]): MenuItem[] => {
        return items
            .filter(item => canSee(item.pageKey))
            .map(item => ({
                ...item,
                subItems: item.subItems ? filterAllowed(item.subItems) : undefined
            }))
            .filter(item => {
                if (item.subItems !== undefined) {
                    return item.subItems.length > 0 || !!item.href;
                }
                return true;
            });
    };

    const allowedItems = filterAllowed(menuItems);

    return (
        <aside className={cn("relative flex flex-col h-[calc(100vh-5rem)] w-64 border-r bg-white dark:bg-slate-950 dark:border-slate-800 transition-colors", className)}>

            {/* Preview mode banner — Methabau Orange branding */}
            {isPreviewMode && (
                <div
                    className="shrink-0 px-3 py-2.5 flex items-center justify-between gap-2 text-white text-[10px] font-bold"
                    style={{ background: '#ff6b35' }}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="opacity-80 shrink-0">👁 Ansicht:</span>
                        <span className="font-black truncate">
                            {ABTEILUNGEN_CONFIG.find(a => a.id === previewAbteilung)?.name ?? previewAbteilung}
                        </span>
                    </div>
                    <button
                        onClick={() => setPreviewAbteilung(null)}
                        className="shrink-0 underline opacity-80 hover:opacity-100 transition-opacity"
                    >
                        ✕ Stop
                    </button>
                </div>
            )}

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

                {isSuperadmin && (
                    <>
                        <div className="my-2 border-t border-border/50" />
                        <p className="px-3 text-[9px] font-black uppercase tracking-widest text-purple-500/70 mb-1">Superadmin</p>
                        {superadminItems.map((item) => (
                            <NavItem
                                key={item.title}
                                item={item}
                                pathname={pathname}
                                depth={0}
                                forceOnlyProjekte={false}
                            />
                        ))}
                    </>
                )}
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
