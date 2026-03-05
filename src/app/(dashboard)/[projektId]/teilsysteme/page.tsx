'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { Teilsystem, Projekt } from '@/types';
import { Layers } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TeilsystemTable } from '@/components/shared/TeilsystemTable';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

export default function TeilsystemeListPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [project, setProject] = useState<Projekt | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

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

    const autocompleteItems = items.map(i => ({
        id: i.id,
        label: `${i.teilsystemNummer ?? ''} — ${i.name}`.trim(),
    }));

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={Layers}
                title="Teilsysteme u. BKP"
                items={autocompleteItems}
                onSelect={(id) => router.push(`/${projektId}/teilsysteme/${id}`)}
                onSearch={(q) => setSearch(q)}
                searchPlaceholder="Suche nach Nummer o. Name..."
                ctaLabel="Neu TS erfassen"
                ctaHref={`/${projektId}/teilsysteme/erfassen`}
            />

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
                        />
                    ) : (
                        <div className="py-32 text-center flex flex-col items-center">
                            <div className="p-6 bg-muted/30 rounded-full mb-6">
                                <Layers className="h-16 w-16 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Keine Teilsysteme gefunden</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-2 font-medium">
                                Ändern Sie Ihre Suche o. erfassen Sie ein neues Teilsystem in diesem Projekt.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
