'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, FolderSync, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SupportChat } from '@/components/shared/SupportChat';

export function Header({ onMenuClick, hideProjectInfo = false }: { onMenuClick?: () => void, hideProjectInfo?: boolean }) {
    const { activeProjekt, currentUser, logout } = useProjekt();
    const router = useRouter();

    const handleLogout = () => {
        logout();
    };


    return (
        <header className="fixed top-0 z-50 w-full border-b bg-white dark:bg-slate-950 transition-colors shadow-sm">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="hidden text-xl font-bold tracking-tight text-foreground sm:block cursor-pointer" onClick={() => router.push('/welcome')}>
                            METHA<span className="text-primary">Desk</span> <span className="font-light text-muted-foreground text-sm align-top">pro</span>
                        </span>
                    </div>

                    {activeProjekt && !hideProjectInfo && (
                        <div className="hidden items-center gap-2 ml-8 lg:flex">
                            <div className="h-4 w-[1px] bg-border mx-2" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Aktives Projekt</span>
                                <span className="text-sm font-bold text-foreground">{activeProjekt.projektname}</span>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                className="h-9 ml-4 gap-2 font-bold shadow-sm hover:scale-105 transition-transform"
                                onClick={() => router.push('/projekte')}
                            >
                                <FolderSync className="h-4 w-4" />
                                <span>Projekt wechseln</span>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 relative">
                    {currentUser && (
                        <div
                            className="flex items-center gap-3 pr-2 border-r h-8 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => router.push('/profil')}
                            title="Profil öffnen"
                        >
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-foreground leading-none">{currentUser.vorname} {currentUser.nachname}</span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">{currentUser.role}</span>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border">
                                <User className="h-4 w-4 text-foreground/70" />
                            </div>
                        </div>
                    )}


                    <SupportChat />

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
