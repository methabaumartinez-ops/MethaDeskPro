'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, FileType } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { Position } from '@/types';

const subPositionSchema = z.object({
    posNummer: z.string().min(1, 'Positionsnummer ist erforderlich'),
    name: z.string().min(3, 'Bezeichnung muss mindestens 3 Zeichen lang sein'),
    menge: z.coerce.number().min(1, 'Menge muss mindestens 1 sein'),
    einheit: z.string().min(1, 'Einheit ist erforderlich'),
    positionId: z.string().min(1, 'Position ID ist erforderlich'),
    status: z.string().min(1, 'Status ist erforderlich'),
});

type SubPositionValues = z.infer<typeof subPositionSchema>;

export default function UnterpositionErfassenPage() {
    const { projektId, id: positionId } = useParams() as { projektId: string; id: string };
    const router = useRouter();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [position, setPosition] = useState<Position | null>(null);

    useEffect(() => {
        const loadPosition = async () => {
            if (positionId) {
                const pos = await PositionService.getPositionById(positionId);
                if (pos) setPosition(pos);
            }
        };
        loadPosition();
    }, [positionId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            console.log("File selected:", e.target.files[0].name);
            alert(`Datei "${e.target.files[0].name}" zum Upload bereit.`);
        }
    };

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SubPositionValues>({
        resolver: zodResolver(subPositionSchema),
        defaultValues: {
            status: 'offen',
            einheit: 'Stk',
            positionId: positionId || '',
        }
    });

    const onSubmit = async (data: SubPositionValues) => {
        try {
            await SubPositionService.createUnterposition(data as any);
            router.push(`/${projektId}/positionen/${positionId}`);
        } catch (error) {
            console.error("Error creating sub-position:", error);
            alert("Fehler beim Speichern der Unterposition.");
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
            console.log("File dropped:", e.dataTransfer.files[0].name);
            alert(`Datei "${e.dataTransfer.files[0].name}" zum Upload bereit.`);
        }
    };

    if (!positionId) {
        return <div className="p-10 text-center text-red-500 font-bold">Fehler: Keine Positions-ID angegeben.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-end mb-4">
                <Link href={`/${projektId}/positionen/${positionId}`}>
                    <Button variant="outline" size="sm" className="bg-muted hover:bg-muted/80 text-foreground font-bold h-9 text-xs">
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Zurück zur Position
                    </Button>
                </Link>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">NEUE UNTERPOSITION ZUORDNEN</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-foreground tracking-tight">POS {position?.posNummer || '—'}</span>
                        <span className="text-3xl font-black text-foreground tracking-tight">{position?.name}</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 h-full flex flex-col">
                        <Card className="shadow-sm border-none flex-1">
                            <CardHeader className="py-3 px-4 bg-muted/30 border-b">
                                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <FileType className="h-3.5 w-3.5" />
                                    Unterpositions Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 p-6">
                                <input type="hidden" {...register('positionId')} />

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-1">
                                            <Input label="Pos-Nr." placeholder="e.g. 10.1.1" {...register('posNummer')} error={errors.posNummer?.message} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <Input label="Bezeichnung" placeholder="z.B. Detail Fenster" {...register('name')} error={errors.name?.message} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Menge" type="number" {...register('menge')} error={errors.menge?.message} />
                                        <Input label="Einheit" placeholder="Stk, m, m2" {...register('einheit')} error={errors.einheit?.message} />
                                    </div>
                                    <Select label="Status" options={[{ label: 'Offen', value: 'offen' }, { label: 'Bestellt', value: 'bestellt' }]} {...register('status')} error={errors.status?.message} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6 sticky top-6 mt-1 lg:mt-[4.5rem]">
                        <Card className="shadow-none border-2 border-dashed border-border bg-muted/30 flex flex-col">
                            <CardHeader className="bg-transparent border-b-0 pb-0 pt-4 px-4">
                                <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                                    <UploadCloud className="h-4 w-4 text-primary" />
                                    Dateien hochladen
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
                                <h3 className="text-xs font-bold text-foreground mb-1">Dateien hierher ziehen</h3>
                                <p className="text-[10px] font-medium text-muted-foreground mb-4 text-center">
                                    PDF, DXF, DWG, images (Max. 50MB)
                                </p>
                                <Button type="button" size="sm" variant="outline" className="text-xs font-bold border-border h-8 px-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                    Wählen
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button type="submit" size="lg" className="font-black px-12 h-12 text-base shadow-xl shadow-primary/20 hover:scale-105 transition-transform" disabled={isSubmitting}>
                        {isSubmitting ? 'Wird gespeichert...' : 'Unterposition speichern'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
