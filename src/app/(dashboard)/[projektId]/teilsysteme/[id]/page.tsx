'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BimViewer } from '@/components/shared/BimViewer';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { PositionService } from '@/lib/services/positionService';
import { Teilsystem, Position, Projekt } from '@/types';
import {
    ArrowLeft, Edit, ListTodo, Plus, FileText,
    Calendar, User as UserIcon, Clock, Link as LinkIcon,
    MapPin, Eye, Trash2, ShieldCheck, Hash, Briefcase, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Share2 } from 'lucide-react';
import { QRCodeSection } from '@/components/shared/QRCodeSection';

export default function TeilsystemDetailPage() {
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const isReadOnly = searchParams.get('mode') === 'readOnly';

    const [item, setItem] = useState<Teilsystem | null>(null);
    const [project, setProject] = useState<Projekt | null>(null);
    const [positionen, setPositionen] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ts, ks, pos] = await Promise.all([
                    SubsystemService.getTeilsystemById(id),
                    ProjectService.getProjektById(projektId),
                    PositionService.getPositionenByTeilsystem(id)
                ]);

                if (ts) setItem(ts);
                if (ks) setProject(ks);
                if (pos) setPositionen(pos);
            } catch (error) {
                console.error("Failed to load details:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, projektId]);

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    if (!item || !project) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-center font-bold text-muted-foreground">
                {!item ? `Teilsystem nicht gefunden (ID: ${id})` : `Projekt nicht gefunden (ID: ${projektId})`}
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
                Seite aktualisieren
            </Button>
            <Link href={`/${projektId}/teilsysteme`}>
                <Button variant="ghost">Zurück zur Übersicht</Button>
            </Link>
        </div>
    );

    const detailFields = [
        { label: 'System-Nr.', value: item.teilsystemNummer, icon: Hash },
        { label: 'KS / Kostenstelle', value: item.ks, icon: Briefcase },
        { label: 'Bezeichnung', value: item.name, icon: FileText },
        { label: 'Eröffnet am', value: item.eroeffnetAm, icon: Calendar },
        { label: 'Von', value: item.eroeffnetDurch, icon: UserIcon },
        { label: 'Montage', value: item.montagetermin, icon: Clock, color: 'text-orange-600' },
        { label: 'Frist (Wochen)', value: item.lieferfrist, icon: Clock },
        { label: 'Plan-Abgabe', value: item.abgabePlaner, icon: Calendar },
        { label: 'P-Status', value: item.planStatus, icon: ListTodo, color: item.planStatus === 'fertig' ? 'text-green-600' : 'text-muted-foreground' },
        { label: 'WEMA', value: item.wemaLink, icon: LinkIcon, isLink: true },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Project Context Header (Compact) */}
            {/* Project Context Header (Compact) */}
            {/* Project Context Header (Compact) */}
            {/* Back Button */}
            {!isReadOnly && (
                <div className="flex justify-end mb-4">
                    <Link href={`/${projektId}/teilsysteme`}>
                        <Button variant="secondary" size="sm" className="font-bold h-9 text-xs bg-background text-foreground hover:bg-muted border border-border shadow-sm">
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            Zurück
                        </Button>
                    </Link>
                </div>
            )}

            {/* Top Section: Details & BIM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: System Details */}
                <div className="flex flex-col gap-6">
                    {/* Header Card */}
                    <div className="flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border-2 border-border gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">TEILSYSTEM</span>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black text-foreground tracking-tight select-none">TS {(item.teilsystemNummer || '').replace(/^ts\s?/i, '')}</span>
                                <h1 className="text-3xl font-black text-foreground tracking-tight">{item.name}</h1>
                            </div>
                        </div>

                        {/* Integrated QR Code */}
                        <div className="hidden md:flex items-center gap-4 border-x border-border/50 px-8 h-16">
                            <div className="bg-white p-1.5 rounded-lg border border-border">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`}
                                    size={56}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`;
                                        const printWindow = window.open('', '', 'width=600,height=600');
                                        if (printWindow) {
                                            printWindow.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-center;height:100vh;margin:0;text-align:center;font-family:sans-serif;">
                                                <div style="padding:40px;border:2px solid #000;border-radius:20px;">
                                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />
                                                    <h1>${item.name}</h1>
                                                    <p>TS ${item.teilsystemNummer || ''}</p>
                                                </div>
                                                <script>window.onload=()=>{window.print();window.close();};</script>
                                            </body></html>`);
                                            printWindow.document.close();
                                        }
                                    }}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/teilsystem/${item.id}`;
                                        if (navigator.share) {
                                            navigator.share({ title: item.name, url });
                                        } else {
                                            navigator.clipboard.writeText(url);
                                            alert('Link kopiert!');
                                        }
                                    }}
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-2">
                            <StatusBadge status={item.status} />
                            {!isReadOnly && (
                                <Link href={`/${projektId}/teilsysteme/${item.id}/edit`}>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-primary">
                                        <Edit className="h-3 w-3 mr-1" />
                                        Bearbeiten
                                    </Button>
                                </Link>
                            )}
                            {isReadOnly && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-1 rounded-md">
                                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                    Nur Lesezugriff
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <Card className="shadow-sm border-2 border-border">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
                            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">System Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                                {detailFields.map((field, i) => (
                                    <div key={i} className={cn(
                                        "px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors border-b border-border",
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-muted rounded-md">
                                                <field.icon className={cn("h-3.5 w-3.5 text-muted-foreground", field.color)} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{field.label}</span>
                                        </div>
                                        <div className="text-right">
                                            {field.isLink ? (
                                                <a href={field.value} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary truncate max-w-[150px] hover:underline block">
                                                    {field.value || 'n/a'}
                                                </a>
                                            ) : (
                                                <span className={cn("text-xs font-bold text-foreground", field.color)}>
                                                    {field.value || '—'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Remark (Compact) */}
                    <div className="bg-orange-50/50 dark:bg-orange-950/10 border-2 border-primary/30 p-4 rounded-lg text-sm text-muted-foreground italic">
                        <span className="font-bold text-primary not-italic text-xs uppercase mr-2">Bemerkung:</span>
                        {item.bemerkung || 'Keine Bemerkung vorhanden.'}
                    </div>
                </div>

                {/* Right: BIM Viewer */}
                <div className="flex flex-col gap-6">
                    <div className="min-h-[350px] lg:h-full">
                        <BimViewer modelName={`${item.name}.ifc`} />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Positions */}
            <Card className="shadow-lg border-2 border-border">
                <CardHeader className="border-b border-border flex flex-row justify-between items-center py-4 bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2 font-black">
                        <ListTodo className="h-5 w-5 text-primary" />
                        Zugehörige Positionen
                    </CardTitle>
                    {!isReadOnly && (
                        <Link href={`/${projektId}/teilsysteme/${id}/positionen/erfassen`}>
                            <Button size="sm" className="font-bold h-8 shadow-md">
                                <Plus className="h-3 w-3 mr-1" />
                                Position hinzufügen
                            </Button>
                        </Link>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {positionen.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table className="border-none rounded-none">
                                <TableHeader className="bg-background">
                                    <TableRow className="border-b-2 border-border">
                                        <TableHead className="w-20 font-black text-foreground">Pos-Nr.</TableHead>
                                        <TableHead className="font-black text-foreground">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-foreground">Menge</TableHead>
                                        <TableHead className="font-black text-foreground">Status</TableHead>
                                        {!isReadOnly && <TableHead className="text-right font-black text-foreground">Aktionen</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positionen.map((pos) => (
                                        <TableRow key={pos.id} className="group hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/${projektId}/positionen/${pos.id}`)}>
                                            <TableCell className="font-black text-primary py-4">{pos.posNummer || '—'}</TableCell>
                                            <TableCell className="font-bold text-foreground">{pos.name}</TableCell>
                                            <TableCell className="font-bold text-muted-foreground">
                                                <Badge variant="outline" className="font-black">{pos.menge} {pos.einheit}</Badge>
                                            </TableCell>
                                            <TableCell><StatusBadge status={pos.status} /></TableCell>
                                            {!isReadOnly && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Link href={`/${projektId}/positionen/${pos.id}`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-background hover:shadow-sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/${projektId}/positionen/${pos.id}/edit`}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 hover:shadow-sm"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Sind Sie sicher, dass Sie "${pos.name}" löschen möchten?`)) {
                                                                    try {
                                                                        await PositionService.deletePosition(pos.id);
                                                                        setPositionen(prev => prev.filter(p => p.id !== pos.id));
                                                                    } catch (error) {
                                                                        console.error("Failed to delete position:", error);
                                                                        alert("Fehler beim Löschen der Position.");
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <ListTodo className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-sm font-bold text-muted-foreground">Keine Positionen für dieses Teilsystem erfasst.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
