'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SupportChat } from '@/components/shared/SupportChat';
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
            <div className={cn(
                'flex items-center px-4 sm:px-0 sm:pr-6',
                showBanner ? 'py-2 gap-3 lg:gap-0' : 'h-14 gap-3 lg:gap-0 lg:px-0'
            )}>
                {/* Left section: exactly matches Sidebar width (w-64 = 256px) on lg screens */}
                <div className={cn(
                    "flex items-center gap-3 shrink-0 h-full",
                    // En móvil: padding normal. En lg: 256px de ancho exacto, con border derecho para alinear con el sidebar.
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
                </div>

                {/* Banner wrapper: aligned to main content start (p-[1cm] from main layout) */}
                {showBanner && (
                    <div className="flex-1 min-w-0 lg:pl-[1cm] pr-6 lg:pr-20">
                        {projectBanner}
                    </div>
                )}

                {/* If no banner, spacer pushes user actions right */}
                {!showBanner && <div className="flex-1" />}

                {/* Right: user + support + logout */}
                <div className="flex items-center gap-3 shrink-0 lg:pr-[1cm]">
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border">
                                <User className="h-4 w-4 text-foreground/70" />
                            </div>
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

