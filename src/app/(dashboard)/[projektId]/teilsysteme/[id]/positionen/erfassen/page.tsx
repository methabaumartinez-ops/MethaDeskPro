'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, ClipboardList, ListTodo, PlusCircle, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { SubsystemService } from '@/lib/services/subsystemService';
import { PositionService } from '@/lib/services/positionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Position, Teilsystem, Lagerort, PlanStatus, Beschichtung } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses } from '@/lib/config/statusConfig';
import { ProvisionalDateInput } from '@/components/ui/provisional-date-input';

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
    posNummer: z.string().optional(),
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
    abteilung: z.string().optional(),
});

type PositionValues = z.infer<typeof positionSchema>;

export default function PositionErfassenPage() {
    const { projektId, id: teilsystemId } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (teilsystemId) {
                const [ts, lo] = await Promise.all([
                    SubsystemService.getTeilsystemById(teilsystemId),
                    LagerortService.getLagerorte(projektId)
                ]);
                if (ts) {
                    setTeilsystem(ts);
                    if (ts.abteilung) setValue('abteilung', ts.abteilung);
                }
                setLagerorte(lo);
            }
        };
        loadData();
    }, [teilsystemId, projektId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            console.log("File selected:", e.target.files[0].name);
            toast.info(`Datei "${e.target.files[0].name}" zum Upload bereit.`);
        }
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors, isSubmitting },
    } = useForm<PositionValues>({
        resolver: zodResolver(positionSchema),
        defaultValues: {
            status: 'offen',
            einheit: 'Stk',
            teilsystemId: teilsystemId || '',
        }
    });

    const onSubmit = async (data: PositionValues) => {
        try {
            await PositionService.createPosition(data as any);
            toast.success("Position erstellt");
            router.push(`/${projektId}/teilsysteme/${teilsystemId}`);
        } catch (error) {
            console.error("Error creating position:", error);
            toast.error("Fehler beim Speichern der Position.");
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            console.log("File dropped:", e.dataTransfer.files[0].name);
            toast.info(`Datei "${e.dataTransfer.files[0].name}" zum Upload bereit.`);
        }
    };

    if (!teilsystemId) {
        return <div className="p-10 text-center text-red-500 font-bold">Fehler: Keine Teilsystem-ID angegeben.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <ModuleActionBanner
                icon={ClipboardList}
                title="Position erfassen"
                showBackButton={true}
                backHref={`/${projektId}/teilsysteme/${teilsystemId}`}
            />

            {/* Context Header removed in favor of readonly form fields */}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Information */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="shadow-xl border-none">
                            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Positions-Informationen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <input type="hidden" {...register('teilsystemId')} />
                                <input type="hidden" {...register('abteilung')} />

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Context Row */}
                                    <div className="md:col-span-12 space-y-1.5 mb-2">
                                        <label className="text-sm font-semibold text-foreground ml-1">Zugeordnetes Teilsystem</label>
                                        <div className="flex h-10 w-full items-center gap-3 rounded-xl border border-input bg-muted/50 px-3 py-2 text-sm font-bold text-foreground cursor-not-allowed">
                                            <span className="text-primary tracking-widest uppercase">{(teilsystem?.teilsystemNummer || teilsystemId || '').replace(/^ts\s?/i, '')}</span>
                                            <div className="h-4 w-px bg-border"></div>
                                            <span>{teilsystem?.name || 'Wird geladen...'}</span>
                                        </div>
                                    </div>

                                    {/* Row 1: Designation (Wide) */}
                                    <div className="md:col-span-9">
                                        <Input
                                            label="Bezeichnung *"
                                            placeholder="z.B. Fensterfront Typ A"
                                            {...register('name')}
                                            error={errors.name?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input
                                            label="Pos-Nr."
                                            placeholder="z.B. 10.1"
                                            {...register('posNummer')}
                                            error={errors.posNummer?.message}
                                        />
                                    </div>

                                    {/* Row 2: Quantities and Status (Varied) */}
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Menge *"
                                            type="number"
                                            step="0.01"
                                            {...register('menge')}
                                            error={errors.menge?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Einheit"
                                            placeholder="Stk, m, m²"
                                            {...register('einheit')}
                                            error={errors.einheit?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Gewicht (kg)"
                                            type="number"
                                            step="0.1"
                                            {...register('gewicht')}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Controller
                                            name="montagetermin"
                                            control={control}
                                            render={({ field }) => (
                                                <ProvisionalDateInput
                                                    label="Montagetermin"
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    name={field.name}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Select
                                            label="Status *"
                                            options={POS_ALLOWED_STATUSES.map(st => ({
                                                value: STATUS_UI_CONFIG[st].value,
                                                label: STATUS_UI_CONFIG[st].label
                                            }))}
                                            {...register('status')}
                                            error={errors.status?.message}
                                            className={cn('font-bold', getStatusColorClasses(watch('status')))}
                                        />
                                    </div>

                                    {/* Row 3: Plan-Status and Logistics (Medium) */}
                                    <div className="md:col-span-4">
                                        <Select
                                            label="Plan-Status"
                                            options={[
                                                { value: '', label: 'Kein Plan-Status' },
                                                ...PLAN_STATUS.map(p => ({ value: p.value, label: p.label }))
                                            ]}
                                            {...register('planStatus')}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Select
                                            label="Beschichtung"
                                            options={[
                                                { value: '', label: 'Keine Beschichtung' },
                                                ...BESCHICHTUNGEN.map(b => ({ value: b, label: b }))
                                            ]}
                                            {...register('beschichtung')}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <LagerortSelect
                                            projektId={projektId}
                                            lagerorte={lagerorte}
                                            onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                            {...register('lagerortId')}
                                        />
                                    </div>

                                    {/* Row 4: Remarks (Wide) */}
                                    <div className="md:col-span-12 space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                            placeholder="Zusätzliche Notizen zur Position..."
                                            {...register('bemerkung')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: File Upload */}
                    <div className="space-y-4 sticky top-6 mt-1 lg:mt-0">
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-3 px-4">
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <UploadCloud className="h-3.5 w-3.5 text-primary" />
                                    Dokumente / Skizzen
                                </CardTitle>
                            </CardHeader>
                            <CardContent
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 transition-colors cursor-pointer m-2 rounded-lg border-2 border-transparent hover:bg-muted/50",
                                    dragActive ? "bg-primary/5 border-primary border-dashed" : ""
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="bg-background p-3 rounded-full shadow-sm mb-3">
                                    <UploadCloud className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xs font-bold text-foreground mb-1">Dateien hierher ziehen</h3>
                                <p className="text-[10px] font-medium text-muted-foreground mb-4 text-center">
                                    PDF, DXF, DWG, images (Max. 50MB)
                                </p>
                                <Button type="button" size="sm" variant="outline" className="text-xs font-bold border-border h-8 px-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                    <Link href={`/${projektId}/teilsysteme/${teilsystemId}`}>
                        <Button type="button" variant="outline" className="font-bold h-11 px-8">
                            Abbrechen
                        </Button>
                    </Link>
                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-black px-10 h-11 text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-transform" disabled={isSubmitting}>
                        {isSubmitting ? 'Wird gespeichert...' : 'Position speichern'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
