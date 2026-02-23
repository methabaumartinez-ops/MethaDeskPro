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
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {/* STICKY HEADER - ALWAYS VISIBLE */}
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md pt-2 pb-4 -mx-2 px-2">
                <div className="bg-card p-5 rounded-2xl shadow-md border-2 border-orange-500/30 flex items-center justify-between transition-all hover:border-orange-500/50">
                    <div className="space-y-1">
                        {teilsystem && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">TEILSYSTEM</span>
                                <Badge variant="outline" className="h-5 text-[10px] font-black border-orange-500/30 bg-orange-50 text-orange-700">
                                    {teilsystem.teilsystemNummer || 'N/A'}
                                </Badge>
                                <span className="text-xs font-bold text-muted-foreground">{teilsystem.name}</span>
                            </div>
                        )}
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">POSITION</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-black text-foreground tracking-tight leading-tight">POS {position.posNummer || '—'}</span>
                            <h1 className="text-2xl font-black text-foreground tracking-tight">{position.name}</h1>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <StatusBadge status={position.status} />
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{position.menge} {position.einheit}</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 pr-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Status</p>
                            <StatusBadge status={position.status} className="mt-1" />
                        </div>
                        <div className="text-right border-l pl-4 border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Menge</p>
                            <p className="text-sm font-black text-foreground mt-0.5">{position.menge} {position.einheit}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Details & Tables */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Position Info Grid */}
                    <Card className="shadow-lg border-2 border-border overflow-hidden rounded-2xl">
                        <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border border-b border-border">
                                <div className="p-4 space-y-1 hover:bg-muted/30 transition-colors">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Menge</span>
                                    <p className="text-sm font-black text-foreground">{position.menge} {position.einheit}</p>
                                </div>
                                <div className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</span>
                                    <div><StatusBadge status={position.status} /></div>
                                </div>
                                <div className="p-4 space-y-1 hover:bg-muted/30 transition-colors bg-orange-50/20">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Teilsystem</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="h-4 text-[8px] font-black border-orange-500/30 text-orange-700">
                                            {teilsystem?.teilsystemNummer || '—'}
                                        </Badge>
                                        <p className="text-xs font-bold text-foreground truncate">{teilsystem?.name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-border bg-slate-50/30">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">Beschreibung / Bemerkung</span>
                                <p className="text-sm font-medium text-foreground italic leading-relaxed">
                                    {position.name}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Unterpositionen Table */}
                    <Card className="shadow-lg border-2 border-border overflow-hidden rounded-2xl">
                        <CardHeader className="py-4 px-6 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-3">
                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                                Unterpositionen
                            </CardTitle>
                            {!isReadOnly && (
                                <Link href={`/${projektId}/positionen/${id}/unterpositionen/erfassen`}>
                                    <Button size="sm" variant="outline" className="font-bold h-8 border-2 border-primary/30 text-primary hover:bg-primary/5 shadow-sm flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Hinzufügen
                                    </Button>
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table className="border-none">
                                    <TableHeader className="bg-background">
                                        <TableRow className="border-b-2 border-border hover:bg-transparent">
                                            <TableHead className="w-24 px-6 py-4 font-black text-foreground">Pos-Nr.</TableHead>
                                            <TableHead className="px-6 py-4 font-black text-foreground">Bezeichnung</TableHead>
                                            <TableHead className="w-32 px-6 py-4 font-black text-foreground">Menge</TableHead>
                                            <TableHead className="w-32 px-6 py-4 font-black text-foreground">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unterpositionen.length > 0 ? (
                                            unterpositionen.map((upos) => (
                                                <TableRow key={upos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50">
                                                    <TableCell className="px-6 py-4 font-black text-primary">{upos.posNummer || '—'}</TableCell>
                                                    <TableCell className="px-6 py-4 font-bold text-foreground">{upos.name}</TableCell>
                                                    <TableCell className="px-6 py-4 font-bold text-muted-foreground">
                                                        <Badge variant="outline" className="font-black border-slate-300 bg-slate-50">{upos.menge} {upos.einheit}</Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4"><StatusBadge status={upos.status} /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                                                        <FileSpreadsheet className="h-8 w-8" />
                                                        <p className="text-sm font-bold uppercase tracking-wider">Keine Unterpositionen vorhanden</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Actions & Assets */}
                <div className="lg:col-span-1 space-y-6">
                    {/* QR Section */}
                    <Card className="shadow-lg border-2 border-border overflow-hidden rounded-2xl">
                        <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scan & Info</span>
                        </CardHeader>
                        <CardContent className="p-6">
                            <QRCodeSection
                                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/position/${position.id}`}
                                title={position.name}
                                subtitle={`POS: ${position.posNummer}`}
                                compact={true}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions Group - VISIBLE BUTTONS LIKE IN PHOTO */}
                    <div className="space-y-3">
                        {!isReadOnly && (
                            <Link href={`/${projektId}/positionen/${position.id}/edit`}>
                                <Button className="w-full font-black text-xs uppercase bg-orange-600 hover:bg-orange-700 text-white h-12 shadow-lg shadow-orange-200 rounded-xl flex items-center justify-center gap-2">
                                    <Edit className="h-5 w-5" />
                                    <span>Edit</span>
                                </Button>
                            </Link>
                        )}
                        <Button
                            variant="outline"
                            className="w-full font-bold text-xs uppercase h-10 border-2 rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:bg-muted"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back</span>
                        </Button>
                    </div>

                    {/* Document Viewer (Side) */}
                    <Card className="shadow-lg border-2 border-border overflow-hidden rounded-2xl">
                        <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dokumente & Pläne</span>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                        </CardHeader>
                        <CardContent className="p-0">
                            <DocumentViewer
                                documents={[
                                    { id: '1', name: 'Planhalle_A.pdf', type: 'pdf', url: '#', date: '12.02.2026', size: '2.4 MB' },
                                    { id: '2', name: 'Detail_Anschluss.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=300', date: '15.02.2026', size: '1.1 MB' },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
