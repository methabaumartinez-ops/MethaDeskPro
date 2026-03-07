'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, Bot, User, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatContext } from '@/lib/context/ChatContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
    id: 'init',
    role: 'assistant',
    content: 'Hallo! Ich bin Ihr MethaDesk-Supportassistent. Wie kann ich Ihnen heute helfen? Sie können mir Fragen zu Teilsystemen, Projekten, Positionen oder der Bedienung der Anwendung stellen.',
    timestamp: new Date(),
};

const SUPPORT_CONTEXT = `Du bist ein freundlicher und kompetenter Supportagent für die MethaDesk Pro Anwendung – eine Plattform zur Verwaltung von Bauprojekten bei der Firma METHABAU. 
Die App enthält folgende Funktionen: Projektverwaltung, Teilsysteme (TS), Positionen, Unterpositionen, Material/Bestellungen, Lagerorte, QR-Codes, IFC Viewer (BIM), Fuhrpark, Ausführung (Teams & Tasks), Kostenerfassung und mehr.
Du antwortest immer auf Deutsch, kurz und hilfreich. Wenn du etwas nicht weißt, verweise auf den Administrator.`;

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { openSupport, closeSupport } = useChatContext();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            openSupport();
            setHasUnread(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            closeSupport();
        }
    }, [isOpen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const assistantMsgId = (Date.now() + 1).toString();
        // Add a placeholder assistant message immediately
        setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: '', // Start with empty content
            timestamp: new Date(),
        }]);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: SUPPORT_CONTEXT },
                        // Include last 6 messages for context
                        ...[...messages, userMsg].slice(-6).map(m => ({
                            role: m.role,
                            content: m.content,
                        })),
                    ],
                }),
            });

            if (!res.ok || !res.body) {
                throw new Error('Failed to fetch stream or response body is null');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let accumulatedContent = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                // Update the assistant message with the new chunk
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMsgId ? { ...msg, content: accumulatedContent } : msg
                ));
            }

            if (!isOpen) setHasUnread(true);

        } catch (error) {
            console.error("Streaming error:", error);
            setMessages(prev => {
                // Check if the assistant message was already added
                const existingAssistantMsg = prev.find(msg => msg.id === assistantMsgId);
                if (existingAssistantMsg) {
                    return prev.map(msg =>
                        msg.id === assistantMsgId
                            ? { ...msg, content: 'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuchen Sie es erneut oder kontaktieren Sie den Administrator.' }
                            : msg
                    );
                } else {
                    // If the assistant message was never added or failed early, add a new error message
                    return [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung oder kontaktieren Sie den Administrator.',
                        timestamp: new Date(),
                    }];
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            {/* Trigger Button */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(o => !o)}
                    title="Support-Chat öffnen"
                    className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                        "bg-primary/10 hover:bg-primary/20 text-primary hover:scale-110 active:scale-95",
                        isOpen && "bg-primary text-white hover:bg-primary/90"
                    )}
                >
                    <MessageCircleQuestion className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                    )}
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-[300] w-[380px] max-w-[calc(100vw-1.5rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-card overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-black leading-none">MethaDesk Support</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] font-medium opacity-80">Online – KI-Assistent</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                                title="Chat minimieren"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); setMessages([INITIAL_MESSAGE]); }}
                                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                                title="Chat schliessen"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 h-[340px] overflow-y-auto overscroll-contain p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-2 items-end",
                                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white text-[10px] font-black",
                                    msg.role === 'assistant' ? "bg-gradient-to-br from-orange-500 to-orange-600" : "bg-slate-600"
                                )}>
                                    {msg.role === 'assistant' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                </div>

                                {/* Bubble */}
                                <div className={cn(
                                    "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                                    msg.role === 'assistant'
                                        ? "bg-white dark:bg-card text-foreground rounded-bl-sm border border-border"
                                        : "bg-primary text-white rounded-br-sm"
                                )}>
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p className={cn(
                                        "text-[9px] mt-1 font-medium",
                                        msg.role === 'assistant' ? "text-muted-foreground" : "text-white/70"
                                    )}>
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {loading && (
                            <div className="flex gap-2 items-end">
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                                    <Bot className="h-3.5 w-3.5" />
                                </div>
                                <div className="bg-white dark:bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1 items-center">
                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Quick Suggestions */}
                    {messages.length <= 1 && (
                        <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-border bg-white dark:bg-card">
                            {['Wie erstelle ich ein Teilsystem?', 'QR-Code scannen?', 'IFC Datei importieren?'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex items-center gap-2 p-3 border-t border-border bg-white dark:bg-card">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Schreiben Sie Ihre Nachricht..."
                            disabled={loading}
                            className="flex-1 h-9 rounded-xl border border-border bg-muted/40 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            className={cn(
                                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                                "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95",
                                "disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                            )}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
