'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PositionService } from '@/lib/services/positionService';
import { Position } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import Link from 'next/link';

export default function PositionDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const [position, setPosition] = useState<Position | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const data = await PositionService.getPositionById(id);
                setPosition(data);
            } catch (error) {
                console.error("Failed to load position", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Laden...</div>;
    if (!position) return <div className="p-10 text-center text-red-500">Position nicht gefunden</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zurück
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{position.name}</h1>
                </div>
                <Link href={`/${projektId}/positionen/${position.id}/edit`}>
                    <Button className="gap-2">
                        <Edit className="h-4 w-4" />
                        Bearbeiten
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Menge</span>
                            <span className="font-bold">{position.menge} {position.einheit}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Status</span>
                            <StatusBadge status={position.status} />
                        </div>
                        {position.teilsystemId && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">Teilsystem ID</span>
                                <span className="font-mono text-sm">{position.teilsystemId}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
