'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { SupplierService } from '@/lib/services/supplierService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Position, Teilsystem, Projekt, Lagerort, Beschichtung, PlanStatus } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses } from '@/lib/config/statusConfig';
import { ArrowLeft, Save, PlusCircle, ListTodo, ClipboardList, UploadCloud, FileType, Paperclip, FileText, X } from 'lucide-react';
import { useRef } from 'react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { ProvisionalDateInput } from '@/components/ui/provisional-date-input';
import { cn } from '@/lib/utils';

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
    planStatus: z.string().min(1, 'Plan Status ist erforderlich'),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    lieferantId: z.string().optional(),
    montagetermin: z.string().optional(),
    bemerkung: z.string().optional(),
    abteilung: z.string().optional(),
});

type PositionValues = z.infer<typeof positionSchema>;

export default function PositionErfassenPage() {
    const { projektId } = useParams() as { projektId: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const teilsystemId = searchParams.get('teilsystemId');

    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [allLieferanten, setAllLieferanten] = useState<any[]>([]);

    const [dragActive, setDragActive] = useState(false);
    const [docDragActive, setDocDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [dokumenteFiles, setDokumenteFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

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
            const file = e.dataTransfer.files[0];
            setSelectedFile(file.name);
        }
    };

    const handleDocDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDocDragActive(true);
        } else if (e.type === "dragleave") {
            setDocDragActive(false);
        }
    };

    const handleDocDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDocDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setDokumenteFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setDokumenteFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
        }
    };

    const removeDocFile = (index: number) => {
        setDokumenteFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0].name);
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
            planStatus: 'offen',
            einheit: 'Stk',
            teilsystemId: teilsystemId || '',
        }
    });

    useEffect(() => {
        const loadContext = async () => {
            if (teilsystemId) {
                const ts = await SubsystemService.getTeilsystemById(teilsystemId);
                if (ts) {
                    setTeilsystem(ts);
                    if (ts.abteilung) setValue('abteilung', ts.abteilung);
                }
            }
            const [lo, lieferantenData] = await Promise.all([
                LagerortService.getLagerorte(projektId),
                SupplierService.getLieferanten(),
            ]);
            setLagerorte(lo);
            setAllLieferanten(Array.isArray(lieferantenData) ? lieferantenData : []);
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
                abteilung: data.abteilung as any,
            };
            await PositionService.createPosition(newItem);
            toast.success("Position erstellt");
            router.push(`/${projektId}/teilsysteme/${teilsystemId}`);
        } catch (error) {
            console.error('Failed to create position', error);
            toast.error('Fehler beim Speichern');
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

            {/* Context Header - Secondary info about the Teilsystem */}
            <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-4 px-6 -mt-2">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Zugeordnetes Teilsystem</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-black text-foreground tracking-tight">
                            {(teilsystem?.teilsystemNummer || teilsystemId || '').replace(/^ts\s?/i, '')}
                        </span>
                        <span className="text-xl font-bold text-foreground/80 tracking-tight">{teilsystem?.name}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form Card */}
                    <Card className="lg:col-span-2 shadow-sm border-2 border-border">
                        <CardContent className="p-6 pt-5">
                            <input type="hidden" {...register('teilsystemId')} />
                            <input type="hidden" {...register('abteilung')} />

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                {/* Row 1: Designation (Wide) */}
                                <div className="md:col-span-12">
                                    <Input
                                        label="Bezeichnung *"
                                        placeholder="z.B. Fensterfront Typ A"
                                        {...register('name')}
                                        error={errors.name?.message}
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

                                {/* Row 3: Plan-Status and Logistics (Medium) */}
                                <div className="md:col-span-4">
                                    <Select
                                        label="Plan Status *"
                                        options={PLAN_STATUS.map(p => ({ value: p.value, label: p.label }))}
                                        {...register('planStatus')}
                                        error={errors.planStatus?.message}
                                        className={cn('font-bold', getStatusColorClasses(watch('planStatus')))}
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

                                {/* Lieferant */}
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
                                </div>

                                {/* Row 4: Remarks (Wide) */}
                                <div className="md:col-span-12 space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                    <textarea
                                        className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                        placeholder="Zusätzliche Notizen zur Position..."
                                        {...register('bemerkung')}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Column: Uploads */}
                    <div className="space-y-4 sticky top-6 mt-1 lg:mt-0">
                        {/* IFC Upload Card */}
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-3 px-4">
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <UploadCloud className="h-3.5 w-3.5 text-primary" />
                                    IFC Modell
                                </CardTitle>
                            </CardHeader>
                            <CardContent
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 transition-colors cursor-pointer m-2 mt-1 rounded-lg border-2 border-transparent hover:bg-muted/50",
                                    dragActive ? "bg-primary/5 border-primary border-dashed" : ""
                                )}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="bg-background p-2 rounded-full shadow-sm mb-2">
                                    <FileType className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-[11px] font-bold text-foreground mb-1">IFC hierher ziehen</h3>
                                <p className="text-[9px] font-medium text-muted-foreground mb-3 text-center">
                                    Nur .ifc (Max. 200MB)
                                </p>
                                <Button type="button" size="sm" variant="outline" className="text-[10px] font-bold border-border h-7 px-3" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    accept=".ifc"
                                    onChange={handleFileChange}
                                />
                                {selectedFile && (
                                    <div className="mt-3 w-full space-y-2">
                                        <div className="p-1.5 bg-green-50 text-green-700 rounded text-[10px] font-bold flex items-center gap-1.5 w-full truncate border border-green-200">
                                            <FileType className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{selectedFile}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Dokumente Upload Card */}
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-3 px-4">
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                                    Dokumente / Skizzen
                                </CardTitle>
                            </CardHeader>
                            <CardContent
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 transition-colors cursor-pointer m-2 mt-1 rounded-lg border-2 border-transparent hover:bg-muted/50",
                                    docDragActive ? "bg-primary/5 border-primary border-dashed" : ""
                                )}
                                onDragEnter={handleDocDrag}
                                onDragLeave={handleDocDrag}
                                onDragOver={handleDocDrag}
                                onDrop={handleDocDrop}
                                onClick={() => docInputRef.current?.click()}
                            >
                                <div className="bg-background p-2 rounded-full shadow-sm mb-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-[11px] font-bold text-foreground mb-1">Dateien hierher ziehen</h3>
                                <p className="text-[9px] font-medium text-muted-foreground mb-3 text-center">
                                    pdf, jpg, png, heic
                                </p>
                                <Button type="button" size="sm" variant="outline" className="text-[10px] font-bold border-border h-7 px-3" onClick={(e) => { e.stopPropagation(); docInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={docInputRef}
                                    accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx"
                                    multiple
                                    onChange={handleDocFileChange}
                                />
                            </CardContent>

                            {/* Uploaded Document List */}
                            {dokumenteFiles.length > 0 && (
                                <div className="px-3 pb-3 space-y-1.5">
                                    {dokumenteFiles.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-border text-[10px] group shadow-sm">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="truncate font-medium">{file.name}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); removeDocFile(i); }}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-muted-foreground italic px-1 pt-1 text-center">Dateien werden beim Speichern hochgeladen.</p>
                                </div>
                            )}
                        </Card>
                    </div>

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

                {/* Bottom Action Row */}
                <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
                    <Link href={`/${projektId}/teilsysteme/${teilsystemId}`}>
                        <Button
                            type="button"
                            variant="outline"
                            className="font-bold h-11 px-8"
                        >
                            Abbrechen
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        className="font-bold h-11 px-8 gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg active:scale-95 transition-all w-full sm:w-auto"
                        disabled={isSubmitting}
                    >
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Speichert...' : 'Position speichern'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
