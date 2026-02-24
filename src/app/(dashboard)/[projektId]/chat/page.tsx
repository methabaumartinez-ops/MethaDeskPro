'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, User, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { AnimatedRobot } from '@/components/shared/AnimatedRobot';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FAQS = [
    {
        title: "Projektstatus",
        question: "Zeige mir die kritischen Termine im Bauzeitenplan für diesen Monat.",
        description: "Analyse der Meilensteine und potenziellen Verzögerungen."
    },
    {
        title: "Kosten & Budget",
        question: "Wie ist der aktuelle Stand der Materialkosten im Vergleich zum Soll-Budget?",
        description: "Detaillierte Kostenübersicht nach Gewerken."
    },
    {
        title: "Fuhrpark & Geräte",
        question: "Welche Maschinen und Geräte (Kräne, Bagger, Hebebühnen) sind aktuell auf der Baustelle verfügbar?",
        description: "Übersicht des verfügbaren Inventars und dessen Status."
    },
    {
        title: "Werkhof & Logistik",
        question: "Welches Material muss noch vom Werkhof als 'Bereit' markiert oder geliefert werden?",
        description: "Kontrolle offener Bestellungen und Lieferstatus."
    }
];

export default function ChatPage() {
    const params = useParams();
    const projektId = params.projektId as string;

    const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
        api: '/api/chat',
        body: {
            projektId,
        },
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Hallo! Ich bin METHAbot. Wie kann ich dir heute bei deinem Projekt helfen?',
            }
        ],
        streamProtocol: 'text',
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFaqClick = (question: string) => {
        append({ role: 'user', content: question });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        <span className="text-primary">METHA</span>bot
                    </h1>
                    <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-primary/20">
                        KI-Experte
                    </div>
                </div>
                <p className="text-slate-500 font-medium tracking-wide">Ihr intelligenter Begleiter für Projektsteuerung und Datenanalyse.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Chat Column */}
                <Card className="lg:col-span-8 flex flex-col overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 relative">
                    <CardHeader className="border-b bg-white/50 backdrop-blur-md dark:bg-slate-950/50 p-4 shrink-0">
                        <CardTitle className="flex items-center justify-between text-lg">
                            <div className="flex items-center gap-2">
                                <AnimatedRobot className="h-8 w-8" isThinking={isLoading} />
                                <div className="flex flex-col">
                                    <span className="font-black text-sm leading-none">METHAbot Chat</span>
                                </div>
                            </div>
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-50/30 dark:bg-slate-900/10" ref={scrollRef}>
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={clsx(
                                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    m.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={clsx(
                                        "flex gap-4 max-w-[85%] md:max-w-[80%]",
                                        m.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div className={clsx(
                                        "flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center shadow-md border-2",
                                        m.role === 'user'
                                            ? "bg-slate-900 border-slate-800 text-white"
                                            : "bg-white border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700"
                                    )}>
                                        {m.role === 'user' ? <User className="h-5 w-5" /> : <AnimatedRobot className="h-7 w-7" />}
                                    </div>
                                    <div
                                        className={clsx(
                                            "rounded-3xl px-5 py-3 shadow-sm text-sm",
                                            m.role === 'user'
                                                ? "bg-primary text-white rounded-tr-none font-medium"
                                                : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-tl-none text-slate-700 dark:text-slate-200"
                                        )}
                                    >
                                        {m.role === 'user' ? (
                                            <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed marker:text-primary [&>ul]:space-y-2 [&>ul>li]:pl-1 [&>p]:mb-3 last:[&>p]:mb-0">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {m.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start mb-4">
                                <div className="flex gap-4 max-w-[70%]">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-md">
                                        <AnimatedRobot className="h-7 w-7" isThinking={true} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl rounded-tl-none px-5 py-4 flex gap-1.5 items-center shadow-sm">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <div className="p-4 border-t bg-white dark:bg-slate-950 shrink-0 flex flex-col items-center gap-3">
                        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-4xl mx-auto w-full">
                            <div className="relative flex-1 group">
                                <Input
                                    placeholder="Fragen Sie METHAbot..."
                                    value={input}
                                    onChange={handleInputChange}
                                    className="h-14 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-primary shadow-inner rounded-2xl pl-5 pr-12 text-sm font-medium transition-all group-hover:border-primary/50"
                                />
                                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="h-14 w-14 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-orange-600 border-2 border-transparent hover:border-white/20"
                                size="icon"
                            >
                                <Send className="h-5 w-5 text-white" />
                            </Button>
                        </form>
                        <div className="text-center w-full max-w-4xl mx-auto">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                METHAbot kann Fehler machen. Bitte überprüfe wichtige Informationen.
                            </span>
                        </div>
                    </div>
                </Card>

                {/* FAQ Column */}
                <div className="lg:col-span-4 flex flex-col space-y-4 min-h-0 overflow-y-auto pr-2">
                    <div className="flex items-center gap-2 mb-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">Häufige Fragen (FAQ)</h2>
                    </div>

                    {FAQS.map((faq, index) => (
                        <button
                            key={index}
                            onClick={() => handleFaqClick(faq.question)}
                            className="group text-left p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="flex flex-col h-full">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{faq.title}</span>
                                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{faq.question}</h3>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{faq.description}</p>
                            </div>
                        </button>
                    ))}

                    <Card className="mt-4 bg-primary/5 border-primary/10 shadow-none rounded-2xl border-dashed">
                        <CardContent className="p-5">
                            <h4 className="font-bold text-sm text-primary mb-1">Tipp für Experten</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Sie können METHAbot nach spezifischen Details zu Teilsystemen, Materialien oder Personalzuweisungen fragen. Er basiert auf Ihren Echtzeit-Projektdaten.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
