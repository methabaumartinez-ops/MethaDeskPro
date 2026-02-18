'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubsystemService } from '@/lib/services/subsystemService';
import { EmployeeService } from '@/lib/services/employeeService';
import { ArrowLeft, Save, Calendar, UploadCloud, FileType } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const teilsystemSchema = z.object({
    teilsystemNummer: z.string().min(1, 'System-Nummer ist erforderlich'),
    ks: z.string().optional(),
    name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
    beschreibung: z.string().optional(),
    bemerkung: z.string().optional(),
    eroeffnetAm: z.string().min(1, 'Eröffnungsdatum ist erforderlich'),
    eroeffnetDurch: z.string().min(1, 'Eröffnet durch ist erforderlich'),
    montagetermin: z.string().optional(),
    lieferfrist: z.string().optional(),
    abgabePlaner: z.string().optional(),
    planStatus: z.string().optional(),
    wemaLink: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
});

type TeilsystemValues = z.infer<typeof teilsystemSchema>;
export default function TeilsystemErfassenPage() {
    const { projektId } = useParams() as { projektId: string };
    const router = useRouter();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
    const [mitarbeiter, setMitarbeiter] = React.useState<any[]>([]);
    const [loadingMitarbeiter, setLoadingMitarbeiter] = React.useState(true);

    React.useEffect(() => {
        const load = async () => {
            try {
                const data = await EmployeeService.getMitarbeiter();
                setMitarbeiter(data);
            } catch (error) {
                console.error("Failed to load mitarbeiter", error);
            } finally {
                setLoadingMitarbeiter(false);
            }
        };
        load();
    }, []);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<TeilsystemValues>({
        resolver: zodResolver(teilsystemSchema),
        defaultValues: {
            status: 'offen',
            ks: '1',
            planStatus: 'offen',
            eroeffnetDurch: 'Moritz', // Default but accessible via select
            eroeffnetAm: new Date().toLocaleDateString('de-DE'),
            montagetermin: 'nach Absprache Bauleitung',
        }
    });

    const onSubmit = async (data: TeilsystemValues) => {
        const resolveName = (id: string) => {
            const m = mitarbeiter.find(x => x.id === id);
            return m ? `${m.vorname} ${m.nachname}` : id;
        };

        const { SubsystemService } = await import('@/lib/services/subsystemService');
        try {
            await SubsystemService.createTeilsystem({
                ...data,
                projektId,
                eroeffnetDurch: resolveName(data.eroeffnetDurch),
                status: data.status as any
            });
            router.push(`/${projektId}/teilsysteme`);
        } catch (error) {
            console.error("Failed to create teilsystem", error);
            alert("Fehler beim Speichern");
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0].name);
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
            setSelectedFile(e.dataTransfer.files[0].name);
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
        <div className="max-w-5xl mx-auto space-y-6 pb-8">
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

                            <Input
                                label="Bezeichnung *"
                                placeholder="z.B. Baukran"
                                {...register('name')}
                                error={errors.name?.message}
                            />

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
                                    <div className="mt-3 p-2 bg-green-50 text-green-700 rounded text-xs font-bold flex items-center gap-2 w-full truncate">
                                        <FileType className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{selectedFile}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
