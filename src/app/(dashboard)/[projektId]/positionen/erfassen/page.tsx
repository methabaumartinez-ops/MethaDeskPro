'use client';
import { showAlert } from '@/lib/alert';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Position, Teilsystem, Projekt, Lagerort, Beschichtung, PlanStatus } from '@/types';
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
    teilsystemId: z.string().min(1, 'Teilsystem ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().optional(),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    montagetermin: z.string().optional(),
    bemerkung: z.string().optional(),
});

type PositionValues = z.infer<typeof positionSchema>;

export default function PositionErfassenPage() {
    const { projektId } = useParams() as { projektId: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const teilsystemId = searchParams.get('teilsystemId');

    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<PositionValues>({
        resolver: zodResolver(positionSchema),
        defaultValues: {
            status: 'offen',
            einheit: 'Stk',
            teilsystemId: teilsystemId || '',
            menge: 1,
        }
    });

    useEffect(() => {
        const loadContext = async () => {
            if (teilsystemId) {
                const ts = await SubsystemService.getTeilsystemById(teilsystemId);
                setTeilsystem(ts);
            }
            const lo = await LagerortService.getLagerorte(projektId);
            setLagerorte(lo);
        };
        loadContext();
    }, [teilsystemId, projektId]);

    const onSubmit = async (data: PositionValues) => {
        try {
            const newItem: Partial<Position> = {
                ...data,
                teilsystemId: teilsystemId || data.teilsystemId,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
            };
            await PositionService.createPosition(newItem);
            router.push(`/${projektId}/teilsysteme/${teilsystemId}`);
        } catch (error) {
            console.error('Failed to create position', error);
            showAlert('Fehler beim Speichern');
        }
    };

    if (!teilsystemId) {
        return <div className="p-10 text-center text-red-500 font-bold">Fehler: Keine Teilsystem-ID angegeben.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-end mb-4">
                <Link href={`/${projektId}/teilsysteme/${teilsystemId}`}>
                    <Button variant="outline" size="sm" className="font-bold gap-2 h-9 text-xs">
                        <ArrowLeft className="h-3 w-3" />
                        Zurück zum Teilsystem
                    </Button>
                </Link>
            </div>

            {/* Context Header */}
            <div className="bg-card p-6 rounded-2xl shadow-sm border-2 border-border">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">NEUE POSITION ZUORDNEN</span>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                        {(teilsystem?.teilsystemNummer || teilsystemId || '').replace(/^ts\s?/i, '')}
                    </span>
                    <span className="text-3xl font-black text-foreground tracking-tight">{teilsystem?.name}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form Card */}
                    <Card className="lg:col-span-2 shadow-sm border-2 border-border">
                        <CardHeader className="border-b bg-muted/30 py-3 px-6">
                            <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                                Positions-Informationen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <input type="hidden" {...register('teilsystemId')} />

                            <Input
                                label="Bezeichnung *"
                                placeholder="z.B. Fensterfront Typ A"
                                {...register('name')}
                                error={errors.name?.message}
                            />
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    label="Menge *"
                                    type="number"
                                    step="0.01"
                                    {...register('menge')}
                                    error={errors.menge?.message}
                                />
                                <Input
                                    label="Einheit"
                                    placeholder="Stk, m, m²"
                                    {...register('einheit')}
                                    error={errors.einheit?.message}
                                />
                                <Input
                                    label="Gewicht (kg)"
                                    type="number"
                                    step="0.1"
                                    {...register('gewicht')}
                                    placeholder="Optional"
                                />
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
                            <Input
                                label="Montagetermin"
                                placeholder="z.B. Di 03.02.2026 oder nach Absprache"
                                {...register('montagetermin')}
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                <textarea
                                    className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                                    placeholder="Zusätzliche Notizen..."
                                    {...register('bemerkung')}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end gap-3">
                            <Link href={`/${projektId}/teilsysteme/${teilsystemId}`}>
                                <Button type="button" variant="ghost" className="font-bold">Abbrechen</Button>
                            </Link>
                            <Button type="submit" className="font-bold gap-2 min-w-[160px]" disabled={isSubmitting}>
                                <Save className="h-4 w-4" />
                                {isSubmitting ? 'Speichert...' : 'Position speichern'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Info Card */}
                    <div className="space-y-4">
                        <Card className="border-2 border-dashed border-border bg-muted/20">
                            <CardContent className="p-5 space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Hinweise</h3>
                                <ul className="text-xs text-muted-foreground space-y-2">
                                    <li className="flex gap-2"><span className="text-primary">•</span> Lagerort-Zuweisung kann auch per QR-Scan erfolgen</li>
                                    <li className="flex gap-2"><span className="text-primary">•</span> Plan-Status wird mit dem Planer synchronisiert</li>
                                    <li className="flex gap-2"><span className="text-primary">•</span> Dokumente nach Erstellung in der Detailseite hochladen</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Link href={`/${projektId}/lager-scan`} className="block">
                            <Card className="border-2 border-border hover:border-primary/40 transition-colors cursor-pointer">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <span className="text-2xl">📷</span>
                                    <div>
                                        <p className="font-black text-sm">QR Scan starten</p>
                                        <p className="text-xs text-muted-foreground">Lagerort per QR zuweisen</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>
            </form>
        </div>
    );
}
