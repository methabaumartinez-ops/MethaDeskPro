'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/lib/services/projectService';
import { EmployeeService } from '@/lib/services/employeeService';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ArrowLeft, Save, Building2, MapPin, User, Hash, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';

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
    { label: 'Aargau', value: 'AG' },
    { label: 'Appenzell Ausserrhoden', value: 'AR' },
    { label: 'Appenzell Innerrhoden', value: 'AI' },
    { label: 'Basel-Landschaft', value: 'BL' },
    { label: 'Basel-Stadt', value: 'BS' },
    { label: 'Bern', value: 'BE' },
    { label: 'Freiburg', value: 'FR' },
    { label: 'Genf', value: 'GE' },
    { label: 'Glarus', value: 'GL' },
    { label: 'Graubünden', value: 'GR' },
    { label: 'Jura', value: 'JU' },
    { label: 'Luzern', value: 'LU' },
    { label: 'Neuenburg', value: 'NE' },
    { label: 'Nidwalden', value: 'NW' },
    { label: 'Obwalden', value: 'OW' },
    { label: 'Schaffhausen', value: 'SH' },
    { label: 'Schwyz', value: 'SZ' },
    { label: 'Solothurn', value: 'SO' },
    { label: 'St. Gallen', value: 'SG' },
    { label: 'Tessin', value: 'TI' },
    { label: 'Thurgau', value: 'TG' },
    { label: 'Uri', value: 'UR' },
    { label: 'Waadt', value: 'VD' },
    { label: 'Wallis', value: 'VS' },
    { label: 'Zug', value: 'ZG' },
    { label: 'Zürich', value: 'ZH' },
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
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProjektValues>({
        resolver: zodResolver(projektSchema),
    });

    React.useEffect(() => {
        const loadProject = async () => {
            try {
                // Fetch all projects and find by id (more reliable than single-item endpoint)
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
                if (projekt.imageUrl) {
                    setImagePreview(projekt.imageUrl);
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
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
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
                // In a real app, this would be an upload call to a storage service
                imageUrl = await ProjectService.uploadImage(imageFile);
            }

            await ProjectService.updateProjekt(id, {
                ...data,
                status: data.status as any,
                imageUrl: imageUrl,
            });
            window.alert('Projekt erfolgreich aktualisiert');
            router.push('/projekte');
        } catch (error: any) {
            console.error('Failed to update project:', error);
            window.alert(`Fehler: ${error.message}`);
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
                        {/* Image Upload */}
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
                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-slate-500 font-medium">
                                    Laden Sie ein Repräsentatives Bild für Ihr Projekt hoch.
                                    Dies hilft Teammitgliedern, das Projekt in der Übersicht schneller zu identifizieren.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                                    <li>Empfohlen: 16:9 Format</li>
                                    <li>Maximal 5MB DATEIGRÖSSE</li>
                                    <li>Formate: JPG, PNG, WEBP</li>
                                </ul>
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
                                <FormSelect
                                    label="Projektleiter"
                                    options={[
                                        { label: 'Bitte wählen...', value: '' },
                                        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` }))
                                    ]}
                                    {...register('projektleiter')}
                                />
                                <FormSelect
                                    label="Bauleiter"
                                    options={[
                                        { label: 'Bitte wählen...', value: '' },
                                        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` }))
                                    ]}
                                    {...register('bauleiter')}
                                />
                                <FormSelect
                                    label="Polier"
                                    options={[
                                        { label: 'Bitte wählen...', value: '' },
                                        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` }))
                                    ]}
                                    {...register('polier')}
                                />
                                <FormSelect
                                    label="BIM Konstrukteur"
                                    options={[
                                        { label: 'Bitte wählen...', value: '' },
                                        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname}`, value: `${m.vorname} ${m.nachname}` }))
                                    ]}
                                    {...register('bimKonstrukteur')}
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
                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-8 flex justify-end gap-4">
                        <Link href="/projekte">
                            <Button type="button" variant="outline" className="font-bold h-12 px-8">Abbrechen</Button>
                        </Link>
                        <Button type="submit" className="font-bold h-12 px-10 shadow-lg shadow-primary/20" disabled={isSubmitting}>
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
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
