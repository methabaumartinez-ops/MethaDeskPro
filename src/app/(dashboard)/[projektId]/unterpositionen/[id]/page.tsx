'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SubPositionService } from '@/lib/services/subPositionService';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Unterposition, Position, Teilsystem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { Badge } from '@/components/ui/badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';

export default function UnterpositionDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readOnly';
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);
    const [parentPosition, setParentPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const uposData = await SubPositionService.getUnterpositionById(id);
                if (uposData) {
                    setUnterposition(uposData);
                    const posData = await PositionService.getPositionById(uposData.positionId);
                    if (posData) {
                        setParentPosition(posData);
                        const tsData = await SubsystemService.getTeilsystemById(posData.teilsystemId);
                        setTeilsystem(tsData);
                    }
                }
            } catch (error) {
                console.error("Failed to load sub-position hierarchy", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!unterposition) return <div className="p-10 text-center text-red-500">Unterposition nicht gefunden</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">UNTERPOSITION</span>
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">UPOS {unterposition.posNummer || '—'}</span>
                        <span className="text-3xl font-black text-foreground tracking-tight select-none">{unterposition.name}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <StatusBadge status={unterposition.status} />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{unterposition.menge} {unterposition.einheit}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <QRCodeSection
                        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/unterposition/${unterposition.id}`}
                        title={unterposition.name}
                        subtitle={`TS: ${teilsystem?.teilsystemNummer || '—'} | POS: ${parentPosition?.posNummer || '—'} | UPOS: ${unterposition.posNummer} | ${unterposition.menge} ${unterposition.einheit}`}
                        compact={true}
                    />

                    <div className="h-12 w-[1px] bg-border mx-2" />

                    <div className="flex flex-col gap-2">
                        {!isReadOnly && (
                            <Link href={`/${projektId}/unterpositionen/${unterposition.id}/edit`}>
                                <Button size="sm" className="font-black bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Bearbeiten</span>
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-muted hover:bg-muted/80 text-foreground font-bold h-9 text-xs border-none rounded-xl transition-all"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            Zurück
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm border-none bg-card/50 backdrop-blur-sm">
                    <CardHeader className="py-3 px-4 bg-muted/30 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            Detalles de la Unterposition
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menge & Einheit</span>
                                <p className="text-xl font-bold text-foreground">{unterposition.menge} {unterposition.einheit}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                                <div><StatusBadge status={unterposition.status} /></div>
                            </div>
                            {parentPosition && (
                                <div className="space-y-1 col-span-2">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hierarchy</span>
                                    <div className="flex items-center gap-2 overflow-hidden truncate">
                                        {teilsystem && (
                                            <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary shrink-0">
                                                TS: {teilsystem.teilsystemNummer || teilsystem.id}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="font-bold border-border bg-muted/30 shrink-0">
                                            POS: {parentPosition.posNummer || parentPosition.id}
                                        </Badge>
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {parentPosition.name}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-1">
                    <DocumentViewer
                        documents={[]} // Empty for now to show fallback
                    />
                </div>
            </div>
        </div>
    );
}
