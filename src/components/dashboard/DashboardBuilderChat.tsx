'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, MessageSquare, ListChecks, ArrowRight, Save, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DashboardService } from '@/lib/services/dashboardService';
import { AICollectedRequirements, DashboardRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface Message {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
}

const QUESTIONS = [
    { id: 'widgetType', text: 'Welche Art von Widget oder Funktionalität hast du im Sinn? (z.B. Tabelle, Grafik, Aktionsbutton, Dokumentenbetrachter...)' },
    { id: 'inputData', text: 'Welche Eingabedaten sollen wir verarbeiten? (z.B. PDF-Dokumente, Projektvorfälle, Personal-Daten...)' },
    { id: 'behavior', text: 'Wie soll es sich verhalten? Beschreibe uns die Hauptlogik.' },
    { id: 'automations', text: 'Benötigst du Automatisierungen? (z.B. E-Mail senden beim Hochladen einer Datei, Bauleiter benachrichtigen...)' },
    { id: 'permissions', text: 'Wer soll die Berechtigung haben, dies zu sehen oder zu nutzen?' },
    { id: 'visualFormat', text: 'Hast du visuelle Präferenzen? (Farben, Grösse, Platzierung auf dem Bildschirm...)' },
    { id: 'fileActions', text: 'Wenn Dateien hochgeladen werden, welche automatischen Aktionen sollen wir durchführen?' },
    { id: 'integrations', text: 'Soll es mit anderen externen Systemen oder Diensten verbunden werden (n8n, Google Drive...)?' },
    { id: 'notifications', text: 'Wie und wann möchtest du Benachrichtigungen über diese Funktionalität erhalten?' }
];

export function DashboardBuilderChat({ userId, projektId }: { userId: string, projektId?: string }) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Wir bauen dein zukünftiges personalisiertes Dashboard. Bitte beachte, dass dies eine **Beta-Version** ist und der Builder aktuell noch erstellt wird.',
            timestamp: new Date()
        },
        {
            id: '2',
            role: 'assistant',
            content: 'Momentan fehlen uns noch einige Ressourcen für den vollen Zugriff. Du kannst uns aber bereits deine Wünsche mitteilen, damit wir die Umsetzung analysieren können.',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [isCollecting, setIsCollecting] = useState(false);
    const [requirements, setRequirements] = useState<Partial<AICollectedRequirements>>({});
    const [questionsAsked, setQuestionsAsked] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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
            setRequirements(prev => ({ ...prev, rawJson: { initialRequest: currentInput } }));

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

    return (
        <Card className="flex flex-col h-[600px] border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden group">
            <div className="p-6 bg-gradient-to-r from-primary/10 to-transparent border-b border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/20 rounded-2xl shadow-inner">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary/80">Anforderungs-Sammler</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">KI Assistent Modus</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-primary/5 text-primary border-primary/20 h-5">Builder Aktiv</Badge>
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
                                {msg.role === 'assistant' ? <Bot size={14} className="text-primary" /> : <User size={14} className="text-white" />}
                            </div>
                            <div className={cn(
                                "p-4 rounded-3xl text-xs leading-relaxed font-medium shadow-sm",
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
                        placeholder="Beschreibe uns deine Idee hier..."
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
                    Deine Antworten werden direkt an das Automatisierungsteam gesendet.
                </p>
            </div>
        </Card>
    );
}
