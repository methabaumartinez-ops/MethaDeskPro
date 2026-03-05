'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Search, Filter, ArrowLeft, Plus } from 'lucide-react';
import { Teilsystem, Projekt, ABTEILUNGEN_CONFIG } from '@/types';
import { TeilsystemTable } from '@/components/shared/TeilsystemTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import Link from 'next/link';

export default function AbteilungPage() {
    const { projektId, abteilung: abteilungSlug } = useParams() as { projektId: string; abteilung: string };
    const router = useRouter();

    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Find department name from slug
    const abteilungConfig = ABTEILUNGEN_CONFIG.find(a => a.id === abteilungSlug);
    const abteilungName = abteilungConfig?.name || abteilungSlug;

    const loadData = async () => {
        setLoading(true);
        try {
            const [teilsystemeRes, projRes] = await Promise.all([
                fetch(`/api/teilsysteme?projektId=${projektId}&abteilungId=${abteilungName}`),
                fetch(`/api/data/projekte/${projektId}`)
            ]);

            if (teilsystemeRes.ok) {
                setItems(await teilsystemeRes.json());
            }
            if (projRes.ok) {
                setProject(await projRes.json());
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projektId, abteilungName]);

    const filteredItems = items.filter(item =>
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.name?.toLowerCase() || '').includes(search.toLowerCase())
    );
    const autocompleteItems = items.map(i => ({
        id: i.id,
        label: `${i.teilsystemNummer ?? ''} — ${i.name}`.trim(),
    }));

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Layers}
                title={abteilungName}
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/teilsysteme/${id}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder="Suche Nummer oder Name..."
                ctaLabel="Neu TS erfassen"
                ctaHref={`/${projektId}/teilsysteme/erfassen?abteilung=${encodeURIComponent(abteilungName)}`}
            />

            {/* MAIN CONTENT TABLE */}
            <Card className="shadow-xl border-2 border-border overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Laden...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <TeilsystemTable
                            items={filteredItems}
                            projektId={projektId}
                            onRefresh={loadData}
                            editable={true}
                            showAbteilung={true}
                            currentAbteilung={abteilungName}
                        />
                    ) : (
                        <div className="py-32 text-center flex flex-col items-center">
                            <div className="p-6 bg-muted/30 rounded-full mb-6">
                                <Layers className="h-16 w-16 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme in {abteilungName}</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                                Für diesen Bereich wurden noch keine Systeme erfasst.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
