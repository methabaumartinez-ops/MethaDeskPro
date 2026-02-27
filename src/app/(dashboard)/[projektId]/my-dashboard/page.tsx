'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Sparkles, PanelTop, Layout, Cpu, Database,
    Workflow, Zap, MessageSquare, ListTodo, History, Clock, CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    const [isChatOpen, setIsChatOpen] = useState(true);

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

        // Refresh interval for live feedback
        const interval = setInterval(loadRequests, 10000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    const examples = [
        {
            title: "Beispiel 1: Montage-Monitor",
            text: "Ich möchte ein Widget, das alle Teilsysteme (TS) anzeigt, deren Montagetermin in den nächsten 2 Wochen liegt. Ich möchte die Projektnummer, den TS-Namen und das Datum sehen und die Termine direkt im Dashboard bearbeiten können."
        },
        {
            title: "Beispiel 2: Dokumenten-Wächter",
            text: "Ich möchte einen Container, in dem ich Dokumente hochladen kann und das System erkennt automatisch, ob es sich um Sicherheitslisten oder Lieferscheine handelt."
        }
    ];

    const features = [
        { icon: Layout, title: "Personalisierbarer Bereich", desc: "Jeder in unserem Team erhält sein eigenes, massgeschneidertes Dashboard." },
        { icon: Cpu, title: "KI-gestützter Builder", desc: "Erstell komplexe Widgets einfach im Gespräch mit nuestro asistente." },
        { icon: Zap, title: "Dynamische Generierung", desc: "Die Benutzeroberfläche passt sich in Echtzeit deinen Bedürfnissen an." },
        { icon: Workflow, title: "Vollständige Integration", desc: "Verbindet Dokumente und Prozesse direkt in Methadesk." }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">

            {/* ONBOARDING BANNER */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-white/10 group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -mr-40 -mt-40 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-orange-500/10 blur-[80px] rounded-full -ml-20 -mb-20" />

                <div className="relative z-10">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-primary/20 text-primary border-primary/30 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
                                In Entwicklung
                            </Badge>
                            <div className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">v0.1 Pre-Alpha</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                            My Dashboard <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                                KI-Constructor
                            </span>
                        </h1>

                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">
                            Wir bauen ein revolutionäres Tool, mit dem du deine eigene Arbeitsoberfläche
                            mittels natürlicher Sprache erstellen kannst. Kein Code, keine Komplikationen.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">+50 Anfragen diese Woche</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLOATING CHAT WIDGET */}
            <div className={cn(
                "fixed bottom-8 right-8 z-[100] transition-all duration-500 transform",
                isChatOpen ? "w-[400px] translate-y-0 opacity-100" : "w-16 h-16 translate-y-2 opacity-90"
            )}>
                {isChatOpen ? (
                    <div className="relative group">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-3 -right-3 z-[110] bg-slate-900 text-white rounded-full h-8 w-8 shadow-xl hover:bg-primary transition-colors border-2 border-white"
                            onClick={() => setIsChatOpen(false)}
                        >
                            <PanelTop className="h-4 w-4" />
                        </Button>
                        <DashboardBuilderChat
                            userId={currentUser?.id || ''}
                            projektId={projektId}
                            isFloating={true}
                        />
                    </div>
                ) : (
                    <Button
                        onClick={() => setIsChatOpen(true)}
                        className="w-16 h-16 rounded-[2rem] shadow-2xl bg-primary text-white hover:scale-110 active:scale-95 transition-all p-0 flex items-center justify-center relative group"
                    >
                        <div className="absolute inset-0 bg-primary rounded-[2rem] animate-ping opacity-20 group-hover:hidden" />
                        <Sparkles className="w-8 h-8 stroke-[2.5]" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] font-black">!</span>
                        </div>
                    </Button>
                )}
            </div>

            {/* INFORMATION SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* WHAT IS MY DASHBOARD */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {features.map((f, i) => (
                            <Card key={i} className="bg-white/60 backdrop-blur-md border-2 border-slate-50 shadow-sm rounded-3xl hover:-translate-y-1 transition-all duration-300">
                                <CardContent className="p-6 flex gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl shrink-0">
                                        <f.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-sm mb-1">{f.title}</h4>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="bg-primary/5 border-2 border-primary/10 shadow-none rounded-[2rem] p-8">
                        <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2">
                            Wie funktioniert der Prozess?
                        </h3>
                        <div className="space-y-4">
                            {[
                                { step: "1", text: "Überleg dir, welche Aufgaben du täglich wiederholst und automatisieren möchtest." },
                                { step: "2", text: "Beschreibe deinem Assistenten im Chat, welche Daten du sehen und bearbeiten willst." },
                                { step: "3", text: "Die KI analysiert die Machbarkeit deiner Struktur und erstellt die technischen Anforderungen." },
                                { step: "4", text: "Nach der Validierung wird die Funktionalität automatisch zu deiner Suite hinzugefügt." }
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shrink-0">{s.step}</span>
                                    <p className="text-xs font-bold text-slate-700 leading-normal">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* EXAMPLES & HISTORY */}
                <div className="space-y-8">
                    <Card className="bg-slate-50 border-none rounded-[2rem] p-6 shadow-inner">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Sparkles size={14} className="text-primary" />
                            Anwendungsbeispiele
                        </h3>
                        <div className="space-y-4">
                            {examples.map((ex, i) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                                    <h5 className="text-[10px] font-black text-primary uppercase mb-2 group-hover:translate-x-1 transition-transform">{ex.title}</h5>
                                    <p className="text-[11px] text-slate-600 italic font-medium leading-relaxed">"{ex.text}"</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* REQUEST HISTORY */}
                    <Card className="bg-white border-2 border-slate-100 rounded-[2rem] shadow-lg overflow-hidden flex flex-col max-h-[400px]">
                        <CardHeader className="p-6 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-slate-400" />
                                <span className="text-xs font-black uppercase text-slate-600">Meine Anfragen</span>
                            </div>
                            <Badge className="bg-slate-200 text-slate-600 border-none font-black text-[9px] h-5">{requests.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="p-10 flex flex-col items-center gap-3">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                </div>
                            ) : requests.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {requests.map(req => (
                                        <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-slate-800 truncate pr-2">{req.title}</span>
                                                <Badge className={cn(
                                                    "text-[8px] font-black uppercase tracking-tighter h-4",
                                                    req.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                                                )}>
                                                    {req.status === 'pending' ? 'Warten' : 'Verarbeitet'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold">
                                                <Clock size={10} />
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-10 text-center space-y-3">
                                    <div className="p-4 bg-slate-50 rounded-full inline-block">
                                        <ListTodo className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Noch keine Anfragen</p>
                                </div>
                            )}
                        </CardContent>
                        {requests.length > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                                <Button variant="ghost" className="text-[10px] font-black uppercase text-primary hover:bg-transparent hover:underline h-auto p-0">Alle Anfragen anzeigen</Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
