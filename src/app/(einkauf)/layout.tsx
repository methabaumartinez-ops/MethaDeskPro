'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectBanner } from '@/components/layout/ProjectBanner';
import { ProjectService } from '@/lib/services/projectService';
import { cn } from '@/lib/utils';
import { Signature } from '@/components/shared/Signature';

export default function EinkaufLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [projektId, setProjektId] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            const projekte = await ProjectService.getProjekte();
            if (projekte.length > 0) {
                setProjektId(projekte[0].id);
            }
        };
        load();
    }, []);

    const headerOffset = '3.5rem';

    return (
        <div className="min-h-screen bg-background transition-colors">
            <Header
                onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                projectBanner={projektId ? <ProjectBanner /> : undefined}
            />

            <div className="flex" style={{ paddingTop: headerOffset }}>
                {projektId && (
                    <div className="fixed left-0 z-30 hidden lg:flex" style={{ top: headerOffset, bottom: 0 }}>
                        <Sidebar projektId={projektId} className="h-full" />
                    </div>
                )}

                <main className="flex-1 lg:ml-64 flex flex-col overflow-x-hidden" style={{ minHeight: `calc(100vh - ${headerOffset})` }}>
                    <div className="p-[1cm] w-full flex-1">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/50 lg:hidden pointer-events-auto"
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
