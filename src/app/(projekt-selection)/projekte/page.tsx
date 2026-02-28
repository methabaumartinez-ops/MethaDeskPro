'use client';

import React, { useEffect, useState } from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ProjectService } from '@/lib/services/projectService';
import { Projekt } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Calendar, ArrowRight, Trash2, Pencil } from 'lucide-react';
import { Signature } from '@/components/shared/Signature';

export default function ProjektePage() {
    const { setActiveProjekt, currentUser, loading: authLoading } = useProjekt();
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const loadProjekte = async () => {
            setLoadingData(true);
            try {
                const data = await ProjectService.getProjekte();
                setProjekte(data);
            } catch (error) {
                console.error("Failed to load projects:", error);
            } finally {
                setLoadingData(false);
            }
        };

        if (!authLoading) {
            loadProjekte();
        }
    }, [authLoading]);

    const handleSelect = (p: Projekt) => {
        setActiveProjekt(p);
        router.push(`/${p.id}`);
    };

    const handleExportAndDelete = async (e: React.MouseEvent, p: Projekt) => {
        e.stopPropagation();
        if (!confirm(`Möchten Sie das Projekt "${p.projektname}" wirklich exportieren und löschen?\n\nAlle Projektdaten (Teilsysteme, Positionen etc.) werden als JSON exportiert und anschliessend aus der Datenbank entfernt.`)) return;

        setDeletingId(p.id);
        try {
            const res = await fetch(`/api/projekte/${p.id}/export-delete`, { method: 'POST' });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Export fehlgeschlagen');
            }

            // Download the exported JSON
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `projekt_${p.projektnummer || p.id}_export.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            // Remove from local state
            setProjekte(prev => prev.filter(x => x.id !== p.id));
        } catch (error) {
            console.error("Failed to export/delete project:", error);
            // Show detailed error to user for debugging
            alert(`Fehler beim Exportieren und Löschen: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleEdit = (e: React.MouseEvent, p: Projekt) => {
        e.stopPropagation();
        router.push(`/projekte/bearbeiten/${p.id}`);
    };

    const getProjectImage = (p: Projekt) => {
        if (p.imageUrl) {
            // Proxy Google Drive URLs to avoid CORS issues
            if (p.imageUrl.includes('drive.google.com')) {
                return `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}`;
            }
            return p.imageUrl;
        }
        // Default to Methabau building photo
        return '/images/Foto.png';
    };

    if (authLoading) return null;

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'projektleiter' || currentUser?.role === 'mitarbeiter';

    return (
        <div className="min-h-screen bg-background pt-16">
            <Header hideProjectInfo={true} />

            <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Projekt auswählen</h1>
                        <p className="text-muted-foreground font-medium mt-1">Wählen Sie ein Projekt aus, um mit der Verwaltung zu beginnen.</p>
                    </div>

                    <Button
                        className="font-bold gap-2 shadow-lg shadow-primary/20"
                        onClick={() => router.push('/projekte/erfassen')}
                    >
                        <Plus className="h-5 w-5" />
                        Neues Projekt
                    </Button>
                </div>

                {loadingData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array(8).fill(0).map((_, i) => (
                            <Card key={i} className="animate-pulse bg-muted h-64" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projekte.map((p) => (
                            <Card key={p.id} className="group border-2 border-orange-500 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative bg-white">
                                <div className="h-28 w-full overflow-hidden relative">
                                    <img
                                        src={getProjectImage(p)}
                                        alt="Projektbild"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50" />

                                    {/* Action buttons overlay */}
                                    <div className="absolute top-2 left-2 flex gap-1.5">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleEdit(e, p)}
                                            title="Projekt bearbeiten"
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-slate-700" />
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg bg-red-600/80 hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleExportAndDelete(e, p)}
                                            title="Exportieren und Löschen"
                                            disabled={deletingId === p.id}
                                        >
                                            {deletingId === p.id ? (
                                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5 text-white" />
                                            )}
                                        </Button>
                                    </div>

                                    <div className="absolute top-3 right-3">
                                        <Badge variant={p.status === 'in arbeit' ? 'info' : 'warning'} className="shadow-sm text-[10px] px-1.5 py-0">
                                            {p.status}
                                        </Badge>
                                    </div>
                                </div>
                                <CardHeader className="pb-2 pt-4 relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/20">
                                            {p.projektnummer}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-foreground line-clamp-1">
                                        {p.projektname}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 pb-4">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/60" />
                                        <span className="line-clamp-1">{p.ort}, {p.kanton}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                                        <span>{new Date(p.createdAt).toLocaleDateString('de-CH')}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 pb-4">
                                    <Button
                                        onClick={() => handleSelect(p)}
                                        className="w-full h-9 text-sm font-bold group-hover:bg-primary group-hover:shadow-primary/20"
                                        variant="secondary"
                                    >
                                        Projekt öffnen
                                        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            <footer className="py-12 mt-12 flex flex-row items-end justify-between px-8">
                <Signature />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-60">
                    © {new Date().getFullYear()} METHABAU AG. v1.3
                </p>
            </footer>
        </div>
    );
}
