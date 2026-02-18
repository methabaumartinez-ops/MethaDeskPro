'use client';

import React from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, FolderSync, Menu, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import { mockStore } from '@/lib/mock/store'; // Removed

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const { activeProjekt, currentUser, logout } = useProjekt();
    const router = useRouter();

    const handleLogout = () => {
        logout();
    };

    const [showConfig, setShowConfig] = React.useState(false);
    const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('light');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            setTheme('light');
        }
    }, []);

    React.useEffect(() => {
        if (!mounted) return;
        const root = window.document.documentElement;

        const applyTheme = (t: 'light' | 'dark' | 'system') => {
            root.classList.remove('dark');

            if (t === 'dark') {
                root.classList.add('dark');
            } else if (t === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                if (systemTheme === 'dark') root.classList.add('dark');
            }
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    return (
        <header className="fixed top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md transition-colors">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="hidden text-xl font-bold tracking-tight text-foreground sm:block cursor-pointer" onClick={() => router.push('/projekte')}>
                            METHA<span className="text-primary">Desk</span> <span className="font-light text-muted-foreground text-sm align-top">pro</span>
                        </span>
                    </div>

                    {activeProjekt && (
                        <div className="hidden items-center gap-2 ml-8 lg:flex">
                            <div className="h-4 w-[1px] bg-border mx-2" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Aktives Projekt</span>
                                <span className="text-sm font-bold text-foreground">{activeProjekt.projektname}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 ml-2 gap-2 text-muted-foreground hover:text-primary"
                                onClick={() => router.push('/projekte')}
                            >
                                <FolderSync className="h-3.5 w-3.5" />
                                <span>Wechseln</span>
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

                    {/* Config Menu */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`text-muted-foreground hover:text-foreground ${showConfig ? 'bg-accent' : ''}`}
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>

                        {showConfig && (
                            <div className="absolute right-0 top-12 w-48 bg-popover rounded-xl shadow-xl border p-2 animate-in fade-in slide-in-from-top-2 z-50">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1 mb-1">Darstellung</div>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { setTheme('light'); setShowConfig(false); }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${theme === 'light' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:bg-accent'}`}
                                    >
                                        <Sun className="h-4 w-4" />
                                        <span>Hell</span>
                                    </button>
                                    <button
                                        onClick={() => { setTheme('dark'); setShowConfig(false); }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${theme === 'dark' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:bg-accent'}`}
                                    >
                                        <Moon className="h-4 w-4" />
                                        <span>Dunkel</span>
                                    </button>
                                    <button
                                        onClick={() => { setTheme('system'); setShowConfig(false); }}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${theme === 'system' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/70 hover:bg-accent'}`}
                                    >
                                        <Monitor className="h-4 w-4" />
                                        <span>System</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
