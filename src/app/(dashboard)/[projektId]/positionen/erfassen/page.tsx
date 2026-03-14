'use client';
import { toast } from '@/lib/toast';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PositionService } from '@/lib/services/positionService';
import { SubsystemService } from '@/lib/services/subsystemService';
import { SupplierService } from '@/lib/services/supplierService';
import { LagerortService } from '@/lib/services/lagerortService';
import { EmployeeService } from '@/lib/services/employeeService';
import { SubunternehmerService } from '@/lib/services/subunternehmerService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Position, Teilsystem, Lagerort, Beschichtung, PlanStatus, ABTEILUNGEN_CONFIG } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses, getAbteilungColorClasses } from '@/lib/config/statusConfig';
import { Save, ClipboardList, UploadCloud, FileType, Paperclip, FileText, X, PlusCircle, Layers } from 'lucide-react';
import { useRef } from 'react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { cn } from '@/lib/utils';

const BESCHICHTUNGEN: Beschichtung[] = [
    'feuerverzinkt', 'pulverbeschichtet', 'nasslackiert', 'eloxiert', 'kunststoffbeschichtet', 'unbehandelt', 'andere'
];

const PLAN_STATUS: { value: PlanStatus; label: string }[] = [
    { value: 'offen', label: 'Offen' },
    { value: 'in_bearbeitung', label: 'In Bearbeitung' },
    { value: 'freigegeben', label: 'Freigegeben' },
    { value: 'fertig', label: 'Fertig' },
    { value: 'geaendert', label: 'Geaendert' },
    { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

const positionSchema = z.object({
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    posNummer: z.string().optional(),
    menge: z.coerce.number().min(0.01),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    teilsystemId: z.string().min(1, 'Teilsystem ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().min(1, 'Plan Status ist erforderlich'),
    abteilung: z.string().optional(),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    lieferantId: z.string().optional(),
    unternehmerId: z.string().optional(),
    subunternehmerId: z.string().optional(),
    bemerkung: z.string().optional(),
    beschreibung: z.string().optional(),
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
    const [selectedLieferantId, setSelectedLieferantId] = useState<string>('');
    const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
    const [subunternehmerList, setSubunternehmerList] = useState<any[]>([]);

    const [dragActive, setDragActive] = useState(false);
    const [docDragActive, setDocDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [dokumenteFiles, setDokumenteFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0].name);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setSelectedFile(e.target.files[0].name);
    };
    const handleDocDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDocDragActive(true);
        else if (e.type === 'dragleave') setDocDragActive(false);
    };
    const handleDocDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDocDragActive(false);
        if (e.dataTransfer.files?.length > 0) setDokumenteFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    };
    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length > 0) setDokumenteFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    };
    const removeDocFile = (index: number) => setDokumenteFiles(prev => prev.filter((_, i) => i !== index));

    const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<PositionValues>({
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
            const [lo, liefData, empData, subData] = await Promise.all([
                LagerortService.getLagerorte(projektId),
                SupplierService.getLieferanten(),
                EmployeeService.getMitarbeiter(),
                SubunternehmerService.getSubunternehmer(),
            ]);
            setLagerorte(lo);
            setAllLieferanten(Array.isArray(liefData) ? liefData : []);
            setMitarbeiter(empData || []);
            setSubunternehmerList(subData || []);
        };
        loadContext();
    }, [teilsystemId, projektId]);

    const onSubmit = async (data: PositionValues) => {
        try {
            const newItem: Partial<Position> = {
                ...data,
                lieferantId: selectedLieferantId || data.lieferantId,
                teilsystemId: teilsystemId || data.teilsystemId,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
                abteilung: data.abteilung as any,
            };
            await PositionService.createPosition(newItem);
            toast.success('Position erstellt');
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
        <div className="w-full space-y-6 pb-8 animate-in fade-in duration-500">
            <ModuleActionBanner
                icon={ClipboardList}
                title="Position erfassen"
                showBackButton={true}
                backHref={`/${projektId}/teilsysteme/${teilsystemId}`}
            />

            {/* Context Header: Pos-Nr. + Teilsystem info in same row */}
            <div className="bg-white p-4 rounded-2xl border border-border flex items-center gap-6 px-6 -mt-2">
                {/* Pos-Nr. input inline */}
                <div className="flex flex-col gap-1 min-w-[100px]">
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Pos. Nummer</span>
                    <input
                        type="text"
                        placeholder="z.B. 001"
                        className="text-xl font-black text-foreground tracking-tight bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none w-24 pb-0.5"
                        {...register('posNummer')}
                    />
                </div>

                <div className="w-px h-10 bg-border" />

                {/* Teilsystem info */}
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    {/* Left Main Column */}
                    <div className="lg:col-span-3 space-y-6 min-w-0">
                        {/* Main Form Card */}
                        <Card className="shadow-xl border-none">
                            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Positions-Informationen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <input type="hidden" {...register('teilsystemId')} />

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Row 1: Bezeichnung (full width) */}
                                    <div className="md:col-span-12">
                                        <Input
                                            label="Bezeichnung *"
                                            placeholder="z.B. Fensterfront Typ A"
                                            {...register('name')}
                                            error={errors.name?.message}
                                        />
                                    </div>

                                    {/* Row 2: Abteilung + Plan Status + Pos Status */}
                                    <div className="md:col-span-4">
                                        <Select
                                            label="Abteilung"
                                            options={[
                                                { value: '', label: '— Bitte waehlen —' },
                                                ...ABTEILUNGEN_CONFIG.map(a => ({ value: a.name, label: a.name }))
                                            ]}
                                            {...register('abteilung')}
                                            className={cn('font-bold', getAbteilungColorClasses(watch('abteilung')))}
                                        />
                                    </div>
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

                                    {/* Row 3: Menge + Einheit + Lieferant + Gewicht */}
                                    <div className="md:col-span-3">
                                        <Input label="Menge *" type="number" step="0.01" {...register('menge')} error={errors.menge?.message} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input label="Einheit" placeholder="Stk, m, m²" {...register('einheit')} error={errors.einheit?.message} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <SearchableSelect
                                            label="Lieferant"
                                            placeholder="Lieferant suchen..."
                                            options={[
                                                { label: 'Kein Lieferant', value: '' },
                                                ...allLieferanten.map(l => ({ label: l.name, value: l.id }))
                                            ]}
                                            value={selectedLieferantId}
                                            onChange={(val) => setSelectedLieferantId(val)}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input label="Gewicht (kg)" type="number" step="0.1" {...register('gewicht')} placeholder="Optional" />
                                    </div>

                                    {/* Row 4: Unternehmer + Subunternehmer + Lagerort + Beschichtung */}
                                    <div className="md:col-span-3">
                                        <Controller
                                            name="unternehmerId"
                                            control={control}
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    label="Unternehmer"
                                                    options={[
                                                        { label: 'Bitte waehlen...', value: '' },
                                                        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: m.id }))
                                                    ]}
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Controller
                                            name="subunternehmerId"
                                            control={control}
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    label="Subunternehmer"
                                                    options={[
                                                        { label: 'Bitte waehlen...', value: '' },
                                                        ...subunternehmerList.map(s => ({ label: s.name, value: s.id }))
                                                    ]}
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <LagerortSelect
                                            projektId={projektId}
                                            lagerorte={lagerorte}
                                            onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                            {...register('lagerortId')}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Select
                                            label="Beschichtung"
                                            options={[
                                                { value: '', label: 'Keine Beschichtung' },
                                                ...BESCHICHTUNGEN.map(b => ({ value: b, label: b }))
                                            ]}
                                            {...register('beschichtung')}
                                        />
                                    </div>

                                    {/* Row 5: Beschreibung + Bemerkung (same row) */}
                                    <div className="md:col-span-6 space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                            placeholder="Detaillierte Beschreibung..."
                                            {...register('beschreibung')}
                                        />
                                    </div>
                                    <div className="md:col-span-6 space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                            placeholder="Zusaetzliche Notizen zur Position..."
                                            {...register('bemerkung')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lower Section: Unterpositionen placeholder */}
                        <Card className="shadow-xl border-none">
                            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    Unterpositionen & Teile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                                    <div className="rounded-full bg-muted p-4">
                                        <Layers className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        Unterpositionen werden nach dem Speichern hinzugefuegt.
                                    </p>
                                    <p className="text-xs text-muted-foreground/60">
                                        Speichern Sie zuerst die Position.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Sidebar: Actions + Uploads + Lieferanten */}
                    <div className="space-y-4 sticky top-6 lg:row-start-1 lg:col-start-4 lg:row-span-3">
                        {/* Action Buttons */}
                        <div className="flex justify-between gap-3">
                            <Link href={`/${projektId}/teilsysteme/${teilsystemId}`}>
                                <Button type="button" variant="outline" className="h-9 px-6 font-bold border-2">Abbrechen</Button>
                            </Link>
                            <Button type="submit" className="h-9 px-6 font-bold" disabled={isSubmitting}>
                                {isSubmitting ? 'Speichern...' : (
                                    <span className="flex items-center gap-2">
                                        <Save className="h-4 w-4" />
                                        Speichern
                                    </span>
                                )}
                            </Button>
                        </div>

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
                                    'flex flex-col items-center justify-center p-3 transition-colors cursor-pointer m-2 mt-1 rounded-lg border-2 border-transparent hover:bg-muted/50',
                                    dragActive ? 'bg-primary/5 border-primary border-dashed' : ''
                                )}
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="bg-background p-2 rounded-full shadow-sm mb-2">
                                    <FileType className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-[11px] font-bold text-foreground mb-1">IFC hierher ziehen</h3>
                                <p className="text-[9px] font-medium text-muted-foreground mb-3 text-center">Nur .ifc (Max. 200MB)</p>
                                <Button type="button" size="sm" variant="metha-orange" className="text-[10px] font-bold h-7 px-3"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input type="file" className="hidden" ref={fileInputRef} accept=".ifc" onChange={handleFileChange} />
                                {selectedFile && (
                                    <div className="mt-3 w-full">
                                        <div className="p-1.5 bg-green-50 text-green-700 rounded text-[10px] font-bold flex items-center gap-1.5 w-full truncate border border-green-200">
                                            <FileType className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{selectedFile}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Dokumente Card */}
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-3 px-4">
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <Paperclip className="h-3.5 w-3.5 text-primary" />
                                    Dokumente / Skizzen
                                </CardTitle>
                            </CardHeader>
                            <CardContent
                                className={cn(
                                    'flex flex-col items-center justify-center p-3 transition-colors cursor-pointer m-2 mt-1 rounded-lg border-2 border-transparent hover:bg-muted/50',
                                    docDragActive ? 'bg-primary/5 border-primary border-dashed' : ''
                                )}
                                onDragEnter={handleDocDrag} onDragLeave={handleDocDrag} onDragOver={handleDocDrag} onDrop={handleDocDrop}
                                onClick={() => docInputRef.current?.click()}
                            >
                                <div className="bg-background p-2 rounded-full shadow-sm mb-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-[11px] font-bold text-foreground mb-1">Dateien hierher ziehen</h3>
                                <p className="text-[9px] font-medium text-muted-foreground mb-3 text-center">pdf, jpg, png, heic</p>
                                <Button type="button" size="sm" variant="metha-orange" className="text-[10px] font-bold h-7 px-3"
                                    onClick={(e) => { e.stopPropagation(); docInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input type="file" className="hidden" ref={docInputRef}
                                    accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xls,.xlsx" multiple onChange={handleDocFileChange} />
                            </CardContent>
                            {dokumenteFiles.length > 0 && (
                                <div className="px-3 pb-3 space-y-1.5">
                                    {dokumenteFiles.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-border text-[10px] group shadow-sm">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="truncate font-medium">{file.name}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                onClick={(e) => { e.stopPropagation(); removeDocFile(i); }}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-muted-foreground italic px-1 pt-1 text-center">Dateien werden beim Speichern hochgeladen.</p>
                                </div>
                            )}
                        </Card>


                    </div>
                </div>
            </form>
        </div>
    );
}
