'use client';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubPositionService } from '@/lib/services/subPositionService';
import { LagerortService } from '@/lib/services/lagerortService';
import { LagerortSelect } from '@/components/shared/LagerortSelect';
import { Unterposition, Lagerort, Beschichtung, PlanStatus, ABTEILUNGEN_CONFIG } from '@/types';
import { POS_ALLOWED_STATUSES, STATUS_UI_CONFIG, getStatusColorClasses } from '@/lib/config/statusConfig';
import { ArrowLeft, Save, UploadCloud, FileType, Paperclip, FileText, Loader2, X, Search, Plus, Loader, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ProjectService } from '@/lib/services/projectService';
import { SupplierService } from '@/lib/services/supplierService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal';
import { Badge } from '@/components/ui/badge';

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

const unterpositionSchema = z.object({
    posNummer: z.string().min(1, 'Positionsnummer ist erforderlich'),
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(0.01),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
    planStatus: z.string().min(1, 'Plan Status ist erforderlich'),
    beschichtung: z.string().optional(),
    gewicht: z.coerce.number().optional(),
    lagerortId: z.string().optional(),
    lieferantId: z.string().optional(),
    bemerkung: z.string().optional(),
    ifcUrl: z.string().optional(),
});

type UnterpositionValues = z.infer<typeof unterpositionSchema>;

export default function UnterpositionEditPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [unterposition, setUnterposition] = useState<Unterposition | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue, control } = useForm<UnterpositionValues>({
        resolver: zodResolver(unterpositionSchema),
    });

    const [dragActive, setDragActive] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [docDragActive, setDocDragActive] = useState(false);
    const [dokumenteFiles, setDokumenteFiles] = useState<any[]>([]);
    const [uploadingDocs, setUploadingDocs] = useState(false);
    const docInputRef = React.useRef<HTMLInputElement>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [allLieferanten, setAllLieferanten] = useState<any[]>([]);

    const loadDokumente = async () => {
        try {
            const res = await fetch(`/api/dokumente?entityId=${id}&entityType=unterposition`);
            if (res.ok) setDokumenteFiles(await res.json());
        } catch (e) {
            console.error('Failed to load docs:', e);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [data, lo, lieferantenData] = await Promise.all([
                    SubPositionService.getUnterpositionById(id),
                    LagerortService.getLagerorte(projektId),
                    SupplierService.getLieferanten(),
                ]);
                setAllLieferanten(Array.isArray(lieferantenData) ? lieferantenData : []);
                if (data) {
                    setUnterposition(data);
                    reset({
                        posNummer: data.posNummer || '',
                        name: data.name,
                        menge: data.menge,
                        einheit: data.einheit,
                        status: data.status as any,
                        planStatus: data.planStatus || 'offen',
                        beschichtung: data.beschichtung || '',
                        gewicht: data.gewicht,
                        lagerortId: data.lagerortId || '',
                        lieferantId: data.lieferantId || '',
                        bemerkung: data.bemerkung || '',
                        ifcUrl: data.ifcUrl || '',
                    } as any);

                    if (data.ifcUrl) {
                        try {
                            const url = new URL(data.ifcUrl);
                            setSelectedFileName(url.searchParams.get('name') || 'Modell vorhanden');
                        } catch (e) {
                            setSelectedFileName('Modell vorhanden');
                        }
                    }
                }
                setLagerorte(lo);
                loadDokumente();
            } catch (error) {
                console.error('Failed to load unterposition', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, projektId, reset]);

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
                        entityType: 'unterposition',
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

    const onSubmit = async (data: UnterpositionValues) => {
        try {
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

            await SubPositionService.updateUnterposition(id, {
                ...data,
                status: data.status as any,
                planStatus: data.planStatus as any,
                beschichtung: data.beschichtung as any,
                ifcUrl: uploadedIfcUrl,
                ifcFileName: selectedFileName || undefined
            });
            toast.success('Änderungen gespeichert');
            router.push(`/${projektId}/unterpositionen/${id}`);
        } catch (error) {
            console.error('Failed to update unterposition', error);
            toast.error('Fehler beim Speichern');
        }
    };

    const handleDeleteConfirmed = async () => {
        try {
            await SubPositionService.deleteUnterposition(id);
            toast.success("Unterposition gelöscht");
            router.push(`/${projektId}/positionen/${unterposition?.positionId || ''}`);
        } catch (error) {
            console.error("Failed to delete", error);
            toast.error("Fehler beim Löschen");
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return (
        <div className="h-64 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    return (
        <div className="w-full space-y-6 pb-8 animate-in fade-in duration-500">
            <Link href={`/${projektId}/unterpositionen/${id}`} className="inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück zur Unterposition
            </Link>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Unt.Pos bearbeiten</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                    {/* Left Column: Form Data */}
                    <Card className="lg:col-span-3 shadow-xl border-none">
                        <CardHeader className="bg-muted/30 border-b py-3">
                            <CardTitle className="text-base font-black uppercase tracking-wider text-muted-foreground">
                                Unt.Pos-Informationen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Input label="Pos. Nummer *" {...register('posNummer')} error={errors.posNummer?.message} className="h-11 font-bold" />
                                <div className="md:col-span-3">
                                    <Input label="Bezeichnung *" {...register('name')} error={errors.name?.message} className="h-11 font-bold" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Menge *" type="number" step="0.01" {...register('menge')} error={errors.menge?.message} className="h-11" />
                                <Input label="Einheit" placeholder="Stk, m, m²" {...register('einheit')} error={errors.einheit?.message} className="h-11" />
                                <Input label="Gewicht (kg)" type="number" step="0.1" {...register('gewicht')} placeholder="Optional" className="h-11" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Pos Status *"
                                    options={[
                                        { value: 'offen', label: 'Offen' },
                                        { value: 'bestellt', label: 'Bestellt' },
                                        { value: 'in_produktion', label: 'In Produktion' },
                                        { value: 'fertig', label: 'Fertig' },
                                        { value: 'geliefert', label: 'Geliefert' },
                                        { value: 'verbaut', label: 'Verbaut' },
                                        { value: 'abgeschlossen', label: 'Abgeschlossen' },
                                    ]}
                                    {...register('status')}
                                    error={errors.status?.message}
                                    className={cn('h-11 font-bold', getStatusColorClasses(watch('status')))}
                                />
                                <Select
                                    label="Plan Status *"
                                    options={PLAN_STATUS.map(p => ({ value: p.value, label: p.label }))}
                                    {...register('planStatus')}
                                    error={errors.planStatus?.message}
                                    className={cn('h-11 font-bold', getStatusColorClasses(watch('planStatus')))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Beschichtung"
                                    options={[
                                        { value: '', label: '— Keine Beschichtung —' },
                                        ...BESCHICHTUNGEN.map(b => ({ value: b, label: b }))
                                    ]}
                                    {...register('beschichtung')}
                                    className="h-11"
                                />
                                <LagerortSelect
                                    projektId={projektId}
                                    lagerorte={lagerorte}
                                    onLagerortAdded={(newLagerort) => setLagerorte(prev => [...prev, newLagerort])}
                                    {...register('lagerortId')}
                                    className="h-11"
                                />
                            </div>
                            <div>
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
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1">Bemerkung</label>
                                <textarea
                                    className="flex min-h-[100px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-accent"
                                    {...register('bemerkung')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Column: Actions + Uploads */}
                    <div className="space-y-4 sticky top-6">
                        {/* Action Buttons — same size as Zurück button */}
                        <div className="flex justify-between gap-3">
                            <Link href={`/${projektId}/unterpositionen/${id}`}>
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

                        {/* IFC */}
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-3 px-4">
                                <CardTitle className="text-xs font-black text-foreground flex items-center gap-2">
                                    <UploadCloud className="h-3.5 w-3.5 text-primary" />
                                    Teil-Modell (IFC)
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
                                    {watch('ifcUrl') ? 'Modell ersetzen' : 'IFC hierher ziehen'}
                                </h3>
                                <p className="text-[9px] font-medium text-muted-foreground mb-3 text-center">
                                    Nur .ifc (Max. 50MB)
                                </p>
                                <Button type="button" size="sm" variant="metha-orange" className="text-[10px] font-bold h-7 px-3" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
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
                                    Detail-Dokumente
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
                                <Button type="button" size="sm" variant="metha-orange" className="text-[10px] font-bold h-7 px-3" onClick={(e) => { e.stopPropagation(); docInputRef.current?.click(); }}>
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

                {/* Bottom: Delete */}
                <div className="flex justify-start pt-4 border-t border-border/50">
                    <Button
                        type="button"
                        variant="danger"
                        className="font-bold h-10 px-6 flex items-center gap-2"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        Unt.Pos loeschen
                    </Button>
                </div>
            </form >

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
                title="Unterposition löschen"
                description={`Sind Sie sicher, dass Sie diese Unterposition ("${unterposition?.name}") permanent löschen möchten?`}
                confirmLabel="Löschen"
                variant="danger"
            />
        </div>
    );
}
