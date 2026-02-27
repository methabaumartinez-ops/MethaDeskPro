'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Sparkles,
    ArrowRight,
    Building2,
    Cpu,
    Briefcase,
    Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ProjectService } from '@/lib/services/projectService';
import { Signature } from '@/components/shared/Signature';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

export default function WelcomePage() {
    const { currentUser, loading } = useProjekt();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [firstProjectId, setFirstProjectId] = useState<string>('methabau');
    const router = useRouter();

    useEffect(() => {
        async function fetchFirstProject() {
            try {
                const projects = await ProjectService.getProjekte();
                if (projects && projects.length > 0) {
                    setFirstProjectId(projects[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch projects for welcome links:", error);
            }
        }
        fetchFirstProject();
    }, []);

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
            <Header
                onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                hideProjectInfo={true}
            />

            <div className="flex pt-16">
                <Sidebar
                    projektId={firstProjectId}
                    className="fixed left-0 top-16 z-30 hidden lg:block"
                    forceProjectSelection={true}
                />

                <main className="flex-1 lg:ml-64 relative z-10 flex flex-col items-center justify-center px-4 py-12 min-h-[calc(100vh-4rem)]">
                    {/* Background Decorations */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />

                    <div className="max-w-4xl w-full space-y-12 relative z-20">
                        {/* Welcome Text */}
                        <div className="text-center space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Willkommen zurück</h2>
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none">
                                Was machen wir <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                                    heute als Nächstes?
                                </span>
                            </h1>
                            <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
                                Wähle deinen Arbeitsbereich. Wir sind bereit, deine Projekte effizienter zu gestalten.
                            </p>
                        </div>

                        {/* Main Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                            {/* ACTION 1: PROJECTS */}
                            <Card
                                className="group relative overflow-hidden bg-white border-2 border-slate-100 shadow-2xl hover:border-primary/40 transition-all duration-500 cursor-pointer rounded-[2.5rem]"
                                onClick={() => router.push('/projekte')}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                                <CardContent className="p-10 flex flex-col items-center text-center space-y-6 relative z-10">
                                    <div className="p-5 bg-primary/10 rounded-[2rem] text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <Briefcase size={40} className="stroke-[2.5]" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900">Arbeiten am Projekt</h3>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                            Wähle ein Proyecto aus, verwalte Teilsysteme, Positionen und steuere deine Baustellen.
                                        </p>
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                                        Projekte öffnen <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* ACTION 2: DASHBOARD */}
                            <Card
                                className="group relative overflow-hidden bg-slate-900 border-none shadow-2xl transition-all duration-500 cursor-pointer rounded-[2.5rem]"
                                onClick={() => router.push(`/${firstProjectId}/my-dashboard`)}
                            >
                                <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/10 blur-3xl rounded-full -mb-24 -mr-24" />
                                <CardContent className="p-10 flex flex-col items-center text-center space-y-6 relative z-10">
                                    <div className="p-5 bg-white/10 rounded-[2rem] text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <Sparkles size={40} className="stroke-[2.5]" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white">Mein Dashboard</h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Nutze den KI-Builder, um deine repetitiven Aufgaben zu automatisieren und Widgets zu erstellen.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-white/20 text-white hover:bg-white hover:text-slate-900 transition-all"
                                    >
                                        Constructor öffnen <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Footer Info */}
                        <div className="flex flex-col items-center gap-6 pt-8">
                            <div className="flex items-center gap-8 opacity-40">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">METHABAU Infrastructure</span>
                                </div>
                                <div className="h-1 w-1 rounded-full bg-slate-400" />
                                <div className="flex items-center gap-2">
                                    <Cpu size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Powered Engine</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm lg:hidden pointer-events-auto mt-16"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 shadow-2xl transition-transform duration-300 lg:hidden border-r flex flex-col mt-16",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex-1 overflow-hidden">
                        <Sidebar
                            projektId={firstProjectId}
                            className="w-full h-full border-none"
                            forceProjectSelection={true}
                        />
                    </div>
                </div>
            </div>

            <footer className="py-12 border-t border-slate-200/50 bg-white/30 backdrop-blur-sm self-stretch flex flex-col items-center lg:ml-64 relative z-20">
                <div className="mb-6">
                    <Signature />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    © {new Date().getFullYear()} METHABAU AG. PRO-SUITE v1.3
                </p>
            </footer>
        </div>
    );
}
