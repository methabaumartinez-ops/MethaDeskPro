'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Bot, User, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export default function ChatPage() {
    const params = useParams();
    const projektId = params.projektId as string;

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        body: {
            projektId,
        },
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">AI Assistant</h1>
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground">Pregúntame sobre el proyecto, personal o maquinaria.</p>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-gradient-to-b from-background to-accent/20">
                <CardHeader className="border-b bg-background/50 backdrop-blur-sm">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bot className="h-5 w-5 text-primary" />
                        Metha助手 (Beta)
                    </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                            <div className="p-4 rounded-full bg-primary/10 mb-4">
                                <Bot className="h-12 w-12 text-primary opacity-50" />
                            </div>
                            <p className="text-xl font-semibold text-foreground">¡Hola! Soy tu asistente de MethaDeskPro</p>
                            <p className="max-w-sm mt-2">
                                Puedo ayudarte a analizar los datos de este proyecto, consultar disponibilidad de personal o buscar maquinaria específica.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8 w-full max-w-lg">
                                <Button
                                    variant="outline"
                                    className="justify-start h-auto py-3 px-4 text-left"
                                    onClick={() => {
                                        const event = { target: { value: "¿Qué sistemas tiene este proyecto?" } } as any;
                                        handleInputChange(event);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs uppercase opacity-50">Preguntar sobre</span>
                                        <span>¿Qué sistemas tiene este proyecto?</span>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start h-auto py-3 px-4 text-left"
                                    onClick={() => {
                                        const event = { target: { value: "¿Quién está en el equipo?" } } as any;
                                        handleInputChange(event);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-xs uppercase opacity-50">Preguntar sobre</span>
                                        <span>¿Quién está en el equipo?</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div
                                key={m.id}
                                className={clsx(
                                    "flex w-full mb-4 animate-in slide-in-from-bottom-2 duration-300",
                                    m.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={clsx(
                                        "flex gap-3 max-w-[85%] md:max-w-[70%]",
                                        m.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div className={clsx(
                                        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm",
                                        m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                                    )}>
                                        {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                                    </div>
                                    <div
                                        className={clsx(
                                            "rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed",
                                            m.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-background border rounded-tl-none"
                                        )}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="flex gap-3 max-w-[70%]">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center border">
                                    <Bot className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="bg-background border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            placeholder="Escribe tu mensaje aquí..."
                            value={input}
                            onChange={handleInputChange}
                            className="flex-1 bg-background border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()} className="shadow-lg transition-all hover:scale-105 active:scale-95">
                            <Send className="h-4 w-4 mr-2" />
                            Enviar
                        </Button>
                    </form>
                    <p className="text-[10px] text-center mt-2 text-muted-foreground">
                        El asistente puede cometer errores. Verifique la información importante.
                    </p>
                </div>
            </Card>
        </div>
    );
}
