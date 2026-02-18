'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/lib/services/projectService';
import { EmployeeService } from '@/lib/services/employeeService';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ArrowLeft, Save, Building2, MapPin, User, Hash, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Custom Select Component Wrapper for React Hook Form integration
const FormSelect = React.forwardRef<
    HTMLSelectElement,
    { label: string; error?: string; options: { label: string; value: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>
>(({ label, error, options, ...props }, ref) => (
    <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
        <select
            ref={ref}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

// Input Wrapper to match existing style props if needed (simulating the custom Input component seen in original file)
const FormInput = React.forwardRef<HTMLInputElement, { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>>(
    ({ label, error, className, ...props }, ref) => (
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>
            <Input ref={ref} className={className} {...props} />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
    )
);
FormInput.displayName = "FormInput";


const projektSchema = z.object({
    projektnummer: z.string().min(1, 'Projektnummer ist erforderlich'),
    projektname: z.string().min(3, 'Projektname muss mindestens 3 Zeichen lang sein'),
    strasse: z.string().optional(),
    plz: z.string().min(4, 'PLZ ist erforderlich'),
    ort: z.string().min(1, 'Ort ist erforderlich'),
    kanton: z.string().min(2, 'Kanton ist erforderlich'),
    projektleiter: z.string().min(1, 'Projektleiter ist erforderlich'),
    bauleiter: z.string().optional(),
    polier: z.string().optional(),
    bimKonstrukteur: z.string().optional(),
    status: z.string().min(1, 'Status ist erforderlich'),
    // imageUrl is handled separately via state
});

type ProjektValues = z.infer<typeof projektSchema>;

export default function ProjektErfassenPage() {
    const router = useRouter();
    const { currentUser } = useProjekt();
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
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
        formState: { errors, isSubmitting },
    } = useForm<ProjektValues>({
        resolver: zodResolver(projektSchema),
        defaultValues: {
            status: 'offen',
            kanton: 'ZH',
        }
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const onSubmit = async (data: ProjektValues) => {
        try {
            let uploadedImageUrl = undefined;
            const projectId = uuidv4(); // Generate ID in advance

            if (imageFile) {
                try {
                    uploadedImageUrl = await ProjectService.uploadImage(imageFile, projectId);
                } catch (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    window.alert('Bild-Upload fehlgeschlagen. Projekt wird ohne Bild erstellt.');
                }
            }

            // Map IDs back to names for storage consistency (following existing schema for now)
            const resolveName = (id: string) => {
                const m = mitarbeiter.find(x => x.id === id);
                return m ? `${m.vorname} ${m.nachname}` : id;
            };

            await ProjectService.createProjekt({
                ...data,
                id: projectId,
                projektleiter: resolveName(data.projektleiter),
                bauleiter: data.bauleiter ? resolveName(data.bauleiter) : undefined,
                polier: data.polier ? resolveName(data.polier) : undefined,
                bimKonstrukteur: data.bimKonstrukteur ? resolveName(data.bimKonstrukteur) : undefined,
                status: data.status as any,
                imageUrl: uploadedImageUrl,
                createdBy: currentUser?.id
            });

            window.alert('Projekt erfolgreich erstellt');
            router.push('/projekte');
        } catch (error: any) {
            console.error('Failed to create project:', error);
            window.alert(`Fehler beim Erstellen des Projekts: ${error.message || JSON.stringify(error)}`);
        }
    };

    const mitarbeiterOptions = [
        { label: 'Bitte wählen...', value: '' },
        ...mitarbeiter.map(m => ({ label: `${m.vorname} ${m.nachname} (${m.rolle})`, value: m.id }))
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 py-12 px-4 pb-20">
            <Link href="/projekte" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Projektwahl
            </Link>

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Neues Projekt erfassen</h1>
                    <p className="text-muted-foreground font-medium">Legen Sie ein neues Bauvorhaben im System an.</p>
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
                        <div className="flex flex-col gap-4">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Projektbild</label>
                            <div className="flex items-center gap-4">
                                {previewUrl && (
                                    <div className="relative h-20 w-32 rounded-md overflow-hidden border border-slate-200">
                                        <img src={previewUrl} alt="Vorschau" className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="cursor-pointer file:cursor-pointer file:text-primary file:font-semibold"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Optional. JPG, PNG bis 5MB.</p>
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
                                <FormInput
                                    label="PLZ *"
                                    placeholder="8000"
                                    {...register('plz')}
                                    error={errors.plz?.message}
                                />
                                <FormInput
                                    label="Ort *"
                                    placeholder="Zürich"
                                    {...register('ort')}
                                    error={errors.ort?.message}
                                />
                                <FormInput
                                    label="Kanton *"
                                    placeholder="ZH"
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
                                    label="Projektleiter *"
                                    options={mitarbeiterOptions}
                                    {...register('projektleiter')}
                                    error={errors.projektleiter?.message}
                                />
                                <FormSelect
                                    label="Bauleiter"
                                    options={mitarbeiterOptions}
                                    {...register('bauleiter')}
                                />
                                <FormSelect
                                    label="Polier"
                                    options={mitarbeiterOptions}
                                    {...register('polier')}
                                />
                                <FormSelect
                                    label="BIM Konstrukteur"
                                    options={mitarbeiterOptions}
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
                                    Wird erstellt...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-5 w-5" />
                                    Projekt erstellen
                                </span>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
