'use client';
import { toast } from '@/lib/toast';

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
import { PositionService } from '@/lib/services/positionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Unterposition, Position, Teilsystem, Lagerort, Beschichtung, PlanStatus } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG } from '@/lib/config/statusConfig';
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

const subPositionSchema = z.object({
    posNummer: z.string().min(1, 'Positionsnummer ist erforderlich'),
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(0.01),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    positionId: z.string().min(1),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().optional(),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    bemerkung: z.string().optional(),
});

type SubPositionValues = z.infer<typeof subPositionSchema>;

export default function UnterpositionErfassenPage() {
    const { projektId, id: positionId } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [position, setPosition] = useState<Position | null>(null);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SubPositionValues>({
        resolver: zodResolver(subPositionSchema),
        defaultValues: { status: 'offen', einheit: 'Stk', positionId: positionId || '', menge: 1 }
    });

    useEffect(() => {
        const load = async () => {
            const [pos, lo] = await Promise.all([
                positionId ? PositionService.getPositionById(positionId) : null,
                LagerortService.getLagerorte(projektId),
            ]);
            if (pos) setPosition(pos);
            setLagerorte(lo);
        };
        load();
    }, [positionId, projektId]);

    const onSubmit = async (data: SubPositionValues) => {
        try {
            await SubPositionService.createUnterposition({
                ...data,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
            });
            toast.success("Unterposition erstellt");
            router.push(`/${projektId}/positionen/${positionId}`);
        } catch (error) {
            console.error('Error creating sub-position:', error);
            toast.error('Fehler beim Speichern der Unterposition.');
        }
    };

    if (!positionId) {
        return <div className="p-10 text-center text-red-500 font-bold">Fehler: Keine Positions-ID angegeben.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-end">
                <Link href={`/${projektId}/positionen/${positionId}`}>
                    <Button variant="outline" size="sm" className="font-bold gap-2 h-9 text-xs">
                        <ArrowLeft className="h-3 w-3" />
                        Zurück zur Position
                    </Button>
                </Link>
            </div>

            {/* Context Header */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border-2 border-border">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Position</span>
                    <ArrowLeft className="h-3 w-3 text-muted-foreground/30 rotate-180" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">NEUE UNT.POS ZUORDNEN</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground tracking-tight">{position?.posNummer || '—'}</span>
                    <span className="text-3xl font-black text-foreground tracking-tight">{position?.name}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="border-2 border-border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 py-3 px-6">
                        <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                            Unt.Pos-Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <input type="hidden" {...register('positionId')} />

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Input
                                    label="Unt.Pos *"
                                    placeholder="z.B. 10.1.1"
                                    {...register('posNummer')}
                                    error={errors.posNummer?.message}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <Input
                                    label="Bezeichnung *"
                                    placeholder="z.B. Detail Fenster Typ A"
                                    {...register('name')}
                                    error={errors.name?.message}
                                />
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
                                options={POS_ALLOWED_STATUSES.map(st => ({
                                    value: STATUS_UI_CONFIG[st].value,
                                    label: STATUS_UI_CONFIG[st].label
                                }))}
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
                                className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                                placeholder="Zusätzliche Notizen..."
                                {...register('bemerkung')}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end gap-3">
                        <Link href={`/${projektId}/positionen/${positionId}`}>
                            <Button type="button" variant="ghost" className="font-bold">Abbrechen</Button>
                        </Link>
                        <Button type="submit" className="font-bold gap-2 min-w-[180px]" disabled={isSubmitting}>
                            <Save className="h-4 w-4" />
                            {isSubmitting ? 'Speichert...' : 'Unt.Pos speichern'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
