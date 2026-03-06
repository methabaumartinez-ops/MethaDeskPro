'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectBanner } from '@/components/layout/ProjectBanner';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ProjectService } from '@/lib/services/projectService';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import { ChatAssistant } from '@/components/shared/ChatAssistant';
import { ChatProvider } from '@/lib/context/ChatContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { projektId } = useParams() as { projektId: string };
    const { setActiveProjekt, activeProjekt, loading } = useProjekt();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const validateProject = async () => {
            if (!loading && !activeProjekt) {
                // Try to fetch project from Supabase
                try {
                    const project = await ProjectService.getProjektById(projektId);
                    if (project) {
                        setActiveProjekt(project);
                    } else {
                        // Project not found, redirect
                        router.push('/projekte');
                    }
                } catch (error) {
                    console.error("Failed to validate project:", error);
                    router.push('/projekte');
                }
            }
        };

        validateProject();
    }, [projektId, activeProjekt, loading, setActiveProjekt, router]);

    if (loading || !activeProjekt) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const isMyDashboard = pathname?.includes('/my-dashboard') || pathname?.includes('/dashboard-builder');
    const isGlobalPage = pathname?.includes('/chat') ||
        pathname?.includes('/my-dashboard') ||
        pathname?.includes('/dashboard-builder') ||
        pathname?.includes('/werkhof') ||
        pathname?.includes('/mitarbeiter') ||
        pathname?.includes('/lieferanten') ||
        pathname?.includes('/fuhrpark') ||
        pathname?.includes('/tabellen');

    // Header height is strictly 3.5rem (56px) universally
    const headerOffset = '3.5rem';

    return (
        <ChatProvider>
        <div className="min-h-screen bg-background transition-colors">
            <Header
                onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                hideProjectInfo={isGlobalPage}
                projectBanner={!isGlobalPage ? <ProjectBanner /> : undefined}
            />

            <div className="flex" style={{ paddingTop: headerOffset }}>
                {/* Sidebar wrapper — positioned below the dynamic header */}
                <div
                    className="fixed left-0 z-30 hidden lg:flex"
                    style={{ top: headerOffset, bottom: 0 }}
                >
                    <Sidebar projektId={projektId} className="h-full" />
                </div>

                <main
                    className="flex-1 lg:ml-64 flex flex-col overflow-x-hidden"
                    style={{ minHeight: `calc(100vh - ${headerOffset})` }}
                >
                    <div className="p-[1cm] w-full flex-1">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/90 lg:hidden pointer-events-auto"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
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

            {/* Global Chat Assistant - Hidden on My Dashboard and Dashboard Builder to avoid overlap */}
            {!isMyDashboard && (
                <ChatAssistant />
            )}
        </div>
        </ChatProvider>
    );
}
