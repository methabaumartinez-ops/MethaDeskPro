'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, ListTodo, Package, Users, Plus, ArrowUpRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';

export default function OverviewPage() {
    const { projektId } = useParams() as { projektId: string };
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ teilsysteme: 0, positionen: 0, material: 0, beteiligte: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const [tsCount, posCount, matCount, activities, project] = await Promise.all([
                    SubsystemService.getTeilsystemCount(projektId),
                    SubsystemService.getPositionCount(projektId),
                    SubsystemService.getMaterialCount(projektId),
                    SubsystemService.getRecentActivity(projektId),
                    ProjectService.getProjektById(projektId)
                ]);

                // Calculate participants from project roles
                let teamCount = 0;
                if (project) {
                    if (project.bauleiter) teamCount++;
                    if (project.projektleiter) teamCount++;
                    if (project.polier) teamCount++;
                    if (project.bimKonstrukteur) teamCount++;
                }

                setCounts({
                    teilsysteme: tsCount,
                    positionen: posCount,
                    material: matCount,
                    beteiligte: teamCount
                });
                setRecentActivity(activities);

            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (projektId) {
            loadDashboardData();
        }
    }, [projektId]);

    const stats = [
        { label: 'Teilsysteme', value: counts.teilsysteme.toString(), sub: 'Gesamt', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Positionen', value: counts.positionen.toString(), sub: 'Gesamt', icon: ListTodo, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Material', value: counts.material.toString(), sub: 'Gesamt', icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Beteiligte', value: counts.beteiligte.toString(), sub: 'Projektteam', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Übersicht</h1>
                    <p className="text-muted-foreground font-medium mt-1">Status und aktuelle Aktivitäten Ihres Projekts.</p>
                </div>
                <div className="flex gap-3">
                    <Link href={`/${projektId}/teilsysteme/erfassen`}>
                        <Button size="sm" className="font-bold">
                            <Plus className="h-4 w-4 mr-2" />
                            Teilsystem
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? Array(4).fill(0).map((_, i) => (
                    <Card key={i} className="animate-pulse bg-muted h-32" />
                )) : stats.map((stat, i) => (
                    <Card key={i} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-3xl font-black text-foreground">{stat.value}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs font-bold text-muted-foreground">
                                <span className="text-green-600 flex items-center mr-1">
                                    <ArrowUpRight className="h-3 w-3" />
                                    {stat.sub}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Letzte Aktivitäten
                        </CardTitle>
                        {/* Link to reports if it exists, otherwise hide */}
                        {/* <Link href={`/${projektId}/berichte`}>
                            <Button variant="ghost" size="sm" className="font-bold text-primary">Alle anzeigen</Button>
                        </Link> */}
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {loading ? (
                                <div className="space-y-4">
                                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
                                </div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">Keine kÃ¼rzlichen AktivitÃ¤ten.</div>
                            ) : recentActivity.map((act, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center border border-border group-hover:bg-primary/10 transition-colors">
                                            <ListTodo className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{act.action}: <span className="text-primary">{act.target}</span></p>
                                            <p className="text-xs font-medium text-muted-foreground">{new Date(act.time).toLocaleDateString('de-CH')} {new Date(act.time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <Link href={act.link}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-primary hover:bg-primary/10">
                                            <ArrowUpRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href={`/${projektId}/teilsysteme/erfassen`} className="block">
                            <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                <Layers className="h-5 w-5 text-primary" />
                                <span>Teilsystem erfassen</span>
                            </Button>
                        </Link>
                        <Link href={`/${projektId}/positionen/erfassen`} className="block">
                            <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                <ListTodo className="h-5 w-5 text-primary" />
                                <span>Position erfassen</span>
                            </Button>
                        </Link>
                        <Link href={`/${projektId}/material/erfassen`} className="block">
                            <Button variant="outline" className="w-full justify-start h-12 gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all">
                                <Package className="h-5 w-5 text-primary" />
                                <span>Material erfassen</span>
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
