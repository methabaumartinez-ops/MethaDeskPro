'use client';
import { toast } from '@/lib/toast';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { SubunternehmerService } from '@/lib/services/subunternehmerService';
import { LagerortService } from '@/lib/services/lagerortService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { ArrowLeft, Save, Calendar, UploadCloud, FileType, FileText, Download, X, Paperclip, PlusCircle, Layers, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { IfcImportModal, IfcExtractResult } from '@/components/shared/IfcImportModal';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';

import { useProjekt } from '@/lib/context/ProjektContext';
import { ABTEILUNGEN_CONFIG } from '@/types';
import { TS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses, getAbteilungColorClasses, PLANNER_ROLES } from '@/lib/config/statusConfig';
import { getCreationDefaults } from '@/lib/workflow/workflowEngine';
import { ProvisionalDateInput } from '@/components/ui/provisional-date-input';

const DateInput = React.forwardRef<HTMLInputElement, { label: string; error?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
    ({ label, error, className, ...props }, ref) => (
        <Input
            ref={ref}
            type="date"
            label={label}
            error={error}
            className={className}
            {...props}
        />
    )
);
DateInput.displayName = "DateInput";

// Helper to format ISO "2025-12-04" to German "04.12.2025" (Consistent with Edit page)
function isoToGermanDate(isoStr?: string): string {
    if (!isoStr) return '';
    const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}.${match[2]}.${match[1]}`;
    }
    return isoStr;
}

// Helper to get current Date in ISO format for default values
function getCurrentIsoDate(): string {
    return new Date().toISOString().split('T')[0];
}

const teilsystemSchema = z.object({
    teilsystemNummer: z.string().min(1, 'System-Nummer ist erforderlich'),
    ks: z.string().optional(),
    name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
    beschreibung: z.string().optional(),
    bemerkung: z.string().optional(),
    abteilung: z.string().min(1, 'Abteilung ist erforderlich'),
    eroeffnetAm: z.string().min(1, 'Eröffnungsdatum ist erforderlich'),
    eroeffnetDurch: z.string().min(1, 'Eröffnet durch ist erforderlich'),
    montagetermin: z.string().optional(),
    lieferfrist: z.string().optional(),
    abgabePlaner: z.string().optional(),
    planStatus: z.string().min(1, 'Plan Status ist erforderlich'),
    wemaLink: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
    lagerortId: z.string().optional(),
    subunternehmerId: z.string().optional(),
});

type TeilsystemValues = z.infer<typeof teilsystemSchema>;

export default function TeilsystemErfassenPage() {
    const { projektId } = useParams() as { projektId: string };
    const { currentUser } = useProjekt();
    const router = useRouter();
    const searchParams = useSearchParams();
    const abteilungParam = searchParams.get('abteilung');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [mitarbeiter, setMitarbeiter] = React.useState<any[]>([]);
    const [subunternehmerList, setSubunternehmerList] = React.useState<any[]>([]);
    const [ifcExtractData, setIfcExtractData] = React.useState<IfcExtractResult | null>(null);
    const [newTeilsystemId, setNewTeilsystemId] = React.useState<string | null>(null);
    const [extracting, setExtracting] = React.useState(false);
    const [analyzing, setAnalyzing] = React.useState(false);
    const [importingAuto, setImportingAuto] = React.useState(false);
    const [loadingMitarbeiter, setLoadingMitarbeiter] = React.useState(true);
    const [loadingSubunternehmer, setLoadingSubunternehmer] = React.useState(true);
    const [selectedFileObj, setSelectedFileObj] = React.useState<File | null>(null);
    const [uploadedIfcUrl, setUploadedIfcUrl] = React.useState<string | null>(null);
    const [lagerorte, setLagerorte] = React.useState<any[]>([]);

    const [docDragActive, setDocDragActive] = React.useState(false);
    const [dokumenteFiles, setDokumenteFiles] = React.useState<File[]>([]);
    const docInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const load = async () => {
            try {
                const [empData, subData, loData] = await Promise.all([
                    EmployeeService.getMitarbeiter(),
                    SubunternehmerService.getSubunternehmer(),
                    LagerortService.getLagerorte(projektId).catch((err) => {
                        console.error("Lagerorte fetch failed, degrading gracefully:", err);
                        return [];
                    })
                ]);
                setMitarbeiter(empData);
                setSubunternehmerList(subData);
                setLagerorte(loData || []);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoadingMitarbeiter(false);
                setLoadingSubunternehmer(false);
            }
        };
        load();
    }, []);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        setError,
        control,
        formState: { errors, isSubmitting },
    } = useForm<TeilsystemValues>({
        resolver: zodResolver(teilsystemSchema),
        defaultValues: {
            status: 'offen',
            ks: '1',
            abteilung: '',
            planStatus: 'offen',
            eroeffnetDurch: currentUser ? `${currentUser.vorname} ${currentUser.nachname}` : 'Moritz',
            eroeffnetAm: getCurrentIsoDate(),
        }
    });

    // Effect to update field when currentUser becomes available
    React.useEffect(() => {
        if (currentUser) {
            setValue('eroeffnetDurch', `${currentUser.vorname} ${currentUser.nachname}`);

            // Apply workflow-driven defaults based on creator's role
            const defaults = getCreationDefaults('TEILSYSTEM', currentUser.role);
            setValue('status', defaults.status, { shouldDirty: false });

            // Only set abteilung from workflow if not already set by URL param
            if (!abteilungParam) {
                setValue('abteilung', defaults.abteilung, { shouldDirty: false });
            }
        }
    }, [currentUser, setValue, abteilungParam]);

    // Handle abteilung from URL
    React.useEffect(() => {
        if (abteilungParam) {
            // Verify if it's a valid abteilung name
            const isValid = ABTEILUNGEN_CONFIG.some(a => a.name === abteilungParam);
            if (isValid) {
                setValue('abteilung', abteilungParam);
            }
        }
    }, [abteilungParam, setValue]);

    const onSubmit = async (data: TeilsystemValues) => {
        const resolveName = (id: string) => {
            const m = mitarbeiter.find(x => x.id === id);
            return m ? `${m.vorname} ${m.nachname}` : id;
        };

        const { SubsystemService } = await import('@/lib/services/subsystemService');
        const { ProjectService } = await import('@/lib/services/projectService');

        try {
            // Check for unique system number
            const isUnique = await SubsystemService.isSystemnummerUnique(projektId, data.teilsystemNummer);
            if (!isUnique) {
                setError('teilsystemNummer', { type: 'manual', message: 'Diese System-Nummer existiert bereits in diesem Projekt' });
                return;
            }

            let uploadedIfcUrl = undefined;
            if (fileInputRef.current?.files?.[0]) {
                const file = fileInputRef.current.files[0];
                try {
                    uploadedIfcUrl = await ProjectService.uploadImage(file, projektId, 'ifc');
                } catch (uploadErr: any) {
                    console.error('IFC upload failed:', uploadErr);
                    throw new Error(`IFC Upload fehlgeschlagen: ${uploadErr.message || String(uploadErr)}`);
                }
            }

            const sub = subunternehmerList.find(s => s.id === data.subunternehmerId);

            const created = await SubsystemService.createTeilsystem({
                ...data,
                projektId,
                eroeffnetAm: isoToGermanDate(data.eroeffnetAm),
                montagetermin: isoToGermanDate(data.montagetermin),
                montageterminProvisional: data.montagetermin ? true : undefined,
                lieferfrist: isoToGermanDate(data.lieferfrist),
                abgabePlaner: isoToGermanDate(data.abgabePlaner),
                eroeffnetDurch: resolveName(data.eroeffnetDurch),
                subunternehmerId: data.subunternehmerId,
                subunternehmerName: sub ? sub.name : undefined,
                status: data.status as any,
                ifcUrl: uploadedIfcUrl
            } as any);

            // If IFC was uploaded, trigger extraction
            if (uploadedIfcUrl && created?.id) {
                setNewTeilsystemId(created.id);
                setExtracting(true);
                try {
                    const res = await fetch('/api/ifc-extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: uploadedIfcUrl, teilsystemId: created.id, projektId }),
                    });
                    if (res.ok) {
                        const extractResult = await res.json();
                        if (extractResult.summary.totalPositionen > 0 || extractResult.summary.totalMateriale > 0) {
                            setIfcExtractData(extractResult);
                            setExtracting(false);
                            return; // Don't navigate yet — modal will handle navigation
                        }
                    }
                } catch (e) {
                    console.warn('IFC extraction failed, continuing without import:', e);
                }
                setExtracting(false);
            }

            // Upload pending documents
            if (dokumenteFiles.length > 0 && created?.id) {
                try {
                    for (const file of dokumenteFiles) {
                        const url = await ProjectService.uploadImage(file, projektId, 'document');
                        let typ = 'Andere';
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') typ = 'PDF';
                        else if (['jpg', 'jpeg', 'png', 'heic'].includes(ext || '')) typ = 'Zeichnung'; // mapped loosely

                        await fetch('/api/dokumente', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: file.name,
                                typ,
                                url,
                                entityId: created.id,
                                entityType: 'teilsystem',
                                projektId
                            })
                        });
                    }
                } catch (docErr) {
                    console.error('Document upload error:', docErr);
                }
            }

            toast.success('Teilsystem erstellt');
            router.push(`/${projektId}/teilsysteme`);
        } catch (error: any) {
            console.error("Failed to create teilsystem", error);
            toast.error(`Fehler beim Speichern: ${error?.message || String(error)}`);
        }
    };

    const handleAutoImport = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!selectedFileObj || !projektId) return;

        setImportingAuto(true);
        try {
            const { ProjectService } = await import('@/lib/services/projectService');

            // 1. Upload to Drive if not already uploaded
            let url = uploadedIfcUrl;
            if (!url) {
                url = await ProjectService.uploadImage(selectedFileObj, projektId, 'ifc');
                setUploadedIfcUrl(url);
            }

            // 2. Trigger auto-import endpoint
            // We pass the current form values so they are prioritized over IFC metadata
            const formValues = watch();

            const res = await fetch('/api/teilsystem-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    filename: selectedFileObj.name,
                    projektId,
                    user: currentUser ? `${currentUser.vorname} ${currentUser.nachname}` : 'system-import',
                    overrides: {
                        teilsystemNummer: formValues.teilsystemNummer,
                        name: formValues.name,
                        beschreibung: formValues.beschreibung,
                    }
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Import failed');
            }

            const result = await res.json();

            // 3. If it's a new or existing TS, we still want to trigger the extraction of positions
            if (result.teilsystem?.id) {
                setNewTeilsystemId(result.teilsystem.id);
                setExtracting(true);

                const extractRes = await fetch('/api/ifc-extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url,
                        teilsystemId: result.teilsystem.id,
                        projektId
                    }),
                });

                if (extractRes.ok) {
                    const extractData = await extractRes.json();
                    setIfcExtractData(extractData);
                } else {
                    router.push(`/${projektId}/teilsysteme/${result.teilsystem.id}`);
                }
            }
        } catch (error: any) {
            console.error("Auto-import failed", error);
            toast.error(`Auto-Import fehlgeschlagen: ${error.message}`);
        } finally {
            setImportingAuto(false);
            setExtracting(false);
        }
    };

    const mitarbeiterOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: m.id }))
    ];

    const statusOptions = TS_ALLOWED_STATUSES.map(st => ({ 
        label: STATUS_UI_CONFIG[st].label, 
        value: STATUS_UI_CONFIG[st].value 
    }));

    const planStatusOptions = [
        { label: 'Offen', value: 'offen' },
        { label: 'Fertig', value: 'fertig' },
    ];

    const abteilungOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))
    ];

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file.name);
            setSelectedFileObj(file);
            // Auto-analysis removed as per user request
        }
    };

    const handleAnalyze = async (file: File) => {
        if (!projektId) return;
        setAnalyzing(true);
        try {
            const { ProjectService } = await import('@/lib/services/projectService');
            // Upload temporary or use direct if possible? For now, upload to Drive as it's the current pipeline
            const uploadedUrl = await ProjectService.uploadImage(file, projektId, 'ifc');
            setUploadedIfcUrl(uploadedUrl);

            const res = await fetch('/api/ifc-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: uploadedUrl, filename: file.name, projektId }),
            });

            if (res.ok) {
                const result = await res.json();
                if (result.metadata) {
                    const meta = result.metadata;
                    if (meta.teilsystemNummer) setValue('teilsystemNummer', meta.teilsystemNummer);
                    if (meta.name) setValue('name', meta.name);

                    // Specific mapping for METHABAU fields if rawMetadata is present
                    if (result.rawMetadata) {
                        const raw = result.rawMetadata;
                        const blocks = [];
                        if (raw.Gebäude) blocks.push(`Gebäude: ${raw.Gebäude}`);
                        if (raw.Geschoss) blocks.push(`Geschoss: ${raw.Geschoss}`);
                        if (raw.Abschnitt) blocks.push(`Abschnitt: ${raw.Abschnitt}`);
                        if (blocks.length > 0) setValue('beschreibung', blocks.join(' | '));
                    } else if (meta.beschreibung) {
                        setValue('beschreibung', meta.beschreibung);
                    }

                    if (meta.bemerkung) setValue('bemerkung', meta.bemerkung);
                }
            }
        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setAnalyzing(false);
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
            const file = e.dataTransfer.files[0];
            setSelectedFile(file.name);
            setSelectedFileObj(file);
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

    const currentAbteilung = watch('abteilung');

    useEffect(() => {
        if (currentAbteilung) {
            let ksValue = '2';
            if (currentAbteilung === 'Bau') ksValue = '1';
            else if (currentAbteilung === 'Unternehmer') ksValue = '3';
            setValue('ks', ksValue, { shouldValidate: true, shouldDirty: true });
        }
    }, [currentAbteilung, setValue]);

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500 pb-12">
            <ModuleActionBanner
                icon={PlusCircle}
                title="Teilsystem erfassen"
                showBackButton={true}
                backHref={`/${projektId}/teilsysteme`}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Form Data */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="shadow-xl border-none">
                            <CardHeader className="bg-muted/30 border-b border-border py-4 px-6">
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                    Teilsystem-Informationen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    {/* Row 1: System Identifiers & Name */}
                                    <div className="md:col-span-2">
                                        <Input
                                            label="System-Nummer *"
                                            placeholder="z.B. 1050"
                                            {...register('teilsystemNummer')}
                                            error={errors.teilsystemNummer?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <Input
                                            label="KS"
                                            placeholder="1"
                                            {...register('ks')}
                                            error={errors.ks?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-9">
                                        <Input
                                            label="Teilsystem Name *"
                                            placeholder="z.B. Stahlbau Halle A"
                                            {...register('name')}
                                            error={errors.name?.message}
                                        />
                                    </div>

                                    {/* Row 2: Department & Status */}
                                    <div className="md:col-span-4">
                                        <Select
                                            label="Abteilung *"
                                            options={abteilungOptions}
                                            {...register('abteilung')}
                                            error={errors.abteilung?.message}
                                            className={cn('font-bold', getAbteilungColorClasses(watch('abteilung')))}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Select
                                            label="TS Status *"
                                            options={statusOptions}
                                            {...register('status')}
                                            error={errors.status?.message}
                                            className={cn('font-bold', getStatusColorClasses(watch('status')))}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Select
                                            label="Plan Status *"
                                            options={planStatusOptions}
                                            {...register('planStatus')}
                                            error={errors.planStatus?.message}
                                            className={cn('font-bold', getStatusColorClasses(watch('planStatus')))}
                                        />
                                    </div>

                                    {/* Row 3: People & Warehouse */}
                                    <div className="md:col-span-4">
                                        <Controller
                                            name="eroeffnetDurch"
                                            control={control}
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    label="Eröffnet durch *"
                                                    options={mitarbeiterOptions}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={errors.eroeffnetDurch?.message}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <Controller
                                            name="subunternehmerId"
                                            control={control}
                                            render={({ field }) => (
                                                <SearchableSelect
                                                    label="Subunternehmer"
                                                    options={[
                                                        { label: 'Bitte wählen...', value: '' },
                                                        ...subunternehmerList.map(s => ({ label: s.name, value: s.id }))
                                                    ]}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={errors.subunternehmerId?.message}
                                                />
                                            )}
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

                                    {/* Row 4: Dates (Compact) */}
                                    <div className="md:col-span-3">
                                        <DateInput
                                            label="Eröffnet am *"
                                            {...register('eroeffnetAm')}
                                            error={errors.eroeffnetAm?.message}
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
                                        <DateInput
                                            label="Lieferfrist"
                                            {...register('lieferfrist')}
                                            error={errors.lieferfrist?.message}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <DateInput
                                            label="Abgabe Planer"
                                            {...register('abgabePlaner')}
                                            error={errors.abgabePlaner?.message}
                                        />
                                    </div>

                                    {/* Row 5: Long Text */}
                                    <div className="md:col-span-12 space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                            placeholder="Detaillierte Systembeschreibung..."
                                            {...register('beschreibung')}
                                        />
                                    </div>

                                    <div className="md:col-span-12 space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                        <textarea
                                            className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent-foreground/30 shadow-sm"
                                            placeholder="Zusätzliche Notizen vom Planer oder Projektleiter..."
                                            {...register('bemerkung')}
                                        />
                                    </div>

                                    {/* WEMA Link */}
                                    <div className="md:col-span-12">
                                        <Input
                                            label="WEMA Link"
                                            placeholder="https://wema.example.com/..."
                                            {...register('wemaLink')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

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

                                        {selectedFile.toLowerCase().endsWith('.ifc') && (
                                            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full text-[9px] font-bold h-7"
                                                    onClick={(e) => { e.stopPropagation(); selectedFileObj && handleAnalyze(selectedFileObj); }}
                                                    disabled={analyzing}
                                                >
                                                    {analyzing ? 'Analysiere...' : 'Erneut analysieren'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-wider h-8 shadow-sm"
                                                    onClick={(e) => handleAutoImport(e)}
                                                    disabled={importingAuto || extracting || analyzing}
                                                >
                                                    {importingAuto ? 'Import...' : 'Extrahieren'}
                                                </Button>
                                            </div>
                                        )}
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
                </div>

                {/* Bottom Action Row */}
                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                    <Link href={`/${projektId}/teilsysteme`}>
                        <Button type="button" variant="outline" className="font-bold h-11 px-8">Abbrechen</Button>
                    </Link>
                    <Button type="submit" className="font-black px-12 h-11 text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2" disabled={isSubmitting}>
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Wird gespeichert...' : 'Teilsystem speichern'}
                    </Button>
                </div>
            </form>

            {/* IFC Extracting/Importing overlay */}
            {(extracting || importingAuto || analyzing) && (
                <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white dark:bg-card rounded-2xl shadow-2xl border-2 border-border p-10 flex flex-col items-center gap-4">
                        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <h3 className="text-lg font-black text-foreground">
                            {analyzing ? 'Analysiere Modell...' : (importingAuto ? 'Erstelle Teilsystem...' : 'Extrahiere Positionen...')}
                        </h3>
                        <p className="text-sm text-muted-foreground text-center">
                            {analyzing
                                ? 'Metadaten werden für das Formular extrahiert.'
                                : (importingAuto
                                    ? 'Daten werden aus dem IFC extrahiert und Teilsystem wird angelegt.'
                                    : 'Positionen, Unterpositionen und Material werden extrahiert')}
                        </p>
                    </div>
                </div>
            )}

            {/* IFC Import Modal */}
            {ifcExtractData && newTeilsystemId && (
                <IfcImportModal
                    data={ifcExtractData}
                    teilsystemId={newTeilsystemId}
                    projektId={projektId}
                    onClose={() => {
                        setIfcExtractData(null);
                        router.push(`/${projektId}/teilsysteme`);
                    }}
                    onImported={() => {
                        router.push(`/${projektId}/teilsysteme/${newTeilsystemId}`);
                    }}
                />
            )}
        </div>
    );
}
