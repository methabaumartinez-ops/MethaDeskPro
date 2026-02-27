'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BestellService } from '@/lib/services/bestellService';
import { ProjectService } from '@/lib/services/projectService';
import { MaterialBestellung, BestellungItem, Projekt } from '@/types';
import { Warehouse, Package, CheckCircle2, Circle, Truck, Inbox, ArrowRight, Check, Edit2, MessageSquare, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WerkhofPage() {
    const { projektId: urlProjektId } = useParams() as { projektId: string };
    const router = useRouter();
    const { currentUser } = useProjekt();
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [orders, projs] = await Promise.all([
                BestellService.getBestellungen(), // Fetch ALL orders
                ProjectService.getProjekte() // Fetch ALL projects
            ]);
            setBestellungen(orders.sort((a, b) => new Date(b.bestelldatum).getTime() - new Date(a.bestelldatum).getTime()));
            setProjekte(projs);
        } catch (error) {
            console.error("Fehler beim Laden der Daten", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getProjektName = (id: string) => {
        return projekte.find(p => p.id === id)?.projektname || id;
    };

    const handleToggleItem = async (bestellungId: string, item: BestellungItem) => {
        try {
            const updated = await BestellService.toggleItemVorbereitet(bestellungId, item.id, !item.vorbereitet);

            // Check if all items are now vorbereitet
            const allReady = updated.items.every(i => i.vorbereitet);
            if (allReady && updated.status === 'in_bearbeitung' || updated.status === 'angefragt') {
                await BestellService.updateBestellungStatus(bestellungId, 'bereit');
            } else if (!allReady && updated.status === 'bereit') {
                await BestellService.updateBestellungStatus(bestellungId, 'in_bearbeitung');
            }

            // Immediately change local state for snappiness
            setBestellungen(current => current.map(b => {
                if (b.id === bestellungId) {
                    const newItems = b.items.map(i => i.id === item.id ? { ...i, vorbereitet: !item.vorbereitet } : i);
                    const newAllReady = newItems.every(i => i.vorbereitet);
                    let newStatus = b.status;
                    if (newAllReady && ['angefragt', 'in_bearbeitung'].includes(b.status)) newStatus = 'bereit';
                    if (!newAllReady && b.status === 'bereit') newStatus = 'in_bearbeitung';
                    return { ...b, items: newItems, status: newStatus };
                }
                return b;
            }));
        } catch (error) {
            console.error("Fehler beim Aktualisieren", error);
        }
    };

    const handleUpdateStatus = async (bestellungId: string, status: MaterialBestellung['status']) => {
        try {
            await BestellService.updateBestellungStatus(bestellungId, status);
            setBestellungen(current => current.map(b => b.id === bestellungId ? { ...b, status } : b));
        } catch (error) {
            console.error("Fehler beim Status Update", error);
        }
    };

    const handleUpdateBemerkung = async (bestellungId: string, bemerkung: string) => {
        try {
            await BestellService.updateBestellung(bestellungId, { bemerkung });
            setBestellungen(current => current.map(b => b.id === bestellungId ? { ...b, bemerkung } : b));
        } catch (error) {
            console.error("Fehler beim Speichern des Kommentars", error);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        return (
            <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm",
                status === 'angefragt' ? "bg-amber-100 text-amber-800 border-amber-200" :
                    status === 'in_bearbeitung' ? "bg-blue-100 text-blue-800 border-blue-200" :
                        status === 'bereit' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            status === 'versendet' ? "bg-purple-100 text-purple-800 border-purple-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
            )}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6 h-full flex flex-col pt-2 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-extrabold text-primary tracking-tight">Logistik & Werkhof</h1>
                <p className="text-muted-foreground font-medium mt-1">Materialbestellungen vorbereiten und versenden.</p>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Lade Aufträge...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                    {bestellungen.map(bestellung => {
                        const progress = (bestellung.items.filter(i => i.vorbereitet).length / bestellung.items.length) * 100;
                        const isAllReady = progress === 100;

                        return (
                            <Card key={bestellung.id} className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow flex flex-col h-full">
                                <div className="p-4 border-b border-slate-100 bg-slate-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                                    {new Date(bestellung.bestelldatum).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 truncate max-w-[140px]" title={getProjektName(bestellung.projektId)}>
                                                    {getProjektName(bestellung.projektId)}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-800 text-base">{bestellung.containerBez}</h4>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <StatusBadge status={bestellung.status} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/${bestellung.projektId}/ausfuehrung?edit=${bestellung.id}`);
                                                }}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-500">
                                        Besteller: <span className="text-slate-700">{bestellung.bestelltVon}</span>
                                    </div>
                                </div>

                                <CardContent className="p-0 flex-1 flex flex-col">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                                        <span>Checkliste</span>
                                        <span>{bestellung.items.filter(i => i.vorbereitet).length} / {bestellung.items.length}</span>
                                    </div>

                                    <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                                        {bestellung.items.map(item => (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                                                    item.vorbereitet && "opacity-60 bg-slate-50"
                                                )}
                                                onClick={() => handleToggleItem(bestellung.id, item)}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn(
                                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                        item.vorbereitet ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"
                                                    )}>
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className={cn(
                                                            "text-sm font-bold truncate",
                                                            item.vorbereitet ? "text-slate-500 line-through decoration-slate-300" : "text-slate-700"
                                                        )}>
                                                            {item.materialName}
                                                            {item.tsnummer && <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded no-underline font-mono">TS: {item.tsnummer}</span>}
                                                        </span>
                                                        {item.attachmentUrl && (
                                                            <a
                                                                href={item.attachmentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Package className="h-3 w-3" />
                                                                {item.attachmentName || 'Anhang'}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id={`file-${bestellung.id}-${item.id}`}
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                try {
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('projektId', bestellung.projektId);
                                                                    formData.append('type', 'image');

                                                                    const res = await fetch('/api/upload', {
                                                                        method: 'POST',
                                                                        body: formData
                                                                    });

                                                                    if (!res.ok) throw new Error('Upload failed');
                                                                    const data = await res.json();

                                                                    await BestellService.updateItemAttachment(bestellung.id, item.id, {
                                                                        url: data.url,
                                                                        id: data.id,
                                                                        name: file.name
                                                                    });

                                                                    // Update local state
                                                                    setBestellungen(current => current.map(b => {
                                                                        if (b.id === bestellung.id) {
                                                                            return {
                                                                                ...b,
                                                                                items: b.items.map(i => i.id === item.id ? {
                                                                                    ...i,
                                                                                    attachmentUrl: data.url,
                                                                                    attachmentId: data.id,
                                                                                    attachmentName: file.name
                                                                                } : i)
                                                                            };
                                                                        }
                                                                        return b;
                                                                    }));
                                                                } catch (err) {
                                                                    console.error("Upload error", err);
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-7 w-7",
                                                                item.attachmentUrl ? "text-blue-500" : "text-slate-400 hover:text-orange-600"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                document.getElementById(`file-${bestellung.id}-${item.id}`)?.click();
                                                            }}
                                                        >
                                                            <Camera className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className={cn(
                                                        "text-xs font-black px-2.5 py-1 rounded",
                                                        item.vorbereitet ? "text-slate-400 bg-transparent" : "text-orange-600 bg-orange-50"
                                                    )}>
                                                        {item.menge} {item.einheit}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="px-4 py-3 border-t border-slate-100 bg-white">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquare className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider text-orange-600/70">Kommentare / Versand-Info</span>
                                        </div>
                                        <textarea
                                            className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500/40 outline-none transition-all min-h-[50px] resize-none font-medium text-slate-700 placeholder:text-slate-300"
                                            placeholder="z.B. Direkt auf Baustelle, bereits bestellt..."
                                            defaultValue={bestellung.bemerkung || ''}
                                            onBlur={(e) => handleUpdateBemerkung(bestellung.id, e.target.value)}
                                        />
                                    </div>

                                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 mt-auto">
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full mb-4 overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-500", isAllReady ? 'bg-emerald-500' : 'bg-orange-500')}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        {bestellung.status === 'angefragt' && (
                                            <Button
                                                className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-full"
                                                onClick={() => handleUpdateStatus(bestellung.id, 'in_bearbeitung')}
                                            >
                                                Rüsten starten
                                            </Button>
                                        )}

                                        {(bestellung.status === 'in_bearbeitung' || bestellung.status === 'bereit') && (
                                            <Button
                                                className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-200 rounded-full flex items-center justify-center gap-2 transition-transform hover:scale-105"
                                                onClick={() => handleUpdateStatus(bestellung.id, 'versendet')}
                                                disabled={!isAllReady}
                                            >
                                                <Truck className="h-4 w-4" />
                                                Als versendet markieren
                                            </Button>
                                        )}

                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {bestellungen.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400">
                            <Inbox className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest text-center">Keine Aufträge vorhanden</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
