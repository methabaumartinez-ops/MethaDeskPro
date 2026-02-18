'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { mockStore } from '@/lib/mock/store';
import { cn } from '@/lib/utils';

export default function FuhrparkLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [projektId, setProjektId] = useState<string>('');

    useEffect(() => {
        const active = mockStore.getActiveProjekt();
        if (active) {
            setProjektId(active.id);
        } else {
            const projekte = mockStore.getProjekte();
            if (projekte.length > 0) {
                setProjektId(projekte[0].id);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-background transition-colors">
            <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

            <div className="flex pt-16">
                {projektId && <Sidebar projektId={projektId} className="fixed left-0 top-16 z-30 hidden lg:block" />}

                <main className="flex-1 lg:ml-64 min-h-[calc(100vh-4rem)] overflow-x-hidden">
                    <div className="p-4 sm:p-6 lg:p-8 w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm lg:hidden pointer-events-auto"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            {projektId && (
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 shadow-2xl transition-transform duration-300 lg:hidden border-r flex flex-col",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex h-16 items-center border-b px-6">
                        <span className="text-xl font-bold text-foreground">Menü</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <Sidebar projektId={projektId} className="w-full h-full border-none" />
                    </div>
                </div>
            )}
        </div>
    );
}
