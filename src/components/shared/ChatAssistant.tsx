'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
// @ts-expect-error ai/react subpath export — resolve issue with bundler moduleResolution
import { useChat } from 'ai/react';
import { AnimatedRobot } from '@/components/shared/AnimatedRobot';
import {
    MessageSquare, X, Send, User, Sparkles, Bot
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ChatAssistant = ({
    isSidebarMode = false,
    buttonLabel,
    isHeaderMode = false
}: {
    isSidebarMode?: boolean;
    buttonLabel?: string;
    isHeaderMode?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { projektId } = useParams() as { projektId?: string };

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        body: {
            projektId,
        },
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Hallo! Ich bin METHAbot. Wie kann ich dir heute helfen?',
            }
        ],
        streamProtocol: 'text',
        onError: (error) => {
            console.error('Chat Error:', error);
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    return (
        <div className={cn(
            "z-50 flex flex-col",
            isSidebarMode ? "" : "fixed bottom-6 right-6 items-end"
        )}>
            {/* Chat Window */}
            {isOpen && (
                <div className={cn(
                    "mb-4 w-[380px] h-[550px] animate-in slide-in-from-bottom-5 duration-300",
                    isSidebarMode ? "fixed left-[260px] bottom-4 z-50 shadow-2xl" : "",
                    isHeaderMode ? "fixed right-6 bottom-4 z-50 shadow-2xl" : ""
                )}>
                    <Card className="h-full flex flex-col shadow-2xl border-slate-200 bg-white dark:bg-slate-950 overflow-hidden">
                        <CardHeader className="bg-primary p-4 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl flex items-center justify-center">
                                    <AnimatedRobot className="h-8 w-8" isWaving={isOpen} isThinking={isLoading} />
                                </div>
                                <div className="text-white">
                                    <CardTitle className="text-base font-black">METHAbot</CardTitle>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10 h-8 w-8 rounded-full"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-slate-50/30 dark:bg-slate-900/10">
                            {messages?.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col max-w-[85%] animate-in fade-in duration-300",
                                        msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-white rounded-tr-none font-medium whitespace-pre-wrap"
                                            : "bg-white dark:bg-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800"
                                    )}>
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed marker:text-primary [&>ul]:space-y-1 [&>ul>li]:pl-1 [&>p]:mb-2 last:[&>p]:mb-0">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start">
                                    <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800">
                                        <div className="flex gap-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-3">
                            <form
                                className="flex w-full gap-2 items-center"
                                onSubmit={handleSubmit}
                            >
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Fragen Sie etwas..."
                                        className="h-11 pl-4 pr-10 rounded-xl bg-slate-50 border-slate-200 focus:ring-primary shadow-inner dark:bg-slate-900"
                                        value={input}
                                        onChange={handleInputChange}
                                    />
                                    <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-50" />
                                </div>
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="h-11 w-11 rounded-xl shadow-lg bg-primary hover:bg-orange-600 transition-all shrink-0"
                                    disabled={!input.trim() || isLoading}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                            <div className="text-center w-full">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    METHAbot kann Fehler machen. Bitte überprüfe wichtige Informationen.
                                </span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Trigger Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center p-0 overflow-hidden",
                    isOpen ? "h-14 w-14 bg-slate-900 hover:bg-slate-800 rotate-90" : (
                        buttonLabel
                            ? "h-11 px-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-lg shadow-orange-100"
                            : "h-20 w-20 bg-white hover:bg-slate-50 border-2 border-primary hover:scale-110"
                    ),
                    isSidebarMode ? "h-14 w-14" : ""
                )}
            >
                {isOpen ? (
                    <X className="h-6 w-6 text-white" />
                ) : (
                    buttonLabel ? (
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <span>{buttonLabel}</span>
                        </div>
                    ) : (
                        <div className="relative h-full w-full flex items-center justify-center">
                            <AnimatedRobot className="h-14 w-14 transition-transform hover:scale-110" isWaving={!isOpen} />
                            <div className="absolute top-1 right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center z-10 shadow-sm border border-slate-100">
                                <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping" />
                            </div>
                        </div>
                    )
                )}
            </Button>
        </div>
    );
};
