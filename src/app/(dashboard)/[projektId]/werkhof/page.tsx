'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BestellService } from '@/lib/services/bestellService';
import { ProjectService } from '@/lib/services/projectService';
import { MaterialBestellung, BestellungItem, Projekt } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Package, CheckCircle2, Circle, Truck, Inbox, ArrowRight, Check, Edit2, MessageSquare, Camera, ListChecks, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function WerkhofPage() {
    const { projektId: urlProjektId } = useParams() as { projektId: string };
    const router = useRouter();
    const { currentUser } = useProjekt();
    const [bestellungen, setBestellungen] = useState<MaterialBestellung[]>([]);
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

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

    // Grouping logic
    const groupedBestellungen = bestellungen.reduce((acc, b) => {
        const id = b.projektId || 'unclassified';
        if (!acc[id]) acc[id] = [];
        acc[id].push(b);
        return acc;
    }, {} as Record<string, MaterialBestellung[]>);

    return (
        <div className="space-y-10 h-full flex flex-col pt-2 max-w-7xl mx-auto pb-20 overflow-y-auto scrollbar-hide">
            {/* Sticky Header Section */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mx-4 px-4 py-6 border-b shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Logistik & Werkhof</h1>
                    <p className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.1em] mt-1">Überwachung Materialfluss Projekte</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/20 shadow-inner">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl shadow-sm">
                            <Warehouse className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Status Lager</p>
                            <p className="text-sm font-black text-primary">Normalbetrieb</p>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Lade Aufträge...</p>
                    </div>
                </div>
            ) : Object.keys(groupedBestellungen).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <Inbox className="h-20 w-20 mb-6 opacity-20" />
                    <p className="text-lg font-black uppercase tracking-[0.2em] text-center">Keine Aufträge vorhanden</p>
                    <p className="text-sm font-medium text-slate-400 mt-2">Aktuell gibt es keine aktiven Materialbestellungen.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                    {Object.entries(groupedBestellungen).map(([pId, orders]) => {
                        const openOrders = orders.filter(o => o.status !== 'versendet');
                        const closedOrders = orders.filter(o => o.status === 'versendet');
                        const currentTab = activeTabs[pId] || 'offen';

                        return (
                            <section key={pId} className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white border-2 border-orange-500 rounded-[2.5rem] p-8 shadow-xl shadow-orange-50/50 flex flex-col h-full border-dashed">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[2px] w-8 bg-orange-500" />
                                    <div className="bg-slate-950 text-white font-black px-8 py-3 rounded-2xl text-sm uppercase tracking-[0.2em] shadow-2xl border border-orange-500/30">
                                        {getProjektName(pId)}
                                    </div>
                                    <div className="h-[2px] flex-1 bg-gradient-to-r from-orange-500 to-transparent" />
                                </div>

                                <Tabs>
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                                        <TabsList className="bg-white shadow-sm border border-slate-100 p-1.5 h-auto rounded-2xl">
                                            <TabsTrigger
                                                active={currentTab === 'offen'}
                                                onClick={() => setActiveTabs(prev => ({ ...prev, [pId]: 'offen' }))}
                                                className="px-8 py-3 rounded-xl transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Circle className={cn("w-3 h-3 fill-current", currentTab === 'offen' ? "text-orange-500" : "text-slate-300")} />
                                                    Offene Bestellungen
                                                    <Badge className="ml-2 bg-orange-100 text-orange-600 border-none h-5 px-1.5 font-black text-[10px]">{openOrders.length}</Badge>
                                                </div>
                                            </TabsTrigger>
                                            <TabsTrigger
                                                active={currentTab === 'geschlossen'}
                                                onClick={() => setActiveTabs(prev => ({ ...prev, [pId]: 'geschlossen' }))}
                                                className="px-8 py-3 rounded-xl transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className={cn("w-3 h-3", currentTab === 'geschlossen' ? "text-emerald-500" : "text-slate-300")} />
                                                    Abgeschlossen
                                                    <Badge className="ml-2 bg-slate-100 text-slate-500 border-none h-5 px-1.5 font-black text-[10px]">{closedOrders.length}</Badge>
                                                </div>
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <TabsContent active={currentTab === 'offen'}>
                                        <div className="grid grid-cols-1 gap-6">
                                            {openOrders.length > 0 ? openOrders.map(bestellung => (
                                                <OrderCard
                                                    key={bestellung.id}
                                                    bestellung={bestellung}
                                                    getProjektName={getProjektName}
                                                    handleToggleItem={handleToggleItem}
                                                    handleUpdateStatus={handleUpdateStatus}
                                                    handleUpdateBemerkung={handleUpdateBemerkung}
                                                    StatusBadge={StatusBadge}
                                                    router={router}
                                                    setBestellungen={setBestellungen}
                                                />
                                            )) : (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 italic text-slate-400 font-medium">
                                                    Keine offenen Bestellungen für dieses Projekt
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent active={currentTab === 'geschlossen'}>
                                        <div className="grid grid-cols-1 gap-6">
                                            {closedOrders.length > 0 ? closedOrders.map(bestellung => (
                                                <OrderCard
                                                    key={bestellung.id}
                                                    bestellung={bestellung}
                                                    getProjektName={getProjektName}
                                                    handleToggleItem={handleToggleItem}
                                                    handleUpdateStatus={handleUpdateStatus}
                                                    handleUpdateBemerkung={handleUpdateBemerkung}
                                                    StatusBadge={StatusBadge}
                                                    router={router}
                                                    setBestellungen={setBestellungen}
                                                />
                                            )) : (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 italic text-slate-400 font-medium">
                                                    Keine abgeschlossenen Bestellungen für dieses Projekt
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function OrderCard({
    bestellung,
    getProjektName,
    handleToggleItem,
    handleUpdateStatus,
    handleUpdateBemerkung,
    StatusBadge,
    router,
    setBestellungen
}: {
    bestellung: MaterialBestellung,
    getProjektName: (id: string) => string,
    handleToggleItem: (bId: string, item: BestellungItem) => void,
    handleUpdateStatus: (bId: string, status: MaterialBestellung['status']) => void,
    handleUpdateBemerkung: (bId: string, remark: string) => void,
    StatusBadge: React.FC<{ status: string }>,
    router: any,
    setBestellungen: React.Dispatch<React.SetStateAction<MaterialBestellung[]>>
}) {
    const progress = (bestellung.items.filter(i => i.vorbereitet).length / bestellung.items.length) * 100;
    const isAllReady = progress === 100;

    return (
        <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow flex flex-col h-full rounded-[1.5rem] w-full">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-white/80 border border-slate-100 px-1.5 py-0.5 rounded-lg shrink-0">
                                {new Date(bestellung.bestelldatum).toLocaleString('de-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {bestellung.liefertermin && (
                                <span className="text-[9px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-lg font-black uppercase tracking-tight flex items-center gap-1 animate-pulse shrink-0">
                                    <Clock size={10} strokeWidth={3} />
                                    Bis: {new Date(bestellung.liefertermin).toLocaleDateString('de-CH', { day: '2-digit', month: 'short' })}
                                </span>
                            )}
                        </div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight mb-1">
                            {bestellung.containerBez}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <div className="text-[11px] font-black text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                <Users size={12} className="text-slate-500" />
                                <span className="text-slate-400 font-bold mr-0.5">VON:</span> {bestellung.bestelltVon}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={bestellung.status} />
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-orange-600 hover:bg-orange-50 border-slate-100 rounded-full shadow-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${bestellung.projektId}/ausfuehrung?edit=${bestellung.id}`);
                            }}
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <CardContent className="p-0 flex-1 flex flex-col">
                <div className="bg-slate-50/30 px-5 py-2.5 border-b border-slate-100 flex items-center justify-between text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    <span className="flex items-center gap-2">
                        <ListChecks size={12} className="text-primary" />
                        Checkliste
                    </span>
                    <Badge variant="outline" className="text-slate-600 bg-white border-slate-200 text-[10px] font-black">{bestellung.items.filter(i => i.vorbereitet).length} / {bestellung.items.length}</Badge>
                </div>

                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[180px] scrollbar-hide">
                    {bestellung.items.map(item => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50/80 transition-colors",
                                item.vorbereitet && "opacity-60 bg-slate-50/30"
                            )}
                            onClick={() => handleToggleItem(bestellung.id, item)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn(
                                    "h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300",
                                    item.vorbereitet ? "border-emerald-500 bg-emerald-500 text-white rotate-0" : "border-slate-200 text-transparent"
                                )}>
                                    <Check className="h-4 w-4 stroke-[3]" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                        "text-sm font-black truncate",
                                        item.vorbereitet ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"
                                    )}>
                                        {item.materialName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {item.tsnummer && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black no-underline">TS: {item.tsnummer}</span>}
                                        {item.bemerkung && <span className="text-[9px] text-orange-600 font-bold italic truncate max-w-[150px]">"{item.bemerkung}"</span>}
                                        {item.attachmentUrl && (
                                            <a
                                                href={item.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-black text-blue-500 hover:text-blue-600 flex items-center gap-1 group/link"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Camera className="h-3 w-3 group-hover/link:scale-110 transition-transform" />
                                                FOTO ANSEHEN
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={cn(
                                "text-xs font-black px-2 py-1 rounded-lg min-w-[50px] text-center",
                                item.vorbereitet ? "text-slate-400 bg-transparent" : "text-slate-800 bg-slate-100"
                            )}>
                                {item.menge} {item.einheit}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-2.5 border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="p-1 bg-primary/10 rounded-lg">
                            <MessageSquare className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Kommentare</span>
                    </div>
                </div>

                <div className="p-4 bg-slate-50/30 border-t border-slate-100 mt-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fortschritt</span>
                        <span className="text-[9px] font-black text-slate-900">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mb-4 overflow-hidden shadow-inner p-0.5">
                        <div
                            className={cn("h-full rounded-full transition-all duration-700 ease-out", isAllReady ? 'bg-emerald-500' : 'bg-orange-500')}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {bestellung.status === 'angefragt' && (
                        <Button
                            className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all hover:-translate-y-0.5"
                            onClick={() => handleUpdateStatus(bestellung.id, 'in_bearbeitung')}
                        >
                            Rüsten starten
                        </Button>
                    )}

                    {(bestellung.status === 'in_bearbeitung' || bestellung.status === 'bereit') && (
                        <Button
                            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-orange-200 rounded-2xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                            onClick={() => handleUpdateStatus(bestellung.id, 'versendet')}
                            disabled={!isAllReady}
                        >
                            <Truck className="h-5 w-5" />
                            Versand Bestätigen
                        </Button>
                    )}

                    {bestellung.status === 'versendet' && (
                        <div className="w-full py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Versendet</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
