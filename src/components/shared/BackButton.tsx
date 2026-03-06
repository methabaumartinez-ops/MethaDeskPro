'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
    href?: string;
    className?: string;
    label?: string;
}

export function BackButton({ href, className, label = 'Zurück' }: BackButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        if (href) {
            router.push(href);
        } else {
            // Check if there is history, otherwise fallback to a safe route is handled by the caller or we can provide a default
            if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
            } else {
                // Default fallback if no history and no href
                // Since this is used in [projektId] dashboard, we usually want to go to the project dashboard
                const pathParts = window.location.pathname.split('/');
                if (pathParts.length > 1) {
                    const projektId = pathParts[1];
                    router.push(`/${projektId}/ausfuehrung`); // Sensible default for this app
                } else {
                    router.push('/projekte');
                }
            }
        }
    };

    return (
        <Button
            onClick={handleClick}
            variant="ghost"
            size="sm"
            className={cn(
                "h-8 px-3 text-white/70 hover:text-white hover:bg-white/10 rounded-lg flex items-center gap-2 transition-all group",
                className
            )}
        >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </Button>
    );
}
