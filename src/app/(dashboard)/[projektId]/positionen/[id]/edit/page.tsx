'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PositionService } from '@/lib/services/positionService';
import { Position } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const positionSchema = z.object({
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(1, 'Menge muss mindestens 1 sein'),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
});

type PositionValues = z.infer<typeof positionSchema>;

export default function PositionEditPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm<PositionValues>({
        resolver: zodResolver(positionSchema),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const data = await PositionService.getPositionById(id);
                if (data) {
                    reset({
                        name: data.name,
                        menge: data.menge,
                        einheit: data.einheit,
                        status: data.status,
                    });
                }
            } catch (error) {
                console.error("Failed to load position", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, reset]);

    const onSubmit = async (data: PositionValues) => {
        try {
            await PositionService.updatePosition(id, data);
            router.push(`/${projektId}/positionen`);
        } catch (error) {
            console.error("Failed to update position", error);
            alert("Fehler beim Speichern");
        }
    };

    if (loading) return <div className="p-10 text-center">Laden...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/${projektId}/positionen`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Zurück
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Position bearbeiten</h1>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Daten bearbeiten</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Input label="Bezeichnung" {...register('name')} error={errors.name?.message} />
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Menge" type="number" {...register('menge')} error={errors.menge?.message} />
                            <Input label="Einheit" {...register('einheit')} error={errors.einheit?.message} />
                        </div>
                        <Select label="Status" options={[{ label: 'Offen', value: 'offen' }, { label: 'Bestellt', value: 'bestellt' }, { label: 'Verbaut', value: 'verbaut' }]} {...register('status')} error={errors.status?.message} />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="gap-2" disabled={isSubmitting}>
                                <Save className="h-4 w-4" />
                                {isSubmitting ? 'Speichert...' : 'Speichern'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
