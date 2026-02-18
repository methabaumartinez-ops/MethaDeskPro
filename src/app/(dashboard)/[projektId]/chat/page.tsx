'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Chat</h1>
                <p className="text-muted-foreground">Kommunizieren Sie mit Ihrem Team.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Nachrichten
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Chat Funktion ist in Entwicklung</p>
                        <p className="text-sm">Hier können Sie bald direkt mit Ihrem Team kommunizieren.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
