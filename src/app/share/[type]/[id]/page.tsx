'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import TeilsystemShareView from './TeilsystemShareView';
import PositionShareView from './PositionShareView';
import UnterpositionShareView from './UnterpositionShareView';
import LagerortShareView from './LagerortShareView';

export default function PublicSharePage() {
    const { type, id } = useParams() as { type: string; id: string };

    const renderContent = () => {
        switch (type) {
            case 'teilsystem':    return <TeilsystemShareView id={id} />;
            case 'position':      return <PositionShareView id={id} />;
            case 'unterposition': return <UnterpositionShareView id={id} />;
            case 'lagerort':      return <LagerortShareView id={id} />;
            default: return (
                <div className="text-center py-20">
                    <p className="font-bold text-muted-foreground">Ungültiger Typ: {type}</p>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            {/* Branding Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight">
                        <span className="text-foreground">METHA</span>
                        <span className="text-primary">Desk</span>
                        <span className="text-muted-foreground text-xs font-light">pro</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-3 py-1 rounded-full ml-auto">
                        QR-Info · Nur Lesezugriff
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {renderContent()}
            </div>

            <div className="mt-12 text-center text-[10px] text-muted-foreground font-medium uppercase tracking-widest border-t border-border pt-8 max-w-4xl mx-auto">
                © {new Date().getFullYear()} MethaDeskPro · Nur Lesezugriff · Keine Anmeldung erforderlich
            </div>
        </div>
    );
}
