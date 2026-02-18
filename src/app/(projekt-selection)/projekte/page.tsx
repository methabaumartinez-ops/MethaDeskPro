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
import { Plus, MapPin, Calendar, ArrowRight, Trash2, Download } from 'lucide-react';

export default function ProjektePage() {
    const { setActiveProjekt, currentUser, loading: authLoading } = useProjekt();
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [loadingData, setLoadingData] = useState(true);
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

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`Möchten Sie das Projekt "${name}" wirklich löschen?`)) return;

        try {
            await ProjectService.deleteProjekt(id);
            setProjekte(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("Fehler beim Löschen des Projekts.");
        }
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-background pt-16">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Projekt auswählen</h1>
                        <p className="text-muted-foreground font-medium mt-1">Wählen Sie ein Projekt aus, um mit der Verwaltung zu beginnen.</p>
                    </div>

                    {(currentUser?.role === 'admin' || currentUser?.role === 'projektleiter') && (
                        <Button
                            className="font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => router.push('/projekte/erfassen')}
                        >
                            <Plus className="h-5 w-5" />
                            Neues Projekt
                        </Button>
                    )}
                </div>

                {loadingData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array(4).fill(0).map((_, i) => (
                            <Card key={i} className="animate-pulse bg-muted h-64" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {projekte.map((p) => (
                            <Card key={p.id} className="group hover:border-primary/30 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative">
                                <div className="h-32 w-full overflow-hidden relative">
                                    <img
                                        src={p.status === 'abgeschlossen' ? "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop" : "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop"}
                                        alt="Projektbild"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50" />

                                    <div className="absolute top-3 left-3 flex gap-2">
                                        {(currentUser?.role === 'admin' || currentUser?.role === 'projektleiter') && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="danger"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-orange-600/80 hover:bg-orange-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
                                                        const downloadAnchorNode = document.createElement('a');
                                                        downloadAnchorNode.setAttribute("href", dataStr);
                                                        downloadAnchorNode.setAttribute("download", `projekt_${p.projektnummer}.json`);
                                                        document.body.appendChild(downloadAnchorNode);
                                                        downloadAnchorNode.click();
                                                        downloadAnchorNode.remove();
                                                        handleDelete(e, p.id, p.projektname);
                                                    }}
                                                    title="Exportar y Eliminar"
                                                >
                                                    <Download className="h-4 w-4 text-white" />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-red-600/80 hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => handleDelete(e, p.id, p.projektname)}
                                                    title="Projekt löschen"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-4 right-4">
                                        <Badge variant={p.status === 'in arbeit' ? 'info' : 'warning'} className="shadow-sm">
                                            {p.status}
                                        </Badge>
                                    </div>
                                </div>
                                <CardHeader className="pb-4 pt-6 relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                            {p.projektnummer}
                                        </span>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-foreground line-clamp-1">
                                        {p.projektname}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                        <MapPin className="h-4 w-4 text-muted-foreground/60" />
                                        <span>{p.ort}, {p.kanton}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                                        <Calendar className="h-4 w-4 text-muted-foreground/60" />
                                        <span>Erstellt am {new Date(p.createdAt).toLocaleDateString('de-CH')}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Button
                                        onClick={() => handleSelect(p)}
                                        className="w-full font-bold group-hover:bg-primary group-hover:shadow-primary/20"
                                        variant="secondary"
                                    >
                                        Projekt öffnen
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
