'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { SubunternehmerService } from '@/lib/services/subunternehmerService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ArrowLeft, Save, Calendar, UploadCloud, FileType } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { IfcImportModal, IfcExtractResult } from '@/components/shared/IfcImportModal';

import { useProjekt } from '@/lib/context/ProjektContext';
import { ABTEILUNGEN_CONFIG } from '@/types';

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
    planStatus: z.string().optional(),
    wemaLink: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
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

    React.useEffect(() => {
        const load = async () => {
            try {
                const [empData, subData] = await Promise.all([
                    EmployeeService.getMitarbeiter(),
                    SubunternehmerService.getSubunternehmer()
                ]);
                setMitarbeiter(empData);
                setSubunternehmerList(subData);
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
        formState: { errors, isSubmitting },
    } = useForm<TeilsystemValues>({
        resolver: zodResolver(teilsystemSchema),
        defaultValues: {
            status: 'offen',
            ks: '1',
            abteilung: '',
            planStatus: 'offen',
            eroeffnetDurch: currentUser ? `${currentUser.vorname} ${currentUser.nachname}` : 'Moritz',
            eroeffnetAm: new Date().toLocaleDateString('de-DE'),
            montagetermin: 'nach Absprache Bauleitung',
        }
    });

    // Effect to update field when currentUser becomes available
    React.useEffect(() => {
        if (currentUser) {
            setValue('eroeffnetDurch', `${currentUser.vorname} ${currentUser.nachname}`);
        }
    }, [currentUser, setValue]);

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

            router.push(`/${projektId}/teilsysteme`);
        } catch (error: any) {
            console.error("Failed to create teilsystem", error);
            alert(`Fehler beim Speichern:\n\n${error?.message || String(error)}`);
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
            alert(`Auto-Import fehlgeschlagen: ${error.message}`);
        } finally {
            setImportingAuto(false);
            setExtracting(false);
        }
    };

    const mitarbeiterOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: m.id }))
    ];

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
            // Auto-analysis removed as per user request
        }
    };

    // Helper to sync date input with text input
    const handleDateSelect = (fieldName: keyof TeilsystemValues, dateString: string) => {
        if (!dateString) return;
        const date = new Date(dateString);
        // Format to DD.MM.YYYY
        const formatted = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        setValue(fieldName, formatted);
    };

    return (
        <div className="w-full space-y-6 pb-8">
            <Link href={`/${projektId}/teilsysteme`} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Übersicht
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Teilsystem erfassen</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Form Data - Takes more space now */}
                    <Card className="lg:col-span-3 shadow-xl border-none">
                        <CardHeader className="bg-muted/30 border-b border-border">
                            <CardTitle className="text-lg font-bold text-foreground">Teilsystem-Informationen</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* First Row: System-Nr, KS, Name */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Input
                                    label="System-Nummer *"
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Bezeichnung *"
                                    placeholder="z.B. Baukran"
                                    {...register('name')}
                                    error={errors.name?.message}
                                />
                                <Select
                                    label="Abteilung *"
                                    options={abteilungOptions}
                                    {...register('abteilung')}
                                    error={errors.abteilung?.message}
                                />
                            </div>

                            {watch('abteilung') === 'Subunternehmer' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Subunternehmer wählen</label>
                                        <SearchableSelect
                                            label=""
                                            placeholder="Subunternehmer suchen..."
                                            options={subunternehmerList.map(s => ({ label: s.name, value: s.id }))}
                                            value={watch('subunternehmerId')}
                                            onChange={(val) => setValue('subunternehmerId', val)}
                                            error={errors.subunternehmerId?.message}
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end pb-1 text-[10px] font-bold text-muted-foreground opacity-60">
                                        <p>Bitte wählen Sie den zuständigen Subunternehmer aus der Liste der hinterlegten Partner.</p>
                                    </div>
                                </div>
                            )}

                            {/* Second Row: Beschreibung */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                    placeholder="Kurze Beschreibung des Systems..."
                                    {...register('beschreibung')}
                                />
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
                                <div className="relative group">
                                    <Input
                                        label="Eröffnet am *"
                                        placeholder="DD.MM.YYYY"
                                        {...register('eroeffnetAm')}
                                        error={errors.eroeffnetAm?.message}
                                    />
                                    <input
                                        type="date"
                                        className="absolute bottom-2 right-2 w-6 h-6 opacity-0 cursor-pointer"
                                        onChange={(e) => handleDateSelect('eroeffnetAm', e.target.value)}
                                        tabIndex={-1}
                                    />
                                    <div className="absolute bottom-2 right-2 pointer-events-none text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </div>
                                <Select
                                    label="Eröffnet durch *"
                                    options={mitarbeiterOptions}
                                    {...register('eroeffnetDurch')}
                                    error={errors.eroeffnetDurch?.message}
                                />
                            </div>

                            {/* Fifth Row: Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Input
                                        label="Montagetermin"
                                        {...register('montagetermin')}
                                    />
                                    <input
                                        type="date"
                                        className="absolute bottom-2 right-2 w-6 h-6 opacity-0 cursor-pointer"
                                        onChange={(e) => handleDateSelect('montagetermin', e.target.value)}
                                        tabIndex={-1}
                                    />
                                    <div className="absolute bottom-2 right-2 pointer-events-none text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <Input
                                        label="Plan-Abgabe"
                                        placeholder="DD.MM.YYYY"
                                        {...register('abgabePlaner')}
                                    />
                                    <input
                                        type="date"
                                        className="absolute bottom-2 right-2 w-6 h-6 opacity-0 cursor-pointer"
                                        onChange={(e) => handleDateSelect('abgabePlaner', e.target.value)}
                                        tabIndex={-1}
                                    />
                                    <div className="absolute bottom-2 right-2 pointer-events-none text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Input
                                        label="Lieferfrist"
                                        placeholder="Tage oder Datum"
                                        {...register('lieferfrist')}
                                    />
                                    <input
                                        type="date"
                                        className="absolute bottom-2 right-2 w-6 h-6 opacity-0 cursor-pointer"
                                        onChange={(e) => handleDateSelect('lieferfrist', e.target.value)}
                                        tabIndex={-1}
                                    />
                                    <div className="absolute bottom-2 right-2 pointer-events-none text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </div>
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

                    {/* Right Column: IFC Upload - Compact size */}
                    <div className="space-y-6 sticky top-6 mt-1 lg:mt-[4.5rem]">
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-4 px-4">
                                <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                                    <UploadCloud className="h-4 w-4 text-primary" />
                                    IFC Modell
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
                                    <FileType className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xs font-bold text-foreground mb-1">IFC hierher ziehen</h3>
                                <p className="text-[10px] font-medium text-muted-foreground mb-4 text-center">
                                    Nur .ifc (Max. 200MB)
                                </p>
                                <Button type="button" size="sm" variant="outline" className="text-xs font-bold border-border h-8 px-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
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
                                    <div className="mt-4 w-full space-y-3">
                                        <div className="p-2 bg-green-50 text-green-700 rounded text-xs font-bold flex items-center gap-2 w-full truncate border border-green-200">
                                            <FileType className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{selectedFile}</span>
                                        </div>

                                        {selectedFile.toLowerCase().endsWith('.ifc') && (
                                            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full text-[10px] font-bold h-8"
                                                    onClick={(e) => { e.stopPropagation(); selectedFileObj && handleAnalyze(selectedFileObj); }}
                                                    disabled={analyzing}
                                                >
                                                    {analyzing ? 'Analysiere...' : 'Erneut analysieren'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-wider h-10 shadow-lg shadow-orange-200 animate-in zoom-in-95 duration-200"
                                                    onClick={(e) => handleAutoImport(e)}
                                                    disabled={importingAuto || extracting || analyzing}
                                                >
                                                    {importingAuto ? 'Importiere...' : 'Auto-Erfassen & Alle Extrahieren'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>

            {/* IFC Extracting/Importing overlay */}
            {(extracting || importingAuto || analyzing) && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl border-2 border-border p-10 flex flex-col items-center gap-4">
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
