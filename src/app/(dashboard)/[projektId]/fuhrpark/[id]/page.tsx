'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FleetService } from '@/lib/services/fleetService';
import { ProjectService } from '@/lib/services/projectService';
import { Fahrzeug } from '@/types';
import {
    ArrowLeft, Car, Calendar, CheckCircle2, AlertTriangle,
    FileText, UploadCloud, Download, ExternalLink, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const LABEL_MAP: Record<string, string> = {
    bezeichnung: 'Bezeichnung',
    kategorie: 'Kategorie',
    inventarnummer: 'Inventar-Nr.',
    fabrikat: 'Fabrikat',
    typ: 'Typ',
    seriennummer: 'Serien-Nr.',
    farbe: 'Farbe',
    kennzeichen: 'Kennzeichen',
    plattformhoehe: 'Plattformhöhe',
    masse: 'Masse (LxBxH)',
    leistung: 'Leistung',
    gewicht: 'Gewicht',
    nutzlast: 'Nutzlast',
    antrieb: 'Antrieb',
    baujahr: 'Baujahr',
    kaufjahr: 'Kaufjahr',
    geprueftBis: 'Geprüft bis',
    abgaswartung: 'Abgaswartung',
    status: 'Status',
    bemerkung: 'Bemerkung',
    spezHinweis: 'Spez. Hinweis'
};

export default function FahrzeugDetailPage() {
    const { projektId, id } = useParams() as { projektId: string, id: string };
    const router = useRouter();
    const [vehicle, setVehicle] = useState<Fahrzeug | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await FleetService.getFahrzeugById(id);
                setVehicle(data);
            } catch (error) {
                console.error("Failed to load vehicle", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !vehicle) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            // Upload as 'document' type (mapped to correct folder in backend or generic)
            const url = await ProjectService.uploadImage(file, projektId, 'document');

            // Update vehicle with manual URL
            const updated = await FleetService.updateFahrzeug(vehicle.id, { manualUrl: url });
            setVehicle(updated);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload fehlgeschlagen");
        } finally {
            setUploading(false);
        }
    };

    const getPreviewUrl = (url?: string) => {
        if (!url) return null;
        if (url.includes('drive.google.com')) {
            // Use preview/embed view for Google Drive files if possible, or proxy
            // For PDF preview in iframe, we usually need the 'preview' link or similar.
            // If using our proxy:
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
            // Note: image-proxy might only handle images. If it's a PDF, we might need direct link or different handling.
            // For now, let's try direct link or proxy.
        }
        return url;
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
    if (!vehicle) return <div className="p-8 text-center">Fahrzeug nicht gefunden</div>;

    const isAvailable = vehicle.status === 'verfuegbar';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/${projektId}/fuhrpark`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{vehicle.bezeichnung}</h1>
                        <Badge variant={isAvailable ? 'success' : 'outline'} className="text-sm px-3 py-1">
                            {vehicle.status.toUpperCase()}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground font-medium mt-1 flex items-center gap-2">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                            #{vehicle.inventarnummer}
                        </span>
                        <span>{vehicle.fabrikat} {vehicle.typ}</span>
                    </p>
                </div>
                <Link href={`/${projektId}/fuhrpark/erfassen?edit=${vehicle.id}`}>
                    <Button variant="outline">Bearbeiten</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Car className="h-5 w-5 text-primary" />
                                Technische Daten
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                'kategorie', 'fabrikat', 'typ', 'seriennummer',
                                'baujahr', 'antrieb', 'leistung', 'gewicht',
                                'nutzlast', 'plattformhoehe', 'masse', 'reichweite'
                            ].map(key => {
                                const val = vehicle[key as keyof Fahrzeug];
                                if (!val) return null;
                                return (
                                    <div key={key} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-muted-foreground text-sm">{LABEL_MAP[key] || key}</span>
                                        <span className="font-medium text-right">{val}</span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                                Status & Termine
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                'kaufjahr', 'geprueftBis', 'abgaswartung', 'spezHinweis', 'bemerkung', 'kennzeichen', 'standort'
                            ].map(key => {
                                const val = vehicle[key as keyof Fahrzeug];
                                if (!val) return null;
                                return (
                                    <div key={key} className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800/50">
                                        <span className="text-muted-foreground text-sm">{LABEL_MAP[key] || key}</span>
                                        <span className="font-medium text-right">{val}</span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Manual Preview Section */}
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Betriebsanleitung
                                </CardTitle>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf"
                                        onChange={handleFileUpload}
                                    />
                                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        {uploading ? 'Lädt...' : (vehicle.manualUrl ? 'Ersetzen' : 'Hochladen')}
                                    </Button>
                                    {vehicle.manualUrl && (
                                        <Link href={vehicle.manualUrl} target="_blank" className="ml-2">
                                            <Button size="sm" variant="ghost">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 min-h-[500px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                            {vehicle.manualUrl ? (
                                <iframe
                                    src={vehicle.manualUrl.replace('/view', '/preview')} // Try to force preview mode for Google Drive
                                    className="w-full h-[600px] border-none"
                                    title="Manual Preview"
                                />
                            ) : (
                                <div className="text-center p-10">
                                    <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-600">Keine Anleitung vorhanden</h3>
                                    <p className="text-slate-400 text-sm mt-2">Laden Sie das PDF der Betriebsanleitung hoch.</p>
                                    <Button className="mt-6" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <UploadCloud className="h-4 w-4 mr-2" />
                                        PDF Hochladen
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Image (1/3) */}
                <div className="space-y-6">
                    <Card className="overflow-hidden border-none shadow-md">
                        <CardHeader className="p-4 border-b bg-slate-50/50">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Fahrzeugbild</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 bg-white flex items-center justify-center min-h-[200px]">
                            {vehicle.imageUrl ? (
                                <div className="relative w-full aspect-[4/3]">
                                    <img
                                        src={getPreviewUrl(vehicle.imageUrl) || vehicle.imageUrl}
                                        alt={vehicle.bezeichnung}
                                        className="w-full h-full object-contain p-4"
                                    />
                                </div>
                            ) : (
                                <div className="text-center p-8 text-slate-300">
                                    <Car className="h-16 w-16 mx-auto mb-2 opacity-20" />
                                    <span className="text-xs font-bold">Kein Bild</span>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-3 bg-slate-50/50 border-t justify-center">
                            <p className="text-[10px] text-muted-foreground">Bildgröße optimiert für Übersicht</p>
                        </CardFooter>
                    </Card>

                    {/* Quick Specs Logic or Status Log could go here */}
                </div>
            </div>
        </div>
    );
}
