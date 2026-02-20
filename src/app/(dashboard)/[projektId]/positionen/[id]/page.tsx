'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { Position, Unterposition, Teilsystem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, FileSpreadsheet } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';
import { QRCodeSection } from '@/components/shared/QRCodeSection';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function PositionDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const searchParams = useSearchParams();
    const isReadOnly = searchParams.get('mode') === 'readOnly';
    const [position, setPosition] = useState<Position | null>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [unterpositionen, setUnterpositionen] = useState<Unterposition[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const posData = await PositionService.getPositionById(id);
                if (posData) {
                    const [subPosData, tsData] = await Promise.all([
                        SubPositionService.getUnterpositionen(id),
                        SubsystemService.getTeilsystemById(posData.teilsystemId)
                    ]);
                    setPosition(posData);
                    setUnterpositionen(subPosData);
                    setTeilsystem(tsData);
                }
            } catch (error) {
                console.error("Failed to load position data", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!position) return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="text-red-500 font-bold">Position nicht gefunden</div>
            <p className="text-sm text-muted-foreground">Die gesuchte Position existiert in der aktuellen Datenbank nicht.</p>
            <Button variant="outline" onClick={() => router.push(`/${projektId}/positionen`)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
            </Button>
        </div>
    );

    return (
        <div className="space-y-3 animate-in fade-in duration-500 pb-2">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                {/* Left Column: Title & Details */}
                <div className="lg:col-span-3 space-y-3">
                    {/* Header: Title */}
                    <div className="bg-card p-3 rounded-xl shadow-sm border border-border flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">POSITION</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-foreground tracking-tight leading-tight">POS {position.posNummer || '—'}</span>
                                <span className="text-lg font-bold text-foreground/80 tracking-tight">{position.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={position.status} />
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{position.menge} {position.einheit}</span>
                            </div>
                        </div>
                    </div>

                    {/* Details Card - Ultra Compact Grid */}
                    <Card className="shadow-sm border border-border bg-card/30">
                        <CardContent className="p-3">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Menge</span>
                                    <p className="text-sm font-bold text-foreground">{position.menge} {position.einheit}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Status</span>
                                    <div><StatusBadge status={position.status} /></div>
                                </div>
                                {teilsystem && (
                                    <div className="space-y-0.5 col-span-2">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Teilsystem</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/30 bg-primary/5 text-primary">
                                                {teilsystem.teilsystemNummer || 'N/A'}
                                            </Badge>
                                            <p className="text-xs font-bold text-foreground truncate">
                                                {teilsystem.name}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unterpositionen Table - MOVED INSIDE GRID */}
                    <Card className="shadow-sm border border-border bg-card/20">
                        <CardHeader className="py-2 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileSpreadsheet className="h-3 w-3" />
                                Unterpositionen
                            </CardTitle>
                            {!isReadOnly && (
                                <Link href={`/${projektId}/positionen/${id}/unterpositionen/erfassen`}>
                                    <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-wider border-primary/20 text-primary hover:bg-primary/5 flex items-center gap-1.5 rounded-md">
                                        <Plus className="h-3 w-3" />
                                        Hinzufügen
                                    </Button>
                                </Link>
                            )}
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <Table className="border-none">
                                <TableHeader className="bg-background">
                                    <TableRow className="border-b-2 border-border">
                                        <TableHead className="w-20 font-black text-foreground">Pos-Nr.</TableHead>
                                        <TableHead className="font-black text-foreground">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-foreground">Menge</TableHead>
                                        <TableHead className="font-black text-foreground">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unterpositionen.length > 0 ? (
                                        unterpositionen.map((upos) => (
                                            <TableRow key={upos.id} className="group hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-black text-primary py-1.5 text-xs">{upos.posNummer || '—'}</TableCell>
                                                <TableCell className="font-bold text-foreground text-xs">{upos.name}</TableCell>
                                                <TableCell className="font-bold text-muted-foreground text-xs px-1">
                                                    <Badge variant="outline" className="h-5 text-[9px] font-black px-1.5">{upos.menge} {upos.einheit}</Badge>
                                                </TableCell>
                                                <TableCell className="py-1.5 scale-90 origin-left"><StatusBadge status={upos.status} /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                                                Keine Unterpositionen vorhanden
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: QR & Actions (Compact Sidebar) */}
                <div className="lg:col-span-1 space-y-3">
                    {/* QR Section */}
                    <div className="bg-card p-3 rounded-xl shadow-sm border border-border">
                        <QRCodeSection
                            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/position/${position.id}`}
                            title={position.name}
                            subtitle={`POS: ${position.posNummer}`}
                            compact={true}
                        />

                        <div className="flex gap-2 mt-3">
                            {!isReadOnly && (
                                <Link href={`/${projektId}/positionen/${position.id}/edit`} className="flex-1">
                                    <Button size="sm" className="w-full font-black text-[10px] uppercase bg-primary hover:bg-primary/90 text-white h-9 rounded-lg transition-all flex items-center justify-center gap-2">
                                        <Edit className="h-4 w-4" />
                                        <span>Edit</span>
                                    </Button>
                                </Link>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold h-9 text-[10px] uppercase border-none rounded-lg flex items-center justify-center gap-1"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back
                            </Button>
                        </div>
                    </div>

                    {/* Document Viewer */}
                    <DocumentViewer
                        documents={[
                            { id: '1', name: 'Planhalle_A.pdf', type: 'pdf', url: '#', date: '12.02.2026', size: '2.4 MB' },
                            { id: '2', name: 'Detail_Anschluss.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=300', date: '15.02.2026', size: '1.1 MB' },
                        ]}
                    />
                </div>
            </div>

        </div>
    );
}
