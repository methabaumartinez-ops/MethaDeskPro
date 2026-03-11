'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProjectService } from '@/lib/services/projectService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { TeamService } from '@/lib/services/teamService';
import { Projekt, Teilsystem, Team } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getStatusStyle } from '@/lib/config/statusConfig';
import { Loader2, Layers, Users, MapPin, Hash, CheckCircle2, CircleDashed, Wrench } from 'lucide-react';

export default function ProjectOverviewPage() {
    const { projektId } = useParams() as { projektId: string };
    
    const [project, setProject] = useState<Projekt | null>(null);
    const [teilsysteme, setTeilsysteme] = useState<Teilsystem[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        async function loadData() {
            setLoading(true);
            try {
                const [projData, tsData, teamsData] = await Promise.all([
                    ProjectService.getProjektById(projektId),
                    SubsystemService.getTeilsysteme(projektId),
                    TeamService.getTeams(projektId)
                ]);
                
                if (isMounted) {
                    setProject(projData);
                    setTeilsysteme(tsData);
                    setTeams(teamsData);
                }
            } catch (error) {
                console.error("Failed to load project overview data", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        
        loadData();
        return () => { isMounted = false; };
    }, [projektId]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-muted-foreground">
                Projekt nicht gefunden.
            </div>
        );
    }
    
    // Aggregations
    const totalTS = teilsysteme.length;
    const tsByStatus = teilsysteme.reduce((acc, ts) => {
        const s = ts.status || 'offen';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const countOffen = tsByStatus['offen'] || 0;
    const countInArbeit = tsByStatus['in_arbeit'] || tsByStatus['in_produktion'] || 0;
    const countFertig = tsByStatus['fertig'] || tsByStatus['abgeschlossen'] || 0;
    
    const totalWorkers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const projectStatusStyle = getStatusStyle(project.status);

    const getProjectImage = (p: Projekt) => {
        if (p.imageUrl) {
            if (p.imageUrl.includes('drive.google.com')) {
                return `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}`;
            }
            return p.imageUrl;
        }
        return '';
    };

    return (
        <div className="container p-6 mx-auto space-y-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Project Header Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* BLOCK 1: Image */}
                <Card className="relative flex flex-col items-center justify-center overflow-hidden border-none shadow-md min-h-[220px] bg-slate-100 dark:bg-slate-800">
                     {project.imageUrl ? (
                         <img src={getProjectImage(project)} alt={project.projektname} className="absolute inset-0 object-cover w-full h-full" />
                     ) : (
                         <Layers className="absolute w-32 h-32 opacity-10 text-slate-500" />
                     )}
                </Card>

                {/* BLOCK 2: Project Number & Name */}
                <Card className="flex flex-col items-center justify-center p-6 text-center bg-white border-none shadow-md dark:bg-slate-900/60">
                     <div className="px-6 py-2 mb-4 text-lg font-bold border rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm">
                         {project.projektname}
                     </div>
                     <p className="mb-1 text-xs font-black tracking-widest uppercase text-slate-400">Projekt-Nr.</p>
                     <p className="mb-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{project.projektnummer || '—'}</p>
                     
                     <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${projectStatusStyle.bgColor} ${projectStatusStyle.textColor} ${projectStatusStyle.borderColor || ''}`}>
                         {projectStatusStyle.label}
                     </div>
                </Card>

                {/* BLOCK 3: Responsible Roles */}
                <Card className="flex flex-col p-6 bg-white border-none shadow-md dark:bg-slate-900/60">
                     <h3 className="pb-3 mb-4 text-xs font-black tracking-widest uppercase border-b text-slate-400 border-border/50">Projektverantwortliche</h3>
                     <div className="flex flex-col justify-center flex-1 space-y-4">
                         <div className="flex items-center justify-between">
                             <span className="text-sm font-semibold text-slate-500">Projektleiter</span>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{project.projektleiter || '—'}</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <span className="text-sm font-semibold text-slate-500">Bauleiter</span>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{project.bauleiter || '—'}</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <span className="text-sm font-semibold text-slate-500">Polier</span>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{project.polier || '—'}</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <span className="text-sm font-semibold text-slate-500">BIM Zeichner</span>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{project.bimKonstrukteur || '—'}</span>
                         </div>
                     </div>
                </Card>
            </div>

            {/* 2. Production Stats Row */}
            <h3 className="px-2 mt-8 text-sm font-black tracking-widest uppercase text-slate-500">Produktionsanalyse</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total TS */}
                <Card className="border-none shadow-sm dark:bg-slate-900/40">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Teilsysteme</p>
                                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalTS}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <Layers className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Offen */}
                <Card className="border-none shadow-sm dark:bg-slate-900/40">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-500">Offen</p>
                                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{countOffen}</p>
                            </div>
                            <div className="p-3 text-green-500 bg-green-100 rounded-xl dark:bg-green-900/30">
                                <CircleDashed className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* In Arbeit */}
                <Card className="border-none shadow-sm dark:bg-slate-900/40">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-500">In Arbeit</p>
                                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{countInArbeit}</p>
                            </div>
                            <div className="p-3 text-blue-500 bg-blue-100 rounded-xl dark:bg-blue-900/30">
                                <Wrench className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Fertig */}
                <Card className="border-none shadow-sm dark:bg-slate-900/40">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fertig</p>
                                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{countFertig}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Details Row (Workers & Status Bars) */}
            <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
                
                {/* Visual Status Breakdown */}
                <Card className="flex flex-col border-none shadow-md overflow-hidden bg-white dark:bg-slate-900/60">
                    <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-border/50 py-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <Layers className="w-4 h-4 text-[#ff6b35]" />
                            </div>
                            <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-300">TS Übersicht nach Status</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 flex-1 flex flex-col justify-center">
                        {totalTS === 0 ? (
                            <div className="text-center py-8 text-sm text-slate-500">
                                Keine Teilsysteme vorhanden
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {Object.entries(tsByStatus)
                                    .sort(([, a], [, b]) => b - a)
                                    .slice(0, 5) // top 5 statuses
                                    .map(([statusKey, count]) => {
                                        const style = getStatusStyle(statusKey);
                                        const pct = Math.round((count / totalTS) * 100);
                                        return (
                                            <div key={statusKey} className="space-y-1.5">
                                                <div className="flex justify-between text-sm font-semibold">
                                                    <span className={`flex items-center gap-2 ${style.iconColor}`}>
                                                        <span className={`w-2 h-2 rounded-full ${style.bgColor}`}></span>
                                                        {style.label}
                                                    </span>
                                                    <span className="text-slate-600 dark:text-slate-400">{count} ({pct}%)</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${style.bgColor.replace('/30', '').replace('/40', '')}`} 
                                                        style={{ width: `${pct}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Workers / Teams Involved */}
                <Card className="flex flex-col border-none shadow-md overflow-hidden bg-white dark:bg-slate-900/60">
                    <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-border/50 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <Users className="w-4 h-4 text-blue-500" />
                                </div>
                                <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-300">Beteiligtes Personal</CardTitle>
                            </div>
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black text-xs px-2.5 py-1 rounded-full">
                                {totalWorkers} Zuweisungen
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden flex-1">
                        {teams.length === 0 ? (
                            <div className="text-center py-12 text-sm text-slate-500 h-full flex items-center justify-center">
                                Keine Teams dem Projekt zugewiesen
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50 h-full max-h-[250px] overflow-y-auto">
                                {teams.map(team => (
                                    <div key={team.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{team.name}</p>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{team.members?.length || 0} Mitglieder</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{team.description || 'Keine Beschreibung'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                
            </div>
        </div>
    );
}
