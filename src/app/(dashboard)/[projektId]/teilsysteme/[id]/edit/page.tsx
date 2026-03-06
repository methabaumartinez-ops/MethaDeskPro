'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { SupplierService } from '@/lib/services/supplierService';
import { SubunternehmerService } from '@/lib/services/subunternehmerService';
import { LagerortService } from '@/lib/services/lagerortService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Teilsystem, ABTEILUNGEN_CONFIG, Lieferant, Lagerort } from '@/types';
import { ArrowLeft, Save, Calendar as CalendarIcon, UploadCloud, FileType, Truck, X, Search, Plus, Paperclip, FileText, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ProjectService } from '@/lib/services/projectService';
import { cn } from '@/lib/utils';
import { IfcImportModal, IfcExtractResult } from '@/components/shared/IfcImportModal';
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal';

const teilsystemSchema = z.object({
    teilsystemNummer: z.string().optional(),
    ks: z.string().optional(),
    name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
    beschreibung: z.string().optional(),
    bemerkung: z.string().optional(),
    eroeffnetAm: z.string().optional(),
    eroeffnetDurch: z.string().optional(),
    montagetermin: z.string().optional(),
    lieferfrist: z.string().optional(),
    abgabePlaner: z.string().optional(),
    planStatus: z.string().optional(),
    wemaLink: z.string().optional(),
    ifcUrl: z.string().optional(),
    abteilung: z.string().min(1, 'Abteilung ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    lagerortId: z.string().optional(),
    lieferantenIds: z.array(z.string()).optional(),
    subunternehmerId: z.string().optional(),
});

type TeilsystemValues = z.infer<typeof teilsystemSchema>;

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

// Helper to parse German date "Do 04.12.2025" or "17.07.2025" to ISO "2025-12-04"
function germanDateToISO(dateStr?: string): string {
    if (!dateStr) return '';
    // Remove day prefix like "Do " "Mi " etc.
    const cleaned = dateStr.replace(/^[A-Za-z]{2,3}\s+/, '');
    const match = cleaned.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return dateStr;
}

// Helper to format ISO "2025-12-04" to German "04.12.2025"
function isoToGermanDate(isoStr?: string): string {
    if (!isoStr) return '';
    const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}.${match[2]}.${match[1]}`;
    }
    return isoStr;
}

export default function TeilsystemEditPage() {
    const params = useParams();
    const projektId = params?.projektId as string;
    const id = params?.id as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');
    const [loading, setLoading] = useState(true);
    const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
    const [loadingMitarbeiter, setLoadingMitarbeiter] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [ifcExtractData, setIfcExtractData] = useState<IfcExtractResult | null>(null);
    const [extracting, setExtracting] = useState(false);
    const [allLieferanten, setAllLieferanten] = useState<Lieferant[]>([]);
    const [subunternehmerList, setSubunternehmerList] = useState<any[]>([]);
    const [lieferantenSearch, setLieferantenSearch] = useState('');
    const [isLieferantenOpen, setIsLieferantenOpen] = useState(false);
    const [loadingSubunternehmer, setLoadingSubunternehmer] = useState(true);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [teilsystem, setTeilsystem] = useState<Teilsystem | null>(null);

    const [docDragActive, setDocDragActive] = useState(false);
    const [dokumenteFiles, setDokumenteFiles] = useState<any[]>([]);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const docInputRef = React.useRef<HTMLInputElement>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const loadDokumente = async () => {
        try {
            const res = await fetch(`/api/dokumente?entityId=${id}&entityType=teilsystem`);
            if (res.ok) setDokumenteFiles(await res.json());
        } catch (e) {
            console.error('Failed to load docs:', e);
        }
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<TeilsystemValues>({
        resolver: zodResolver(teilsystemSchema),
    });

    const currentIfcUrl = watch('ifcUrl');
    const currentAbteilung = watch('abteilung');

    // All useEffects
    useEffect(() => {
        const loadData = async () => {
            try {
                const [empData, subData, loData] = await Promise.all([
                    EmployeeService.getMitarbeiter(),
                    SubunternehmerService.getSubunternehmer(),
                    LagerortService.getLagerorte(projektId)
                ]);
                setMitarbeiter(Array.isArray(empData) ? empData : []);
                setSubunternehmerList(Array.isArray(subData) ? subData : []);
                setLagerorte(Array.isArray(loData) ? loData : []);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoadingMitarbeiter(false);
                setLoadingSubunternehmer(false);
            }
        };
        loadData();

        const loadLieferanten = async () => {
            try {
                const data = await SupplierService.getLieferanten();
                setAllLieferanten(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to load lieferanten', error);
                setAllLieferanten([]);
            }
        };
        loadLieferanten();
        loadDokumente();
    }, [id, projektId]); // Added projektId to deps

    useEffect(() => {
        const loadItem = async () => {
            try {
                const item = await SubsystemService.getTeilsystemById(id);
                if (item) {
                    setTeilsystem(item);
                    setValue('teilsystemNummer', item.teilsystemNummer || '');
                    setValue('ks', String(item.ks || ''));
                    setValue('name', item.name);
                    setValue('beschreibung', item.beschreibung || '');
                    setValue('bemerkung', item.bemerkung || '');
                    setValue('eroeffnetAm', germanDateToISO(item.eroeffnetAm));
                    setValue('eroeffnetDurch', item.eroeffnetDurch || '');
                    setValue('montagetermin', germanDateToISO(item.montagetermin));
                    setValue('lieferfrist', germanDateToISO(item.lieferfrist));
                    setValue('abgabePlaner', germanDateToISO(item.abgabePlaner));
                    setValue('planStatus', item.planStatus || 'offen');
                    setValue('wemaLink', item.wemaLink || '');
                    setValue('ifcUrl', item.ifcUrl || '');
                    setValue('abteilung', item.abteilung || '');
                    setValue('status', item.status);
                    setValue('lagerortId', item.lagerortId || '');
                    setValue('lieferantenIds', item.lieferantenIds || []);
                    setValue('subunternehmerId', item.subunternehmerId || '');

                    if (item.ifcUrl) {
                        try {
                            const url = new URL(item.ifcUrl);
                            setSelectedFileName(url.searchParams.get('name') || 'Modell vorhanden');
                        } catch (e) {
                            setSelectedFileName('Modell vorhanden');
                        }
                    }
                } else {
                    router.push(`/${projektId}/teilsysteme`);
                }
            } catch (error) {
                console.error("Failed to load teilsystem:", error);
                router.push(`/${projektId}/teilsysteme`);
            } finally {
                setLoading(false);
            }
        };
        loadItem();
    }, [id, projektId, setValue, router]);

    useEffect(() => {
        if (currentAbteilung) {
            let ksValue = '2';
            if (currentAbteilung === 'Bau') ksValue = '1';
            else if (currentAbteilung === 'Unternehmer') ksValue = '3';
            setValue('ks', ksValue, { shouldValidate: true, shouldDirty: true });
        }
    }, [currentAbteilung, setValue]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFileName(e.target.files[0].name);
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
            setSelectedFileName(e.dataTransfer.files[0].name);
            if (fileInputRef.current) {
                fileInputRef.current.files = e.dataTransfer.files;
            }
        }
    };

    const uploadDocs = async (files: File[]) => {
        setUploadingDocs(true);
        try {
            for (const file of files) {
                const url = await ProjectService.uploadImage(file, projektId, 'document');
                let typ = 'Andere';
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') typ = 'PDF';
                else if (['jpg', 'jpeg', 'png', 'heic'].includes(ext || '')) typ = 'Zeichnung';

                await fetch('/api/dokumente', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: file.name,
                        typ,
                        url,
                        entityId: id,
                        entityType: 'teilsystem',
                        projektId
                    })
                });
            }
            await loadDokumente();
        } catch (e) {
            console.error('Doc upload error:', e);
        } finally {
            setUploadingDocs(false);
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
            uploadDocs(Array.from(e.dataTransfer.files));
        }
    };

    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadDocs(Array.from(e.target.files));
        }
    };

    const onSubmit = async (data: TeilsystemValues) => {
        try {
            // Check for unique system number (excluding current id)
            if (data.teilsystemNummer) {
                const isUnique = await SubsystemService.isSystemnummerUnique(projektId, data.teilsystemNummer, id);
                if (!isUnique) {
                    setError('teilsystemNummer', { type: 'manual', message: 'Diese System-Nummer existiert bereits in diesem Projekt' });
                    return;
                }
            }

            let uploadedIfcUrl = data.ifcUrl;
            if (fileInputRef.current?.files?.[0]) {
                const file = fileInputRef.current.files[0];
                try {
                    uploadedIfcUrl = await ProjectService.uploadImage(file, projektId, 'ifc');
                } catch (uploadErr: any) {
                    console.error('IFC upload failed:', uploadErr);
                    throw new Error(`IFC Upload fehlgeschlagen: ${uploadErr.message || String(uploadErr)}`);
                }
            }

            const sub = Array.isArray(subunternehmerList) ? subunternehmerList.find(s => s.id === data.subunternehmerId) : null;

            const updates: Partial<Teilsystem> = {
                ...data,
                projektId, // Add project id to avoid disappearing from lists
                eroeffnetAm: isoToGermanDate(data.eroeffnetAm),
                montagetermin: isoToGermanDate(data.montagetermin),
                lieferfrist: isoToGermanDate(data.lieferfrist),
                abgabePlaner: isoToGermanDate(data.abgabePlaner),
                abteilung: data.abteilung as any,
                planStatus: data.planStatus as any,
                status: data.status as any,
                subunternehmerId: data.subunternehmerId,
                subunternehmerName: sub ? sub.name : undefined,
                ifcUrl: uploadedIfcUrl
            };

            await SubsystemService.updateTeilsystem(id, updates as unknown as Partial<Teilsystem>);

            // If IFC was newly uploaded, trigger extraction
            if (fileInputRef.current?.files?.[0] && uploadedIfcUrl) {
                setExtracting(true);
                try {
                    const res = await fetch('/api/ifc-extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: uploadedIfcUrl, teilsystemId: id, projektId }),
                    });
                    if (res.ok) {
                        const extractResult = await res.json();
                        if (extractResult.summary.totalPositionen > 0 || extractResult.summary.totalMateriale > 0) {
                            setIfcExtractData(extractResult);
                            setExtracting(false);
                            return; // Don't navigate — modal handles it
                        }
                    }
                } catch (e) {
                    console.warn('IFC extraction failed, continuing:', e);
                }
                setExtracting(false);
            }

            toast.success('Änderungen gespeichert');
            router.push(`/${projektId}/teilsysteme/${id}${from ? `?from=${from}` : ''}`);
        } catch (error: any) {
            console.error("Failed to update teilsystem:", error);
            toast.error(`Fehler beim Speichern des Teilsystems: ${error?.message || String(error)}`);
        }
    };

    const handleDeleteConfirmed = async () => {
        try {
            await SubsystemService.deleteTeilsystem(id);
            toast.success("Teilsystem gelöscht");
            router.push(`/${projektId}`);
        } catch (error) {
            console.error("Failed to delete", error);
            toast.error("Fehler beim Löschen des Teilsystems");
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    const statusOptions = [
        { label: 'Offen', value: 'offen' },
        { label: 'In Produktion', value: 'in_produktion' },
        { label: 'Bestellt', value: 'bestellt' },
        { label: 'Fertig', value: 'fertig' },
        { label: 'Geliefert', value: 'geliefert' },
        { label: 'Verbaut', value: 'verbaut' },
        { label: 'Abgeschlossen', value: 'abgeschlossen' },
    ];

    const planStatusOptions = [
        { label: 'Offen', value: 'offen' },
        { label: 'Fertig', value: 'fertig' },
    ];

    const mitarbeiterOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` })),
    ];

    const abteilungOptions = [
        { label: 'Abteilung wählen...', value: '' },
        ...ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))
    ];


    return (
        <div className="w-full space-y-6 pb-8">
            <Link href={`/${projektId}/teilsysteme/${id}${from ? `?from=${from}` : ''}`} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück al Teilsystem
            </Link>

            <div className="flex justify-start items-center gap-4">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Teilsystem bearbeiten</h1>
                {teilsystem && (
                    <div className="flex items-baseline gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 shadow-sm">
                        <span className="text-xl font-black text-primary drop-shadow-sm">TS{teilsystem.teilsystemNummer}</span>
                        <span className="text-lg font-bold text-muted-foreground truncate max-w-[400px]">{teilsystem.name}</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Form Data */}
                    <Card className="lg:col-span-3 shadow-xl border-none">
                        <CardHeader className="bg-muted/30 border-b py-3">
                            <CardTitle className="text-base">Teilsystem-Informationen</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <Input
                                    label="System-Nummer *"
                                    placeholder="z.B. 1050"
                                    className="h-9 md:col-span-1"
                                    {...register('teilsystemNummer')}
                                    error={errors.teilsystemNummer?.message}
                                />
                                <div className="md:col-span-1">
                                    <Input
                                        label="KS"
                                        placeholder="1"
                                        className="h-9"
                                        {...register('ks')}
                                        error={errors.ks?.message}
                                    />
                                    <p className="text-[9px] font-black text-orange-600 mt-0.5 ml-1 uppercase">
                                        {watch('ks') === '1' ? 'Baumeister' : watch('ks') === '2' ? 'Produktion' : watch('ks') === '3' ? 'Extern' : ''}
                                    </p>
                                </div>
                                <Input
                                    label="Bezeichnung *"
                                    placeholder="z.B. Baukran"
                                    className="h-9 md:col-span-2"
                                    {...register('name')}
                                    error={errors.name?.message}
                                />
                                <Select
                                    label="Abteilung *"
                                    options={abteilungOptions}
                                    className="h-9 md:col-span-1"
                                    {...register('abteilung')}
                                    error={errors.abteilung?.message}
                                />
                            </div>

                            {!currentAbteilung && (
                                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full h-8 w-fit shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-wider">Abteilung fehlt</span>
                                </div>
                            )}

                            {watch('abteilung') === 'Subunternehmer' && (
                                <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-foreground ml-1">Subunternehmer wählen</label>
                                        <SearchableSelect
                                            label=""
                                            placeholder="Subunternehmer suchen..."
                                            options={subunternehmerList.map(s => ({ label: s.name, value: s.id }))}
                                            value={watch('subunternehmerId')}
                                            onChange={(val) => setValue('subunternehmerId', val)}
                                            error={errors.subunternehmerId?.message}
                                        />
                                    </div>
                                </div>
                            )}



                            {/* Row 3: Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <DateInput
                                    label="Eröffnet am"
                                    className="h-9"
                                    {...register('eroeffnetAm')}
                                />
                                <DateInput
                                    label="Plan-Abgabe"
                                    className="h-9"
                                    {...register('abgabePlaner')}
                                />
                                <DateInput
                                    label="Lieferfrist"
                                    className="h-9"
                                    {...register('lieferfrist')}
                                />
                                <DateInput
                                    label="Montagetermin"
                                    className="h-9"
                                    {...register('montagetermin')}
                                />
                                <Select
                                    label="Eröffnet durch"
                                    options={mitarbeiterOptions}
                                    className="h-9"
                                    {...register('eroeffnetDurch')}
                                />
                            </div>

                            {/* Row 3: Status */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Select
                                    label="Plan-Status"
                                    options={planStatusOptions}
                                    className="h-9"
                                    {...register('planStatus')}
                                />
                                <Select
                                    label="Status *"
                                    options={statusOptions}
                                    className="h-9"
                                    {...register('status')}
                                    error={errors.status?.message}
                                />
                                <LagerortSelect
                                    projektId={projektId}
                                    lagerorte={lagerorte}
                                    onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                    className="h-9"
                                    {...register('lagerortId')}
                                    error={errors.lagerortId?.message}
                                />
                            </div>

                            {/* Row 4: Beschreibung & WEMA Link */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-8 space-y-1">
                                    <label className="text-xs font-semibold text-foreground ml-1">Beschreibung</label>
                                    <textarea
                                        className="flex min-h-[36px] w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                        placeholder="Kurze Beschreibung..."
                                        {...register('beschreibung')}
                                    />
                                </div>
                                <div className="md:col-span-4 flex items-end">
                                    <div className="w-full">
                                        <Input
                                            label="WEMA Link"
                                            placeholder="Pfad / URL"
                                            className="h-9"
                                            {...register('wemaLink')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lieferanten Section */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Zugeordnete Lieferanten (ss)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="relative w-full max-w-[320px]">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Lieferant suchen..."
                                                    className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors shadow-inner"
                                                    value={lieferantenSearch}
                                                    onChange={(e) => {
                                                        setLieferantenSearch(e.target.value);
                                                        setIsLieferantenOpen(true);
                                                    }}
                                                    onFocus={() => setIsLieferantenOpen(true)}
                                                />
                                            </div>

                                            {isLieferantenOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsLieferantenOpen(false)} />
                                                    <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-200">
                                                        {(Array.isArray(allLieferanten) ? allLieferanten : [])
                                                            .filter(l => !watch('lieferantenIds')?.includes(l.id))
                                                            .filter(l => l.name?.toLowerCase().includes(lieferantenSearch.toLowerCase()))
                                                            .length === 0 ? (
                                                            <div className="px-4 py-3 text-xs font-bold text-muted-foreground italic text-center">
                                                                Keine weiteren Lieferanten gefunden
                                                            </div>
                                                        ) : (
                                                            (Array.isArray(allLieferanten) ? allLieferanten : [])
                                                                .filter(l => !watch('lieferantenIds')?.includes(l.id))
                                                                .filter(l => l.name?.toLowerCase().includes(lieferantenSearch.toLowerCase()))
                                                                .map(l => (
                                                                    <button
                                                                        key={l.id}
                                                                        type="button"
                                                                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-muted text-sm font-bold flex items-center justify-between transition-colors group"
                                                                        onClick={() => {
                                                                            const current = watch('lieferantenIds') || [];
                                                                            setValue('lieferantenIds', [...current, l.id]);
                                                                            setLieferantenSearch('');
                                                                            setIsLieferantenOpen(false);
                                                                        }}
                                                                    >
                                                                        <span>{l.name}</span>
                                                                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                    </button>
                                                                ))
                                                        )
                                                        }
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {(watch('lieferantenIds') || []).map(id => {
                                                const supplier = allLieferanten.find(l => l.id === id);
                                                return (
                                                    <Badge
                                                        key={id}
                                                        variant="info"
                                                        className="px-3 py-1.5 rounded-full border-2 border-border bg-muted/30 text-xs font-black flex items-center gap-2 hover:bg-muted transition-all"
                                                    >
                                                        <Truck className="h-3 w-3 text-primary" />
                                                        {supplier?.name || id}
                                                        <button
                                                            type="button"
                                                            className="hover:text-red-600 transition-colors"
                                                            onClick={() => {
                                                                const current = watch('lieferantenIds') || [];
                                                                setValue('lieferantenIds', current.filter(cid => cid !== id));
                                                            }}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </Badge>
                                                );
                                            })}
                                            {(watch('lieferantenIds') || []).length === 0 && (
                                                <p className="text-xs font-bold text-muted-foreground/40 italic py-2 pl-2">
                                                    Keine Lieferanten zugewiesen
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center bg-muted/20 rounded-2xl p-4 border border-dashed border-border">
                                        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
                                            Hier können Sie einen oder mehrere Lieferanten diesem Teilsystem zuordnen. Die Zuordnung hilft bei der Übersicht im Moduleinkauf und bei der Materialbestellung.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Column: Uploads */}
                    <div className="space-y-4 sticky top-6 mt-1 lg:mt-[4.5rem]">
                        {/* IFC */}
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
                                <h3 className="text-[11px] font-bold text-foreground mb-1">
                                    {currentIfcUrl ? 'IFC ersetzen' : 'IFC hierher ziehen'}
                                </h3>
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
                                {selectedFileName && (
                                    <div className="mt-3 p-1.5 bg-green-50 text-green-700 rounded text-[10px] font-bold flex items-center gap-1.5 w-full truncate border border-green-200">
                                        <FileType className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{selectedFileName}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Dokumente */}
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

                            {/* Document List */}
                            {(dokumenteFiles.length > 0 || uploadingDocs) && (
                                <div className="px-3 pb-3 space-y-1.5">
                                    {dokumenteFiles.map((doc, i) => (
                                        <div key={doc.id || i} className="flex items-center justify-between p-1.5 bg-background rounded-md border border-border text-[10px] group">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <FileText className="h-3 w-3 text-muted-foreground shrink-0 border border-primary/20 rounded p-0.5" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewDoc({ url: doc.url, title: doc.name });
                                                    }}
                                                    className="truncate font-medium hover:underline hover:text-primary transition-colors text-left"
                                                >
                                                    {doc.name}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {uploadingDocs && (
                                        <div className="flex items-center justify-center gap-2 p-1.5 text-[10px] text-muted-foreground italic bg-muted/20 rounded-md">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Hochladen...
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Bottom Action Row aligned perfectly right */}
                <div className="flex justify-between gap-4 mt-8 sticky bottom-0 bg-background/80 backdrop-blur-sm py-4 border-t border-border/50 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Button
                        type="button"
                        variant="danger"
                        className="font-bold h-10 px-6 flex items-center gap-2"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        Teilsystem löschen
                    </Button>

                    <div className="flex gap-3">
                        <Link href={`/${projektId}/teilsysteme/${id}`}>
                            <Button type="button" variant="outline" className="font-bold border-2">Abbrechen</Button>
                        </Link>
                        <Button type="submit" className="font-bold min-w-[140px]" disabled={isSubmitting}>
                            {isSubmitting ? 'Wird gespeichert...' : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    Speichern
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </form >

            {/* IFC Extracting overlay */}
            {
                extracting && (
                    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center">
                        <div className="bg-white dark:bg-card rounded-2xl shadow-2xl border-2 border-border p-10 flex flex-col items-center gap-4">
                            <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <h3 className="text-lg font-black text-foreground">Analysiere IFC...</h3>
                            <p className="text-sm text-muted-foreground">Positionen, Unterpositionen und Material werden extrahiert</p>
                        </div>
                    </div>
                )
            }

            {/* IFC Import Modal */}
            {
                ifcExtractData && (
                    <IfcImportModal
                        data={ifcExtractData}
                        teilsystemId={id}
                        projektId={projektId}
                        onClose={() => {
                            setIfcExtractData(null);
                            router.push(`/${projektId}/teilsysteme/${id}`);
                        }}
                        onImported={() => {
                            router.push(`/${projektId}/teilsysteme/${id}`);
                        }}
                    />
                )
            }

            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                url={previewDoc?.url || ''}
                title={previewDoc?.title || ''}
            />
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteConfirmed}
                title="Teilsystem löschen"
                description={`Sind Sie sicher, dass Sie dieses Teilsystem ("${teilsystem?.name}") permanent löschen möchten?`}
                confirmLabel="Löschen"
                variant="danger"
            />
        </div >
    );
}
