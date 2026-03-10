'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SupportChat } from '@/components/shared/SupportChat';
import { UserAvatar, getUserInitials } from '@/components/shared/UserAvatar';
import { cn } from '@/lib/utils';

interface HeaderProps {
    onMenuClick?: () => void;
    hideProjectInfo?: boolean;
    /** Black project banner rendered inline between logo and user actions */
    projectBanner?: React.ReactNode;
}

export function Header({ onMenuClick, hideProjectInfo = false, projectBanner }: HeaderProps) {
    const { currentUser, logout } = useProjekt();
    const router = useRouter();

    const showBanner = !hideProjectInfo && !!projectBanner;

    return (
        <header className="fixed top-0 z-50 w-full border-b bg-white dark:bg-slate-950 transition-colors shadow-sm">
            {/* 3-zone grid: [left-fixed | center-flex | right-fixed] */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center h-14 w-full">

                {/* ── ZONE LEFT: Logo + Projekte button ── */}
                <div className={cn(
                    "flex items-center gap-3 h-full px-4 shrink-0",
                    "sm:pl-6 lg:w-64 lg:border-r lg:pr-4 lg:pl-6"
                )}>
                    {/* Mobile menu button */}
                    <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onMenuClick}>
                        <Menu className="h-6 w-6" />
                    </Button>

                    {/* Logo */}
                    <span
                        className="hidden sm:block text-xl font-bold tracking-tight text-foreground cursor-pointer select-none shrink-0"
                        onClick={() => router.push('/welcome')}
                    >
                        METHA<span className="text-primary">Desk</span>{' '}
                        <span className="font-light text-muted-foreground text-sm align-top">pro</span>
                    </span>

                    {/* Projekte button — icon-only square, same height as ProjectBanner (h-10) */}
                    {showBanner && (
                        <button
                            onClick={() => router.push('/projekte')}
                            aria-label="Zur Projektauswahl"
                            title="Zur Projektauswahl"
                            className="hidden lg:flex items-center justify-center h-10 w-10 ml-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all shrink-0 shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95"
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* ── ZONE CENTER: Project Banner ── */}
                <div className="flex items-center justify-center h-full min-w-0 px-3">
                    {showBanner && (
                        <div className="hidden md:flex w-full max-w-5xl min-w-0">
                            {projectBanner}
                        </div>
                    )}
                </div>

                {/* ── ZONE RIGHT: User + Support + Logout ── */}
                <div className="flex items-center gap-3 h-full px-4 sm:pr-6 shrink-0">
                    {currentUser && (
                        <div
                            className="flex items-center gap-3 pr-2 border-r h-8 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push('/profil')}
                            title="Profil öffnen"
                        >
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-foreground leading-none">
                                    {currentUser.vorname} {currentUser.nachname}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                    {currentUser.role}
                                </span>
                            </div>
                            <UserAvatar
                                profileImageUrl={currentUser.profileImageUrl}
                                initials={getUserInitials(currentUser.vorname, currentUser.nachname)}
                                sizeClass="h-8 w-8"
                                textClass="text-xs"
                                shape="circle"
                            />
                        </div>
                    )}
                    <SupportChat />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => logout()}
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>

            </div>
        </header>
    );
}

