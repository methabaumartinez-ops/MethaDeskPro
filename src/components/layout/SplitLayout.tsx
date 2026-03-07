import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

export function SplitLayout({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6", className)}>
            {children}
        </div>
    );
}

export function SplitLayoutList({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <Card className={cn("shadow-sm border-2 rounded-2xl overflow-hidden", className)}>
            <div className="overflow-y-auto max-h-[calc(100vh-14rem)]">
                {children}
            </div>
        </Card>
    );
}

export function SplitLayoutDetail({ 
    children, 
    isEmpty, 
    emptyTitle = "Keine Auswahl", 
    emptyDescription = "Bitte wählen Sie ein Element aus der linken Liste, um Details anzuzeigen.",
    className 
}: { 
    children: React.ReactNode, 
    isEmpty?: boolean,
    emptyTitle?: string,
    emptyDescription?: string,
    className?: string
}) {
    return (
        <Card className={cn("flex flex-col shadow-sm border-2 rounded-2xl relative overflow-hidden h-fit", className)}>
            {!isEmpty ? (
                children
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <Layers className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="font-bold text-lg text-foreground">{emptyTitle}</p>
                    <p className="text-sm font-medium mt-1">{emptyDescription}</p>
                </div>
            )}
        </Card>
    );
}
