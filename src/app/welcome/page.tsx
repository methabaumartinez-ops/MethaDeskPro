'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Cpu,
    Briefcase,
    Sparkles,
    ArrowRight
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
    const { loading } = useProjekt();
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

                <main className="flex-1 lg:ml-64 relative z-10 flex flex-col items-center justify-center px-4 py-8 min-h-[calc(100vh-4rem)]">
                    {/* Background Decorations */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />

                    <div className="max-w-2xl w-full space-y-7 relative z-20">
                        {/* Welcome Text */}
                        <div className="text-center space-y-2">
                            <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Willkommen zurück</h2>
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                                Was machen wir <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                                    heute als Nächstes?
                                </span>
                            </h1>
                            <p className="text-[13px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed opacity-80">
                                Wähle deinen Arbeitsbereich. Wir sind bereit, deine Projekte effizienter zu gestalten.
                            </p>
                        </div>

                        {/* Main Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4">
                            {/* ACTION 1: PROJECTS */}
                            <Card
                                className="group relative overflow-hidden bg-white border border-slate-100 shadow-xl hover:border-primary/30 transition-all duration-500 cursor-pointer rounded-2xl"
                                onClick={() => router.push('/projekte')}
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                                <CardContent className="p-5 flex flex-col items-center text-center space-y-3 relative z-10">
                                    <div className="p-3.5 bg-primary/5 rounded-xl text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <Briefcase size={28} className="stroke-[2.5]" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Arbeiten am Projekt</h3>
                                        <p className="text-[12px] text-slate-500 font-medium leading-tight opacity-70">
                                            Wähle ein Projekt aus, verwalte Teilsysteme, Positionen und steuere deine Baustellen.
                                        </p>
                                    </div>
                                    <Button className="w-full h-9 rounded-lg font-black uppercase tracking-widest group-hover:shadow-lg group-hover:shadow-primary/20 transition-all text-[10px]">
                                        Projekte öffnen <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* ACTION 2: DASHBOARD */}
                            <Card
                                className="group relative overflow-hidden bg-slate-900 border-none shadow-xl transition-all duration-500 cursor-pointer rounded-2xl"
                                onClick={() => router.push(`/${firstProjectId}/my-dashboard`)}
                            >
                                <div className="absolute bottom-0 right-0 w-28 h-28 bg-primary/10 blur-2xl rounded-full -mb-14 -mr-14" />
                                <CardContent className="p-5 flex flex-col items-center text-center space-y-3 relative z-10">
                                    <div className="p-3.5 bg-white/5 rounded-xl text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                        <Sparkles size={28} className="stroke-[2.5]" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black text-white tracking-tight">Mein Dashboard</h3>
                                        <p className="text-[12px] text-slate-400 font-medium leading-tight opacity-70">
                                            Nutze den KI-Builder, um deine repetitiven Aufgaben zu automatisieren und Widgets zu erstellen.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full h-9 rounded-lg font-black uppercase tracking-widest border-white/10 text-white hover:bg-white hover:text-slate-900 transition-all text-[10px]"
                                    >
                                        Constructor öffnen <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Footer Info */}
                        <div className="flex flex-col items-center gap-6 pt-4">
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

            <footer className="py-6 bg-white/30 backdrop-blur-sm self-stretch flex flex-row items-end justify-between px-8 lg:ml-64 relative z-20">
                <Signature />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-60">
                    © {new Date().getFullYear()} METHABAU AG. v1.3
                </p>
            </footer>
        </div>
    );
}
