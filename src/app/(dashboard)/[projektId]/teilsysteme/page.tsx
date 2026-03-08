'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { Teilsystem, Projekt } from '@/types';
import { Layers, Hammer, Factory } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TeilsystemTable } from '@/components/shared/TeilsystemTable';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function TeilsystemeListPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    let fromParam = '';
    if (pathname.includes('/produktion/avor')) fromParam = '?from=avor';
    else if (pathname.includes('/produktion/planung')) fromParam = '?from=planner';
    else if (pathname.includes('/produktion/einkauf')) fromParam = '?from=einkauf';
    else if (pathname.includes('/ausfuehrung')) fromParam = '?from=ausfuehrung';
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('alle');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [teilsysteme, proj] = await Promise.all([
                    SubsystemService.getTeilsysteme(projektId),
                    ProjectService.getProjektById(projektId)
                ]);
                setItems(teilsysteme);
                setProject(proj);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projektId]);

    const filteredItems = items.filter(item => {
        const matchesSearch =
            (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (item.name?.toLowerCase() || '').includes(search.toLowerCase());
        return matchesSearch;
    });

    const baumeisterItems = filteredItems.filter(item => item.ks === '1' || String(item.ks).toLowerCase().includes('baumeister'));
    const produktionItems = filteredItems.filter(item => item.ks === '2' || String(item.ks).toLowerCase().includes('produkt'));

    const autocompleteItems = items.map(i => ({
        id: i.id,
        label: `${i.teilsystemNummer ?? ''} — ${i.name}`.trim(),
    }));

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Layers}
                title="TeilSysteme"
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/teilsysteme/${id}${fromParam}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder="Suche nach Nummer o. Name..."
                ctaLabel="Neu TS erfassen"
                ctaHref={`/${projektId}/teilsysteme/erfassen`}
            />

            <Tabs className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <TabsList className="bg-white shadow-sm border border-slate-100 p-1.5 h-auto rounded-2xl">
                        <TabsTrigger 
                            active={activeTab === 'alle'} 
                            onClick={() => setActiveTab('alle')} 
                            className="px-6 py-2.5 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Alle
                                <Badge className="ml-2 bg-slate-100 text-slate-500 hover:bg-slate-200 border-none h-5 px-1.5 font-black text-[10px]">
                                    {filteredItems.length}
                                </Badge>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger 
                            active={activeTab === 'baumeister'} 
                            onClick={() => setActiveTab('baumeister')} 
                            className="px-6 py-2.5 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Hammer className="w-4 h-4" />
                                Baumeister
                                <Badge className={activeTab === 'baumeister' ? "ml-2 bg-white/50 text-orange-900 border-none h-5 px-1.5 font-black text-[10px]" : "ml-2 bg-orange-100 text-orange-600 border-none h-5 px-1.5 font-black text-[10px]"}>
                                    {baumeisterItems.length}
                                </Badge>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger 
                            active={activeTab === 'produktion'} 
                            onClick={() => setActiveTab('produktion')} 
                            className="px-6 py-2.5 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4" />
                                Produktion
                                <Badge className={activeTab === 'produktion' ? "ml-2 bg-white/50 text-orange-900 border-none h-5 px-1.5 font-black text-[10px]" : "ml-2 bg-blue-100 text-blue-600 border-none h-5 px-1.5 font-black text-[10px]"}>
                                    {produktionItems.length}
                                </Badge>
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent active={activeTab === 'alle'} className="mt-0">
                    {renderTableContent(filteredItems, loading, projektId, project)}
                </TabsContent>
                <TabsContent active={activeTab === 'baumeister'} className="mt-0">
                    {renderTableContent(baumeisterItems, loading, projektId, project)}
                </TabsContent>
                <TabsContent active={activeTab === 'produktion'} className="mt-0">
                    {renderTableContent(produktionItems, loading, projektId, project)}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function renderTableContent(displayItems: Teilsystem[], loading?: boolean, projektId?: string, project?: Projekt | null) {
    return (
        <Card className="shadow-xl border-2 border-border overflow-hidden rounded-[2rem]">
            <CardContent className="p-0">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                    </div>
                ) : displayItems.length > 0 ? (
                    <TeilsystemTable
                        items={displayItems}
                        projektId={projektId || ''}
                        projekt={project}
                    />
                ) : (
                    <div className="py-32 text-center flex flex-col items-center">
                        <div className="p-6 bg-muted/30 rounded-full mb-6">
                            <Layers className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme gefunden</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                            Ändern Sie Ihre Suche o. erfassen Sie ein neues Teilsystem in diesem Bereich.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
