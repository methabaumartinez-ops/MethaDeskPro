'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { Teilsystem } from '@/types';
import { ArrowLeft, Save, Calendar as CalendarIcon, UploadCloud, FileType } from 'lucide-react';
import Link from 'next/link';
import { ProjectService } from '@/lib/services/projectService';
import { cn } from '@/lib/utils';
import { IfcImportModal, IfcExtractResult } from '@/components/shared/IfcImportModal';

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
    status: z.string().min(1, 'Status ist erforderlich'),
});

type TeilsystemValues = z.infer<typeof teilsystemSchema>;

// Date input component with calendar icon
const DateInput = React.forwardRef<HTMLInputElement, { label: string; error?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
    ({ label, error, className, ...props }, ref) => (
        <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">{label}</label>
            <div className="relative">
                <input
                    ref={ref}
                    type="date"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                    {...props}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            </div>
            {error && <p className="text-xs font-medium text-red-500 ml-1">{error}</p>}
        </div>
    )
);
DateInput.displayName = "DateInput";

// Simple select for use in form
const FormSelect = React.forwardRef<
    HTMLSelectElement,
    { label: string; error?: string; options: { label: string; value: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ label, error, options, ...props }, ref) => (
    <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground ml-1">{label}</label>
        <select
            ref={ref}
            className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary transition-all hover:border-accent"
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {error && <p className="text-xs font-medium text-red-500 ml-1">{error}</p>}
    </div>
));
FormSelect.displayName = "FormSelect";

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
    const { projektId, id } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
    const [loadingMitarbeiter, setLoadingMitarbeiter] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [ifcExtractData, setIfcExtractData] = useState<IfcExtractResult | null>(null);
    const [extracting, setExtracting] = useState(false);

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

    // Load mitarbeiter for dropdown
    useEffect(() => {
        const loadMitarbeiter = async () => {
            try {
                const data = await EmployeeService.getMitarbeiter();
                setMitarbeiter(data);
            } catch (error) {
                console.error('Failed to load mitarbeiter', error);
            } finally {
                setLoadingMitarbeiter(false);
            }
        };
        loadMitarbeiter();
    }, []);

    useEffect(() => {
        const loadItem = async () => {
            try {
                const item = await SubsystemService.getTeilsystemById(id);
                if (item) {
                    setValue('teilsystemNummer', item.teilsystemNummer || '');
                    setValue('ks', item.ks || '');
                    setValue('name', item.name);
                    setValue('beschreibung', item.beschreibung || '');
                    setValue('bemerkung', item.bemerkung || '');
                    setValue('eroeffnetAm', germanDateToISO(item.eroeffnetAm));
                    setValue('eroeffnetDurch', item.eroeffnetDurch || '');
                    setValue('montagetermin', germanDateToISO(item.montagetermin));
                    setValue('lieferfrist', item.lieferfrist || '');
                    setValue('abgabePlaner', germanDateToISO(item.abgabePlaner));
                    setValue('planStatus', item.planStatus || 'offen');
                    setValue('wemaLink', item.wemaLink || '');
                    setValue('ifcUrl', item.ifcUrl || '');
                    setValue('status', item.status);

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

            // Convert ISO dates back to German format for storage
            const toSave = {
                ...data,
                projektId, // Add project id to avoid disappearing from lists
                eroeffnetAm: isoToGermanDate(data.eroeffnetAm),
                montagetermin: isoToGermanDate(data.montagetermin),
                abgabePlaner: isoToGermanDate(data.abgabePlaner),
                ifcUrl: uploadedIfcUrl
            };

            await SubsystemService.updateTeilsystem(id, toSave as unknown as Partial<Teilsystem>);

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

            router.push(`/${projektId}/teilsysteme/${id}`);
        } catch (error: any) {
            console.error("Failed to update teilsystem:", error);
            alert(`Fehler beim Speichern des Teilsystems:\n\n${error?.message || String(error)}`);
        }
    };

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

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

    const mitarbeiterOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` })),
    ];

    return (
        <div className="w-full space-y-6 pb-8">
            <Link href={`/${projektId}/teilsysteme/${id}`} className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück al Teilsystem
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Teilsystem bearbeiten</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Form Data */}
                    <Card className="lg:col-span-3 shadow-xl border-none">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg">Teilsystem-Informationen</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* First Row: System-Nr, KS */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Input
                                    label="System-Nummer"
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

                            <Input
                                label="Bezeichnung *"
                                placeholder="z.B. Baukran"
                                {...register('name')}
                                error={errors.name?.message}
                            />

                            {/* Beschreibung */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Beschreibung</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                    placeholder="Kurze Beschreibung des Systems..."
                                    {...register('beschreibung')}
                                />
                            </div>

                            {/* Bemerkung */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-accent"
                                    placeholder="Zusätzliche Notizen..."
                                    {...register('bemerkung')}
                                />
                            </div>

                            {/* Opening info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DateInput
                                    label="Eröffnet am"
                                    {...register('eroeffnetAm')}
                                />
                                <FormSelect
                                    label="Eröffnet durch"
                                    options={mitarbeiterOptions}
                                    {...register('eroeffnetDurch')}
                                />
                            </div>

                            {/* Dates row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <DateInput
                                    label="Montagetermin"
                                    {...register('montagetermin')}
                                />
                                <Input
                                    label="Lieferfrist"
                                    type="text"
                                    placeholder="Tage oder Datum"
                                    {...register('lieferfrist')}
                                />
                                <DateInput
                                    label="Plan-Abgabe"
                                    {...register('abgabePlaner')}
                                />
                            </div>

                            {/* Status fields */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormSelect
                                    label="Plan-Status"
                                    options={planStatusOptions}
                                    {...register('planStatus')}
                                />
                                <Input
                                    label="WEMA Link"
                                    placeholder="Pfad oder URL"
                                    {...register('wemaLink')}
                                />
                                <FormSelect
                                    label="Status *"
                                    options={statusOptions}
                                    {...register('status')}
                                    error={errors.status?.message}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-end gap-4">
                            <Link href={`/${projektId}/teilsysteme/${id}`}>
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

                    {/* Right Column: IFC Upload Container */}
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
                                <h3 className="text-xs font-bold text-foreground mb-1">
                                    {currentIfcUrl ? 'IFC ersetzen' : 'IFC hierher ziehen'}
                                </h3>
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
                                {selectedFileName && (
                                    <div className="mt-3 p-2 bg-green-50 text-green-700 rounded text-xs font-bold flex items-center gap-2 w-full truncate">
                                        <FileType className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{selectedFileName}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>

            {/* IFC Extracting overlay */}
            {extracting && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl border-2 border-border p-10 flex flex-col items-center gap-4">
                        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <h3 className="text-lg font-black text-foreground">Analysiere IFC...</h3>
                        <p className="text-sm text-muted-foreground">Positionen, Unterpositionen und Material werden extrahiert</p>
                    </div>
                </div>
            )}

            {/* IFC Import Modal */}
            {ifcExtractData && (
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
            )}
        </div>
    );
}

