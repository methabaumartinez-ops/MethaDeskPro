'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Sparkles, Layout, Cpu, Zap, Workflow, History, Clock, ListTodo
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardBuilderChat } from '@/components/dashboard/DashboardBuilderChat';
import { useProjekt } from '@/lib/context/ProjektContext';
import { DashboardService } from '@/lib/services/dashboardService';
import { DashboardRequest } from '@/types';
import { cn } from '@/lib/utils';

export default function MyDashboardPage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser } = useProjekt();
    const [requests, setRequests] = useState<DashboardRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);


    useEffect(() => {
        const loadRequests = async () => {
            if (!currentUser?.id) return;
            try {
                const data = await DashboardService.getRequests(currentUser.id);
                setRequests(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (error) {
                console.error("Error loading requests:", error);
            } finally {
                setLoadingHistory(false);
            }
        };
        loadRequests();

        const interval = setInterval(loadRequests, 10000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const examples = [
        {
            title: "Beispiel 1: Montage-Monitor",
            text: "Ich möchte ein Widget, das alle Teilsysteme (TS) anzeigt, deren Montagetermin in den nächsten 2 Wochen liegt."
        },
        {
            title: "Beispiel 2: Lager-Logistik Monitor",
            text: "Erstelle ein Widget, das alle Teilsysteme auflistet, die aktuell dem Lagerort 'Baustelle' zugeordnet sind."
        }
    ];

    const features = [
        { icon: Layout, title: "Personalisierbar", desc: "Passen Sie Ihre Arbeitsumgebung exakt an Ihre Bedürfnisse an. Ein massgeschneidertes Dashboard hilft Ihnen, genau die Kennzahlen im Blick zu behalten, die für Ihre spezifische Rolle und täglichen Entscheidungen im Projekt entscheidend sind." },
        { icon: Cpu, title: "KI-gestützter Builder", desc: "Nutzen Sie modernste Sprachmodelle, um komplexe Datenvisualisierungen zu beauftragen. Beschreiben Sie einfach Ihr Ziel, und unser System entwirft die passende Lösung, ohne dass Sie komplizierte Filter selbst konfigurieren müssen." },
        { icon: Zap, title: "Echtzeit-Anpassung", desc: "Sobald ein Widget validiert und freigegeben ist, steht es Ihnen sofort zur Verfügung. Sie profitieren von einer dynamischen Plattform, die mit Ihren Anforderungen mitwächst und stets aktuelle Informationen liefert." },
        { icon: Workflow, title: "Volle Integration", desc: "Gewährleisten Sie einen lückenlosen Informationsfluss. Der Dashboard-Builder ist mit allen Modulen wie Teilsystemen, Lagerorten und Maschinen vernetzt, um Ihnen eine ganzheitliche Projektsicht zu ermöglichen." }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20 max-w-7xl mx-auto">

            {/* ONBOARDING BANNER - Minimalist */}
            <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-6 border border-white/5 shadow-lg group">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/20 text-primary border-primary/20 font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full text-[8px]">
                                In Entwicklung
                            </Badge>
                            <span className="text-white/20 text-[8px] font-black uppercase tracking-widest">v0.1 Pre-Alpha</span>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
                            My Dashboard <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                                KI-Constructor
                            </span>
                        </h1>

                        <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-sm opacity-80">
                            Beschreiben Sie Ihr gewünschtes Dashboard oder spezifische Widgets einfach in natürlicher Sprache. Um höchste Qualität zu gewährleisten, wird jede Anfrage zunächst von unserer KI-Abteilung auf technische Machbarkeit geprüft, bevor die Implementierung erfolgt.
                        </p>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2">
                        <div className="flex -space-x-1.5 opacity-60">
                            {[1, 2, 3].map(i => (
                                <div key={`avatar-${i}`} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800" />
                            ))}
                        </div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">+50 Anfragen</span>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* FEATURES GRID */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {features.map((f) => (
                            <Card key={f.title} className="bg-white/40 dark:bg-slate-900/40 border-slate-100/50 dark:border-slate-800/50 shadow-sm rounded-xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all">
                                <CardContent className="p-4 flex gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                                        <f.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-xs mb-0.5">{f.title}</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium leading-normal">{f.desc}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* WORKFLOW SUMMARY */}
                    <Card className="bg-primary/5 border border-primary/10 shadow-none rounded-xl p-5">
                        <h3 className="text-[10px] font-black text-primary mb-4 uppercase tracking-widest">
                            Prozess-Workflow
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { step: "1", text: "Task definieren" },
                                { step: "2", text: "Chat-Bedarf" },
                                { step: "3", text: "KI-Validierung und Modellierung" },
                                { step: "4", text: "Integration" }
                            ].map((s) => (
                                <div key={`step-${s.step}`} className="flex flex-col items-center text-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-white text-primary text-[9px] font-black flex items-center justify-center border border-primary/10">{s.step}</span>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tight leading-none">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* SIDEBAR: EXAMPLES & HISTORY */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl p-5 shadow-inner">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sparkles size={12} className="text-primary" />
                            Anwendung
                        </h3>
                        <div className="space-y-3">
                            {examples.map((ex) => (
                                <div key={ex.title} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-primary/20 transition-all cursor-pointer">
                                    <h5 className="text-[9px] font-black text-primary uppercase mb-1">{ex.title}</h5>
                                    <p className="text-[10px] text-slate-500 italic font-medium leading-tight">"{ex.text}"</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-white dark:bg-card border-slate-100 dark:border-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col max-h-[300px]">
                        <CardHeader className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <History size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-500">History</span>
                            </div>
                            <Badge className="bg-slate-200 text-slate-600 border-none font-black text-[8px] h-4">{requests.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="p-8 flex justify-center">
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                </div>
                            ) : requests.length > 0 ? (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {requests.map(req => (
                                        <div key={req.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[9px] font-bold text-slate-700 truncate pr-2">{req.title}</span>
                                                <Badge className={cn(
                                                    "text-[7px] font-black uppercase h-3.5",
                                                    req.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                                                )}>
                                                    {req.status === 'pending' ? '...' : 'OK'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase">
                                                <Clock size={8} />
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center opacity-40">
                                    <ListTodo className="w-6 h-6 mx-auto mb-2" />
                                    <p className="text-[9px] font-bold uppercase">Leer</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Dashboard Builder Chat - Now Floating with Pulse Attention */}
            <DashboardBuilderChat
                userId={currentUser?.id || ''}
                projektId={projektId}
                isFloating={true}
            />
        </div>
    );
}
