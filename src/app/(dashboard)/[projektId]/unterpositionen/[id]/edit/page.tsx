'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubPositionService } from '@/lib/services/subPositionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Unterposition, Lagerort, Beschichtung, PlanStatus } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const BESCHICHTUNGEN: Beschichtung[] = [
    'feuerverzinkt', 'pulverbeschichtet', 'nasslackiert', 'eloxiert', 'kunststoffbeschichtet', 'unbehandelt', 'andere'
];
const PLAN_STATUS: { value: PlanStatus; label: string }[] = [
    { value: 'offen', label: 'Offen' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung' },
    { value: 'freigegeben', label: 'Freigegeben' },
    { value: 'fertig', label: 'Fertig' },
    { value: 'geaendert', label: 'Geändert' },
    { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

const unterpositionSchema = z.object({
    posNummer: z.string().min(1, 'Positionsnummer ist erforderlich'),
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(0.01),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().optional(),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    bemerkung: z.string().optional(),
});

type UnterpositionValues = z.infer<typeof unterpositionSchema>;

export default function UnterpositionEditPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<UnterpositionValues>({
        resolver: zodResolver(unterpositionSchema),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [data, lo] = await Promise.all([
                    SubPositionService.getUnterpositionById(id),
                    LagerortService.getLagerorte(projektId),
                ]);
                if (data) {
                    setUnterposition(data);
                    reset({
                        posNummer: data.posNummer || '',
                        name: data.name,
                        menge: data.menge,
                        einheit: data.einheit,
                        status: data.status as any,
                        planStatus: data.planStatus || '',
                        beschichtung: data.beschichtung || '',
                        gewicht: data.gewicht,
                        lagerortId: data.lagerortId || '',
                        bemerkung: data.bemerkung || '',
                    } as any);
                }
                setLagerorte(lo);
            } catch (error) {
                console.error('Failed to load unterposition', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, projektId, reset]);

    const onSubmit = async (data: UnterpositionValues) => {
        try {
            await SubPositionService.updateUnterposition(id, {
                ...data,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
            });
            router.push(`/${projektId}/unterpositionen/${id}`);
        } catch (error) {
            console.error('Failed to update unterposition', error);
            alert('Fehler beim Speichern');
        }
    };

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-end">
                <Link href={`/${projektId}/unterpositionen/${id}`}>
                    <Button variant="outline" size="sm" className="font-bold gap-2 h-9 text-xs">
                        <ArrowLeft className="h-3 w-3" />
                        Zurück
                    </Button>
                </Link>
            </div>

            {/* Context Header */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border-2 border-border">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">UNTERPOSITION BEARBEITEN</span>
                <h1 className="text-3xl font-black text-foreground tracking-tight mt-1">
                    {unterposition?.posNummer} {unterposition?.name}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="border-2 border-border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                            Daten bearbeiten
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Input label="Pos-Nr. *" {...register('posNummer')} error={errors.posNummer?.message} />
                            </div>
                            <div className="md:col-span-3">
                                <Input label="Bezeichnung *" {...register('name')} error={errors.name?.message} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Menge *" type="number" step="0.01" {...register('menge')} error={errors.menge?.message} />
                            <Input label="Einheit" placeholder="Stk, m, m²" {...register('einheit')} error={errors.einheit?.message} />
                            <Input label="Gewicht (kg)" type="number" step="0.1" {...register('gewicht')} placeholder="Optional" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Status *"
                                options={[
                                    { value: 'offen', label: 'Offen' },
                                    { value: 'bestellt', label: 'Bestellt' },
                                    { value: 'in_produktion', label: 'In Produktion' },
                                    { value: 'verbaut', label: 'Verbaut' },
                                    { value: 'abgeschlossen', label: 'Abgeschlossen' },
                                ]}
                                {...register('status')}
                                error={errors.status?.message}
                            />
                            <Select
                                label="Plan-Status"
                                options={[
                                    { value: '', label: '— Kein Plan-Status —' },
                                    ...PLAN_STATUS.map(p => ({ value: p.value, label: p.label }))
                                ]}
                                {...register('planStatus')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Beschichtung"
                                options={[
                                    { value: '', label: '— Keine Beschichtung —' },
                                    ...BESCHICHTUNGEN.map(b => ({ value: b, label: b }))
                                ]}
                                {...register('beschichtung')}
                            />
                            <LagerortSelect
                                projektId={projektId}
                                lagerorte={lagerorte}
                                onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                {...register('lagerortId')}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                            <textarea
                                className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                                {...register('bemerkung')}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end gap-3">
                        <Link href={`/${projektId}/unterpositionen/${id}`}>
                            <Button type="button" variant="ghost" className="font-bold">Abbrechen</Button>
                        </Link>
                        <Button type="submit" className="font-bold gap-2 min-w-[140px]" disabled={isSubmitting}>
                            <Save className="h-4 w-4" />
                            {isSubmitting ? 'Speichert...' : 'Speichern'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
