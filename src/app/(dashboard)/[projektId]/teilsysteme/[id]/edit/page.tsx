'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { mockStore } from '@/lib/mock/store';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const teilsystemSchema = z.object({
    teilsystemNummer: z.string().optional(),
    ks: z.string().optional(),
    name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
    beschreibung: z.string().optional(),
    bemerkung: z.string().optional(),
    eroeffnetAm: z.string().optional(),
    eroeffnetDurch: z.string().optional(),
    montagetermin: z.string().optional(),
    lieferfrist: z.string().optional(),
    abgabePlaner: z.string().optional(),
    planStatus: z.string().optional(),
    wemaLink: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
});

type TeilsystemValues = z.infer<typeof teilsystemSchema>;

export default function TeilsystemEditPage() {
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<TeilsystemValues>({
        resolver: zodResolver(teilsystemSchema),
    });

    useEffect(() => {
        const item = mockStore.getTeilsysteme().find((t: any) => t.id === id);
        if (item) {
            setValue('teilsystemNummer', item.teilsystemNummer || '');
            setValue('ks', item.ks || '');
            setValue('name', item.name);
            setValue('beschreibung', item.beschreibung || '');
            setValue('bemerkung', item.bemerkung || '');
            setValue('eroeffnetAm', item.eroeffnetAm || '');
            setValue('eroeffnetDurch', item.eroeffnetDurch || '');
            setValue('montagetermin', item.montagetermin || '');
            setValue('lieferfrist', item.lieferfrist || '');
            setValue('abgabePlaner', item.abgabePlaner || '');
            setValue('planStatus', item.planStatus || 'offen');
            setValue('wemaLink', item.wemaLink || '');
            setValue('status', item.status);
            setLoading(false);
        } else {
            // Handle error or redirect
            router.push(`/${projektId}/teilsysteme`);
        }
    }, [id, projektId, setValue, router]);

    const onSubmit = async (data: TeilsystemValues) => {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const all = mockStore.getTeilsysteme();
        const updated = all.map((t: any) => t.id === id ? { ...t, ...data } : t);

        mockStore.saveTeilsysteme(updated);
        router.push(`/${projektId}/teilsysteme`);
    };

    if (loading) return <div>Laden...</div>;

    const statusOptions = [
        { label: 'Offen', value: 'offen' },
        { label: 'In Arbeit', value: 'in arbeit' },
        { label: 'Bestellt', value: 'bestellt' },
        { label: 'Verbaut', value: 'verbaut' },
        { label: 'Abgeschlossen', value: 'abgeschlossen' },
    ];

    const planStatusOptions = [
        { label: 'Offen', value: 'offen' },
        { label: 'Fertig', value: 'fertig' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
            <Link href={`/${projektId}/teilsysteme`} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Teilsystem bearbeiten</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="shadow-xl">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg">Teilsystem-Informationen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* First Row: System-Nr, KS, Name */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                                label="System-Nummer"
                                placeholder="z.B. 1050"
                                {...register('teilsystemNummer')}
                                error={errors.teilsystemNummer?.message}
                            />
                            <Input
                                label="KS"
                                placeholder="1 oder BKP"
                                {...register('ks')}
                                error={errors.ks?.message}
                            />
                        </div>

                        <Input
                            label="Bezeichnung *"
                            placeholder="z.B. Baukran"
                            {...register('name')}
                            error={errors.name?.message}
                        />

                        {/* Second Row: Beschreibung */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                placeholder="Kurze Beschreibung des Systems..."
                                {...register('beschreibung')}
                            />
                            {errors.beschreibung && <p className="text-xs font-medium text-red-500 ml-1">{errors.beschreibung.message}</p>}
                        </div>

                        {/* Third Row: Bemerkung */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                            <textarea
                                className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                placeholder="Zusätzliche Notizen..."
                                {...register('bemerkung')}
                            />
                        </div>

                        {/* Fourth Row: Opening info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Eröffnet am"
                                type="text"
                                placeholder="DD.MM.YYYY"
                                {...register('eroeffnetAm')}
                            />
                            <Input
                                label="Eröffnet durch"
                                placeholder="Name"
                                {...register('eroeffnetDurch')}
                            />
                        </div>

                        {/* Fifth Row: Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Montagetermin"
                                type="text"
                                placeholder="z.B. Do 04.12.2025"
                                {...register('montagetermin')}
                            />
                            <Input
                                label="Lieferfrist"
                                type="text"
                                placeholder="Tage oder Datum"
                                {...register('lieferfrist')}
                            />
                            <Input
                                label="Plan-Abgabe"
                                type="text"
                                placeholder="DD.MM.YYYY"
                                {...register('abgabePlaner')}
                            />
                        </div>

                        {/* Sixth Row: Status fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Plan-Status"
                                options={planStatusOptions}
                                {...register('planStatus')}
                            />
                            <Input
                                label="WEMA Link"
                                placeholder="Pfad oder URL"
                                {...register('wemaLink')}
                            />
                            <Select
                                label="Status *"
                                options={statusOptions}
                                {...register('status')}
                                error={errors.status?.message}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end gap-4">
                        <Link href={`/${projektId}/teilsysteme`}>
                            <Button type="button" variant="outline" className="font-bold">Abbrechen</Button>
                        </Link>
                        <Button type="submit" className="font-bold min-w-[140px]" disabled={isSubmitting}>
                            {isSubmitting ? 'Wird gespeichert...' : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    Speichern
                                </span>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div >
    );
}
