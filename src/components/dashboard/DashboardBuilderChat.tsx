import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, ListChecks, ArrowRight, Save, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DashboardService } from '@/lib/services/dashboardService';
import { AICollectedRequirements, DashboardRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { AnimatedRobot } from '@/components/shared/AnimatedRobot';

interface Message {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
}

export function DashboardBuilderChat({ userId, projektId, isFloating = false }: { userId: string, projektId?: string, isFloating?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);
    const [hasBeenOpened, setHasBeenOpened] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Wir bauen dein zukünftiges personalisiertes Dashboard. Denk an Aufgaben, die du jeden Tag wiederholst: Was möchtest du automatisieren oder direkt im Blick haben?',
            timestamp: new Date()
        },
        {
            id: '2',
            role: 'assistant',
            content: 'Dies ist eine **Beta-Version**. Erzähl uns von deinen repetitiven Prozessen (z.B. Montagetermine überwachen), damit wir analysieren können, wie wir sie für dich vereinfachen.',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isCollecting, setIsCollecting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);
        const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle Attention Pulse Timer
    useEffect(() => {
        if (!isFloating || hasBeenOpened || isOpen || prefersReducedMotion) return;

        const pulseInterval = setInterval(() => {
            setIsPulsing(true);
            setTimeout(() => {
                setIsPulsing(false);
            }, 800); // Pulse duration
        }, 30000); // 30 seconds

        return () => clearInterval(pulseInterval);
    }, [isFloating, hasBeenOpened, isOpen, prefersReducedMotion]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue('');

        if (!isCollecting) {
            setIsCollecting(true);
            setTimeout(async () => {
                const assistantMessage: Message = {
                    id: uuidv4(),
                    role: 'assistant',
                    content: 'Vielen Dank für dein Feedback! Wie bereits erwähnt, befindet sich dieser Bereich aktuell noch im Aufbau und wir haben momentan noch nicht alle notwendigen Ressourcen freigeschaltet. Wir haben deine Nachricht jedoch gespeichert und unser Team wird sie analysieren. Sobald der Builder bereit ist, wirst du hier voll durchstarten können!',
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Save to DB as a simple feedback request
                const newRequest: Partial<DashboardRequest> = {
                    userId,
                    projektId,
                    title: 'Feedback / Beta-Anfrage',
                    description: currentInput,
                    status: 'pending',
                    requirements: {
                        initialRequest: currentInput,
                        widgetType: 'Beta Feedback'
                    } as any
                };

                try {
                    await DashboardService.upsertRequest(newRequest);
                } catch (error) {
                    console.error("Error saving request:", error);
                }
            }, 800);
            return;
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setHasBeenOpened(true);
        }
    };

    const chatContent = (
        <Card className={cn(
            "flex flex-col border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden group transition-all",
            isFloating ? "w-[380px] h-[550px]" : "h-[500px]",
            isFloating && "border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-5 duration-300"
        )}>
            <div className="p-6 bg-gradient-to-r from-primary/10 to-transparent border-b border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/20 rounded-2xl shadow-inner">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary/80">Dashboard Builder</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Konstruktor Modus</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isFloating && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-full hover:bg-black/5"
                        >
                            <X size={18} className="text-slate-400" />
                        </Button>
                    )}
                    {!isFloating && (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-primary/5 text-primary border-primary/20 h-5">Builder Aktiv</Badge>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
                <div className="space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex items-end gap-3 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "p-2.5 rounded-2xl shadow-sm",
                                msg.role === 'assistant' ? "bg-muted" : "bg-primary"
                            )}>
                                {msg.role === 'assistant' ? (
                                    <Sparkles size={14} className="text-primary" />
                                ) : (
                                    <User size={14} className="text-white" />
                                )}
                            </div>
                            <div className={cn(
                                "p-4 rounded-3xl text-sm leading-relaxed font-medium shadow-sm",
                                msg.role === 'assistant'
                                    ? "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                                    : "bg-primary text-white rounded-br-none"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isSaving && (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse">
                            <Save size={12} /> Anforderungen speichern...
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 pt-0">
                <div className="relative group">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Was soll ich für dich bauen?..."
                        className="h-14 pl-6 pr-14 rounded-full border-2 border-slate-100 bg-white/80 focus-visible:ring-primary focus-visible:border-primary shadow-lg transition-all text-sm font-medium"
                    />
                    <Button
                        onClick={handleSendMessage}
                        size="icon"
                        className="absolute right-2 top-2 h-10 w-10 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        <Send size={18} />
                    </Button>
                </div>
                <p className="text-[9px] text-center mt-4 font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                    Anforderungen werden direkt zur Analyse gesendet.
                </p>
            </div>
        </Card>
    );

    if (!isFloating) return chatContent;

    return (
        <>
            <style>
                {`
                @keyframes pulse-attention {
                    0% { transform: scale(1); }
                    50% { transform: scale(2); }
                    100% { transform: scale(1); }
                }
                .pulse-attention {
                    animation: pulse-attention 0.8s ease-in-out forwards;
                }
                `}
            </style>

            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
                {isOpen && chatContent}

                <Button
                    onClick={toggleChat}
                    className={cn(
                        "rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center p-0 overflow-hidden",
                        isOpen ? "h-14 w-14 bg-slate-900 hover:bg-slate-800 rotate-90" : "h-16 w-16 bg-white hover:bg-slate-50 border-2 border-primary hover:scale-110",
                        isPulsing && "pulse-attention"
                    )}
                    style={{ willChange: 'transform' }}
                >
                    {isOpen ? (
                        <X className="h-6 w-6 text-white" />
                    ) : (
                        <div className="relative h-full w-full flex items-center justify-center bg-white shadow-xl">
                            <AnimatedRobot className="h-11 w-11" isWaving={true} />
                            <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-white items-center justify-center">
                                    <Sparkles size={8} className="text-white" />
                                </span>
                            </div>
                        </div>
                    )}
                </Button>
            </div>
        </>
    );
}
