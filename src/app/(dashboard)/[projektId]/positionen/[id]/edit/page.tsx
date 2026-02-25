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
import { PositionService } from '@/lib/services/positionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { Position, Lagerort, Beschichtung, PlanStatus } from '@/types';
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

const positionSchema = z.object({
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(0.01),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().optional(),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    montagetermin: z.string().optional(),
    bemerkung: z.string().optional(),
});

type PositionValues = z.infer<typeof positionSchema>;

export default function PositionEditPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [position, setPosition] = useState<Position | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<PositionValues>({
        resolver: zodResolver(positionSchema),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [data, lo] = await Promise.all([
                    PositionService.getPositionById(id),
                    LagerortService.getLagerorte(projektId),
                ]);
                if (data) {
                    setPosition(data);
                    reset({
                        name: data.name,
                        menge: data.menge,
                        einheit: data.einheit,
                        status: data.status as any,
                        planStatus: data.planStatus || '',
                        beschichtung: data.beschichtung || '',
                        gewicht: data.gewicht,
                        lagerortId: data.lagerortId || '',
                        montagetermin: data.montagetermin || '',
                        bemerkung: data.bemerkung || '',
                    } as any);
                }
                setLagerorte(lo);
            } catch (error) {
                console.error('Failed to load position', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, projektId, reset]);

    const onSubmit = async (data: PositionValues) => {
        try {
            await PositionService.updatePosition(id, {
                ...data,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
            });
            router.push(`/${projektId}/positionen/${id}`);
        } catch (error) {
            console.error('Failed to update position', error);
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
                <Link href={`/${projektId}/positionen/${id}`}>
                    <Button variant="outline" size="sm" className="font-bold gap-2 h-9 text-xs">
                        <ArrowLeft className="h-3 w-3" />
                        Zurück
                    </Button>
                </Link>
            </div>

            {/* Context Header */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border-2 border-border">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">POSITION BEARBEITEN</span>
                <h1 className="text-3xl font-black text-foreground tracking-tight mt-1">{position?.name}</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="border-2 border-border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                            Daten bearbeiten
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <Input label="Bezeichnung *" {...register('name')} error={errors.name?.message} />
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
                            <Select
                                label="Lagerort"
                                options={[
                                    { value: '', label: '— Kein Lagerort —' },
                                    ...lagerorte.map(l => ({ value: l.id, label: `${l.bezeichnung}${l.bereich ? ` (${l.bereich})` : ''}` }))
                                ]}
                                {...register('lagerortId')}
                            />
                        </div>
                        <Input label="Montagetermin" placeholder="z.B. nach Absprache" {...register('montagetermin')} />
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                            <textarea
                                className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                                {...register('bemerkung')}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end gap-3">
                        <Link href={`/${projektId}/positionen/${id}`}>
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
