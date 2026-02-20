'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TeilsystemDetailPage from '@/app/(dashboard)/[projektId]/teilsysteme/[id]/page';
import PositionDetailPage from '@/app/(dashboard)/[projektId]/positionen/[id]/page';
import UnterpositionDetailPage from '@/app/(dashboard)/[projektId]/unterpositionen/[id]/page';

export default function PublicSharePage() {
    const { type, id } = useParams() as { type: string; id: string };
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Sobrescribir búsqueda para forzar modo lectura si el componente depende de searchParams
        const url = new URL(window.location.href);
        if (!url.searchParams.has('mode')) {
            url.searchParams.set('mode', 'readOnly');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    if (!mounted) return null;

    const renderContent = () => {
        switch (type) {
            case 'teilsystem': return <TeilsystemDetailPage />;
            case 'position': return <PositionDetailPage />;
            case 'unterposition': return <UnterpositionDetailPage />;
            default: return (
                <div className="text-center py-20 font-bold text-muted-foreground">
                    Ungültiger Typ: {type}
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>

            <div className="mt-12 text-center text-[10px] text-muted-foreground font-medium uppercase tracking-widest border-t pt-8 border-border">
                © {new Date().getFullYear()} MethaDeskPro • Nur Lesezugriff
            </div>
        </div>
    );
}
