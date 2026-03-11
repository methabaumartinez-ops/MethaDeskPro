'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
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
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses } from '@/lib/config/statusConfig';
import { ArrowLeft, Save, PlusCircle, ClipboardList, Package } from 'lucide-react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { cn } from '@/lib/utils';
import { SupplierService } from '@/lib/services/supplierService';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
    planStatus: z.string().min(1, 'Plan Status ist erforderlich'),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    lieferantId: z.string().optional(),
    bemerkung: z.string().optional(),
});

type SubPositionValues = z.infer<typeof subPositionSchema>;

export default function UnterpositionErfassenPage() {
    const { projektId, id: positionId } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [position, setPosition] = useState<Position | null>(null);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [allLieferanten, setAllLieferanten] = useState<any[]>([]);

    const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<SubPositionValues>({
        resolver: zodResolver(subPositionSchema),
        defaultValues: { status: 'offen', planStatus: 'offen', einheit: 'Stk', positionId: positionId || '' }
    });

    useEffect(() => {
        const load = async () => {
            const [pos, lo, lieferantenData] = await Promise.all([
                positionId ? PositionService.getPositionById(positionId) : null,
                LagerortService.getLagerorte(projektId),
                SupplierService.getLieferanten(),
            ]);
            if (pos) setPosition(pos);
            setLagerorte(lo);
            setAllLieferanten(Array.isArray(lieferantenData) ? lieferantenData : []);
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
            <ModuleActionBanner
                icon={PlusCircle}
                title="Unterposition erfassen"
                showBackButton={true}
                backHref={`/${projektId}/positionen/${positionId}`}
            />

            {/* Context Header removed in favor of readonly form fields */}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Information */}
                    <div className="lg:col-span-3 lg:col-start-1 space-y-6">
                        <Card className="shadow-xl border-none">
                            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Unterpositions-Informationen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <input type="hidden" {...register('positionId')} />

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Context Row */}
                                    <div className="md:col-span-12 space-y-1.5 mb-2">
                                        <label className="text-sm font-semibold text-foreground ml-1">Zugeordnete Position</label>
                                        <div className="flex h-10 w-full items-center gap-3 rounded-xl border border-input bg-muted/50 px-3 py-2 text-sm font-bold text-foreground cursor-not-allowed">
                                            <span className="text-primary tracking-widest uppercase">{position?.posNummer || '—'}</span>
                                            <div className="h-4 w-px bg-border"></div>
                                            <span>{position?.name || 'Wird geladen...'}</span>
                                        </div>
                                    </div>
                            {/* Row 1: Number & Name */}
                            <div className="md:col-span-2">
                                <Input
                                    label="Unt.Pos *"
                                    placeholder="z.B. 10.1.1"
                                    {...register('posNummer')}
                                    error={errors.posNummer?.message}
                                />
                            </div>
                            <div className="md:col-span-10">
                                <Input
                                    label="Bezeichnung *"
                                    placeholder="z.B. Detail Fenster Typ A"
                                    {...register('name')}
                                    error={errors.name?.message}
                                />
                            </div>

                            {/* Row 2: Quantities & Status */}
                            <div className="md:col-span-2">
                                <Input label="Menge *" type="number" step="0.01" {...register('menge')} error={errors.menge?.message} />
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Einheit" placeholder="Stk, m, m²" {...register('einheit')} error={errors.einheit?.message} />
                            </div>
                            <div className="md:col-span-2">
                                <Input label="Gewicht (kg)" type="number" step="0.1" {...register('gewicht')} placeholder="Optional" />
                            </div>
                            <div className="md:col-span-3">
                                <Select
                                    label="Pos Status *"
                                    options={POS_ALLOWED_STATUSES.map(st => ({
                                        value: STATUS_UI_CONFIG[st].value,
                                        label: STATUS_UI_CONFIG[st].label
                                    }))}
                                    {...register('status')}
                                    error={errors.status?.message}
                                    className={cn('font-bold', getStatusColorClasses(watch('status')))}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <Select
                                    label="Plan Status *"
                                    options={PLAN_STATUS.map(p => ({ value: p.value, label: p.label }))}
                                    {...register('planStatus')}
                                    error={errors.planStatus?.message}
                                    className={cn('font-bold', getStatusColorClasses(watch('planStatus')))}
                                />
                            </div>

                            {/* Row 3: Coating & Location */}
                            <div className="md:col-span-6">
                                <Select
                                    label="Beschichtung"
                                    options={[
                                        { value: '', label: 'Keine Beschichtung' },
                                        ...BESCHICHTUNGEN.map(b => ({ value: b, label: b }))
                                    ]}
                                    {...register('beschichtung')}
                                />
                            </div>
                            <div className="md:col-span-6">
                                <LagerortSelect
                                    projektId={projektId}
                                    lagerorte={lagerorte}
                                    onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                    {...register('lagerortId')}
                                />
                            </div>
                            <div className="md:col-span-6">
                                <Controller
                                    name="lieferantId"
                                    control={control}
                                    render={({ field }) => (
                                        <SearchableSelect
                                            label="Lieferant"
                                            placeholder="Lieferant suchen..."
                                            options={[
                                                { label: 'Kein Lieferant', value: '' },
                                                ...allLieferanten.map(l => ({ label: l.name, value: l.id }))
                                            ]}
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                            </div>                            {/* Row 4: Remarks */}
                            <div className="md:col-span-12 space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                <textarea
                                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                    placeholder="Zusätzliche Notizen..."
                                    {...register('bemerkung')}
                                />
                            </div>
                        </div>
                    </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                    <Link href={`/${projektId}/positionen/${positionId}`}>
                        <Button type="button" variant="outline" className="font-bold h-11 px-8">
                            Abbrechen
                        </Button>
                    </Link>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-black px-10 h-11 text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-transform gap-2" disabled={isSubmitting}>
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Wird gespeichert...' : 'Unterposition speichern'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
