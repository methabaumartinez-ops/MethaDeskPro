'use client';
import { toast } from '@/lib/toast';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/lib/services/projectService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmployeeService } from '@/lib/services/employeeService';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ArrowLeft, Save, Building2, MapPin, User, Hash, Loader2, Plus, FileText, Trash2, Archive, ChevronDown, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const FormSelect = React.forwardRef<
    HTMLSelectElement,
    { label: string; error?: string; options: { label: string; value: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ label, error, options, ...props }, ref) => (
    <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{label}</label>
        <select
            ref={ref}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
));
FormSelect.displayName = "FormSelect";

const FormInput = React.forwardRef<HTMLInputElement, { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>>(
    ({ label, error, className, ...props }, ref) => (
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none">{label}</label>
            <Input ref={ref} className={className} {...props} />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    )
);
FormInput.displayName = "FormInput";

const CANTONS = [
    { label: 'Bitte wählen...', value: '' },
    { label: 'Aargau', value: 'Aargau' },
    { label: 'Appenzell Ausserrhoden', value: 'Appenzell Ausserrhoden' },
    { label: 'Appenzell Innerrhoden', value: 'Appenzell Innerrhoden' },
    { label: 'Basel-Landschaft', value: 'Basel-Landschaft' },
    { label: 'Basel-Stadt', value: 'Basel-Stadt' },
    { label: 'Bern', value: 'Bern' },
    { label: 'Freiburg', value: 'Freiburg' },
    { label: 'Genf', value: 'Genf' },
    { label: 'Glarus', value: 'Glarus' },
    { label: 'Graubünden', value: 'Graubünden' },
    { label: 'Jura', value: 'Jura' },
    { label: 'Luzern', value: 'Luzern' },
    { label: 'Neuenburg', value: 'Neuenburg' },
    { label: 'Nidwalden', value: 'Nidwalden' },
    { label: 'Obwalden', value: 'Obwalden' },
    { label: 'Schaffhausen', value: 'Schaffhausen' },
    { label: 'Schwyz', value: 'Schwyz' },
    { label: 'Solothurn', value: 'Solothurn' },
    { label: 'St. Gallen', value: 'St. Gallen' },
    { label: 'Tessin', value: 'Tessin' },
    { label: 'Thurgau', value: 'Thurgau' },
    { label: 'Uri', value: 'Uri' },
    { label: 'Waadt', value: 'Waadt' },
    { label: 'Wallis', value: 'Wallis' },
    { label: 'Zug', value: 'Zug' },
    { label: 'Zürich', value: 'Zürich' },
];

const projektSchema = z.object({
    projektnummer: z.string().min(1, 'Projektnummer ist erforderlich'),
    projektname: z.string().min(3, 'Projektname muss mindestens 3 Zeichen lang sein'),
    strasse: z.string().optional(),
    plz: z.string().min(4, 'PLZ ist erforderlich'),
    ort: z.string().min(1, 'Ort ist erforderlich'),
    kanton: z.string().min(2, 'Kanton ist erforderlich'),
    projektleiter: z.string().optional(),
    bauleiter: z.string().optional(),
    polier: z.string().optional(),
    bimKonstrukteur: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
    imageUrl: z.string().optional(),
});

type ProjektValues = z.infer<typeof projektSchema>;

export default function ProjektBearbeitenPage() {
    const router = useRouter();
    const { id } = useParams() as { id: string };
    const { currentUser } = useProjekt();
    const [loading, setLoading] = React.useState(true);
    const [notFound, setNotFound] = React.useState(false);
    const [mitarbeiter, setMitarbeiter] = React.useState<any[]>([]);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [infoBlattFile, setInfoBlattFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [projektName, setProjektName] = React.useState<string>('');
    const [projektNummer, setProjektNummer] = React.useState<string>('');

    // --- Archive state ---
    const [isArchiving, setIsArchiving] = React.useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

    // --- Hard delete state (admin only, double confirmation) ---
    const [showHardDeleteAdvanced, setShowHardDeleteAdvanced] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showHardDelete1, setShowHardDelete1] = React.useState(false);
    const [showHardDelete2, setShowHardDelete2] = React.useState(false);

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ProjektValues>({
        resolver: zodResolver(projektSchema),
    });

    const mitarbeiterOptions = React.useMemo(() => [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter
            .sort((a: any, b: any) => `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`, 'de'))
            .map((m: any) => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` }))
    ], [mitarbeiter]);

    React.useEffect(() => {
        const loadProject = async () => {
            try {
                const allProjects = await ProjectService.getProjekte();
                const projekt = allProjects.find(p => p.id === id);
                if (!projekt) {
                    setNotFound(true);
                    return;
                }
                reset({
                    projektnummer: projekt.projektnummer,
                    projektname: projekt.projektname,
                    strasse: projekt.strasse || '',
                    plz: projekt.plz || '',
                    ort: projekt.ort,
                    kanton: projekt.kanton,
                    projektleiter: projekt.projektleiter || '',
                    bauleiter: projekt.bauleiter || '',
                    polier: projekt.polier || '',
                    bimKonstrukteur: projekt.bimKonstrukteur || '',
                    status: projekt.status,
                    imageUrl: projekt.imageUrl || '',
                });
                setProjektName(projekt.projektname);
                setProjektNummer(projekt.projektnummer);
                if (projekt.imageUrl) {
                    const previewSrc = projekt.imageUrl.includes('drive.google.com')
                        ? `/api/image-proxy?url=${encodeURIComponent(projekt.imageUrl)}`
                        : projekt.imageUrl;
                    setImagePreview(previewSrc);
                }
            } catch (error) {
                console.error('Failed to load project:', error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        loadProject();
    }, [id, reset]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setImagePreview(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const handleInfoBlattChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setInfoBlattFile(file);
    };

    React.useEffect(() => {
        const loadMitarbeiter = async () => {
            try {
                const data = await EmployeeService.getMitarbeiter();
                setMitarbeiter(data);
            } catch (error) {
                console.error('Failed to load mitarbeiter', error);
            }
        };
        loadMitarbeiter();
    }, []);

    const onSubmit = async (data: ProjektValues) => {
        try {
            let imageUrl = data.imageUrl;
            if (imageFile) {
                imageUrl = await ProjectService.uploadImage(imageFile, id, 'image');
            }

            let infoBlattUrl = undefined;
            let infoBlattName = undefined;
            if (infoBlattFile) {
                infoBlattUrl = await ProjectService.uploadImage(infoBlattFile, id, 'document');
                infoBlattName = infoBlattFile.name;
            }

            await ProjectService.updateProjekt(id, {
                ...data,
                status: data.status as any,
                imageUrl: imageUrl,
                infoBlattUrl: infoBlattUrl,
                infoBlattName: infoBlattName,
            });
            toast.success('Projekt erfolgreich aktualisiert');
            router.push('/projekte');
        } catch (error: any) {
            console.error('Failed to update project:', error);
            toast.error(`Fehler: ${error.message}`);
        }
    };

    // ── ARCHIVE (primary delete action) ──────────────────────────────────────
    const handleArchiveConfirmed = async () => {
        setIsArchiving(true);
        try {
            await ProjectService.archiveProjekt(id);
            toast.success('Projekt archiviert', { 
                title: 'Erfolg'
            });
            router.push('/projekte');
        } catch (error: any) {
            console.error('Failed to archive project:', error);
            toast.error('Archivierung fehlgeschlagen', { 
                title: 'Fehler'
            });
        } finally {
            setIsArchiving(false);
        }
    };

    // ── HARD DELETE (admin, double confirmation) ──────────────────────────────
    const handleHardDeleteConfirmed = async () => {
        setIsDeleting(true);
        toast.info('Archivierung läuft... Bitte warten. Drive-Dateien werden heruntergeladen und verpackt.', {
            title: 'Archivierung startet'
        });
        try {
            const res = await fetch(`/api/projekte/${id}/export-delete`, { method: 'POST' });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Export fehlgeschlagen');
            }

            const blob = await res.blob();
            const archiveFileId = res.headers.get('X-Archive-Drive-File-Id');
            const driveFiles = res.headers.get('X-Drive-Files-Downloaded');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `archiv_${projektNummer || id}_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            toast.success(
                `Archiv in Drive gespeichert (${driveFiles ?? '?'} Dateien). Projekt gelöscht.`,
                { title: '✅ Archivierung abgeschlossen' }
            );
            router.push('/projekte');
        } catch (error: any) {
            console.error('Failed to export/delete project:', error);
            toast.error(error?.message || 'Löschen fehlgeschlagen', { 
                title: 'Fehler beim Archivieren'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-4 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Projekt nicht gefunden</h1>
                <Link href="/projekte">
                    <Button variant="outline">Zurück zur Projektwahl</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 py-12 px-4 pb-20">
            <Link href="/projekte" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Projektwahl
            </Link>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Projekt bearbeiten</h1>
                    <p className="text-muted-foreground font-medium">Ändern Sie die Projektdaten.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <Card className="shadow-xl border-none overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-6">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <Building2 className="h-6 w-6 text-primary" />
                            Stammdaten & Standort
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {/* Image & InfoBlatt Upload */}
                        <div className="flex flex-col md:flex-row gap-8 items-start border-b border-slate-100 pb-8">
                            <div className="w-full md:w-1/3">
                                <label className="text-sm font-black uppercase tracking-widest text-slate-400 block mb-4">
                                    Projektbild
                                </label>
                                <div className="aspect-video w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group relative">
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => document.getElementById('project-image-input')?.click()}
                                                >
                                                    Bild ändern
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-2">
                                                <Plus className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400">KLICKEN UM BILD HOCHZULADEN</p>
                                        </div>
                                    )}
                                    <input
                                        id="project-image-input"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                    {!imagePreview && (
                                        <button
                                            type="button"
                                            className="absolute inset-0 w-full h-full cursor-pointer"
                                            onClick={() => document.getElementById('project-image-input')?.click()}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="w-full md:w-1/3">
                                <label className="text-sm font-black uppercase tracking-widest text-slate-400 block mb-4">
                                    <FileText className="h-3.5 w-3.5 inline mr-2 text-primary" />
                                    InfoBlatt
                                </label>
                                <div className="p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50">
                                    <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={handleInfoBlattChange}
                                        className="cursor-pointer file:cursor-pointer file:text-primary file:font-semibold text-xs"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2">PDF, Word oder Excel Dokument.</p>
                                    {infoBlattFile && (
                                        <p className="text-[10px] font-bold text-green-600 mt-1 truncate">Neu: {infoBlattFile.name}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <FormInput
                                    label="Projektnummer *"
                                    placeholder="z.B. 2024-001"
                                    {...register('projektnummer')}
                                    error={errors.projektnummer?.message}
                                />
                                <Hash className="absolute right-3 top-[38px] h-4 w-4 text-slate-300" />
                            </div>
                            <div className="relative">
                                <FormInput
                                    label="Projektname *"
                                    placeholder="Name des Bauvorhabens"
                                    {...register('projektname')}
                                    error={errors.projektname?.message}
                                />
                                <Building2 className="absolute right-3 top-[38px] h-4 w-4 text-slate-300" />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-6 pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Standort
                            </h3>
                            <FormInput
                                label="Strasse / Hausnummer"
                                placeholder="Musterstrasse 123"
                                {...register('strasse')}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput label="PLZ *" placeholder="8000" {...register('plz')} error={errors.plz?.message} />
                                <FormInput label="Ort *" placeholder="Zürich" {...register('ort')} error={errors.ort?.message} />
                                <FormSelect
                                    label="Kanton *"
                                    options={CANTONS}
                                    {...register('kanton')}
                                    error={errors.kanton?.message}
                                />
                            </div>
                        </div>

                        {/* Staff */}
                        <div className="space-y-6 pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Verantwortlichkeiten
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SearchableSelect
                                    label="Projektleiter"
                                    options={mitarbeiterOptions}
                                    value={watch('projektleiter')}
                                    onChange={(v) => setValue('projektleiter', v)}
                                />
                                <SearchableSelect
                                    label="Bauleiter"
                                    options={mitarbeiterOptions}
                                    value={watch('bauleiter')}
                                    onChange={(v) => setValue('bauleiter', v)}
                                />
                                <SearchableSelect
                                    label="Polier"
                                    options={mitarbeiterOptions}
                                    value={watch('polier')}
                                    onChange={(v) => setValue('polier', v)}
                                />
                                <SearchableSelect
                                    label="BIM Konstrukteur"
                                    options={mitarbeiterOptions}
                                    value={watch('bimKonstrukteur')}
                                    onChange={(v) => setValue('bimKonstrukteur', v)}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <FormSelect
                                label="Status *"
                                options={[
                                    { label: 'Offen', value: 'offen' },
                                    { label: 'In Arbeit', value: 'in arbeit' },
                                    { label: 'Abgeschlossen', value: 'abgeschlossen' },
                                ]}
                                {...register('status')}
                                error={errors.status?.message}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-8 flex justify-between items-center gap-4">
                        {/* Primary: Archive button */}
                        <Button
                            type="button"
                            variant="outline"
                            className="font-bold h-12 px-8 flex items-center gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-50"
                            onClick={() => setShowArchiveConfirm(true)}
                            disabled={isArchiving || isSubmitting}
                        >
                            {isArchiving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Archive className="h-5 w-5" />
                            )}
                            <span>Archivieren</span>
                        </Button>

                        <div className="flex gap-4">
                            <Link href="/projekte">
                                <Button type="button" variant="outline" className="font-bold h-12 px-8">Abbrechen</Button>
                            </Link>
                            <Button type="submit" className="font-bold h-12 px-10 shadow-lg shadow-primary/20" disabled={isSubmitting || isArchiving}>
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Wird gespeichert...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Save className="h-5 w-5" />
                                        Änderungen speichern
                                    </span>
                                )}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </form>

            {/* ── Advanced Admin Section: Hard Delete ───────────────────────────── */}
            {isAdmin && (
                <div className="border border-red-200 rounded-2xl overflow-hidden">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between p-5 bg-red-50 hover:bg-red-100 transition-colors text-left"
                        onClick={() => setShowHardDeleteAdvanced(prev => !prev)}
                    >
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="text-sm font-black text-red-700 uppercase tracking-widest">Erweiterte Admin-Optionen</p>
                                <p className="text-xs text-red-500 font-medium">Nur für Administratoren sichtbar</p>
                            </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-red-500 transition-transform ${showHardDeleteAdvanced ? 'rotate-180' : ''}`} />
                    </button>

                    {showHardDeleteAdvanced && (
                        <div className="p-6 bg-white space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                                <p className="text-sm font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" /> Dauerhaftes Löschen
                                </p>
                                <p className="text-xs text-red-600 font-medium leading-relaxed">
                                    Exportiert alle Projektdaten als JSON und löscht das Projekt dauerhaft aus der Datenbank.
                                    <strong className="block mt-1">Diese Aktion ist nicht umkehrbar. Es wird kein Backup in Drive erstellt.</strong>
                                </p>
                                <Button
                                    type="button"
                                    variant="danger"
                                    className="font-bold h-10 px-6 flex items-center gap-2 mt-2"
                                    onClick={() => setShowHardDelete1(true)}
                                    disabled={isDeleting || isArchiving}
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span>Projekt dauerhaft löschen</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Archive Confirmation Modal ────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                onConfirm={handleArchiveConfirmed}
                title="Projekt archivieren?"
                description="Das Projekt wird archiviert und als ZIP gesichert. Die Daten werden aus der aktiven Datenbank entfernt. Sie können das Projekt jederzeit wiederherstellen."
                confirmLabel="Archivieren"
                cancelLabel="Abbrechen"
                variant="warning"
            />

            {/* ── Hard Delete: First Confirmation ──────────────────────────────── */}
            <ConfirmDialog
                isOpen={showHardDelete1}
                onClose={() => setShowHardDelete1(false)}
                onConfirm={() => { setShowHardDelete1(false); setShowHardDelete2(true); }}
                title="Wirklich löschen?"
                description={`Sie sind dabei, das Projekt "${projektName}" dauerhaft zu löschen. Die Daten werden als JSON exportiert, dann komplett entfernt. Kein Drive-Backup wird erstellt.`}
                confirmLabel="Ja, weiter"
                cancelLabel="Abbrechen"
                variant="danger"
            />

            {/* ── Hard Delete: Second (Final) Confirmation ──────────────────────── */}
            <ConfirmDialog
                isOpen={showHardDelete2}
                onClose={() => setShowHardDelete2(false)}
                onConfirm={handleHardDeleteConfirmed}
                title="Letzte Warnung"
                description="Diese Aktion ist NICHT umkehrbar. Das Projekt wird dauerhaft gelöscht. Sind Sie absolut sicher?"
                confirmLabel="Dauerhaft löschen"
                cancelLabel="Abbrechen"
                variant="danger"
            />
        </div>
    );
}
