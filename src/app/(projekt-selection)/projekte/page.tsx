'use client';
import { showAlert } from '@/lib/alert';

import React, { useEffect, useState, useCallback } from 'react';
import { useProjekt } from '@/lib/context/ProjektContext';
import { ProjectService } from '@/lib/services/projectService';
import { Projekt } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import {
    Plus, MapPin, Calendar, ArrowRight, Pencil, FileText, X,
    Trash2, Archive, ExternalLink, Loader2, AlertTriangle, ArchiveX
} from 'lucide-react';
import { Signature } from '@/components/shared/Signature';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

type ViewMode = 'aktiv' | 'geloescht';

export default function ProjektePage() {
    const { setActiveProjekt, currentUser, loading: authLoading } = useProjekt();
    const [projekte, setProjekte] = useState<Projekt[]>([]);
    const [deletedProjekte, setDeletedProjekte] = useState<Projekt[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingDeleted, setLoadingDeleted] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('aktiv');
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [confirmDeleteProject, setConfirmDeleteProject] = useState<Projekt | null>(null);
    const router = useRouter();

    const isAdmin = currentUser?.role === 'admin';

    const loadProjekte = useCallback(async () => {
        setLoadingData(true);
        try {
            const data = await ProjectService.getProjekte();
            setProjekte(data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            setLoadingData(false);
        }
    }, []);

    const loadDeletedProjekte = useCallback(async () => {
        setLoadingDeleted(true);
        try {
            const data = await ProjectService.getDeletedProjekte();
            setDeletedProjekte(data);
        } catch (error) {
            console.error("Failed to load deleted projects:", error);
        } finally {
            setLoadingDeleted(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading) {
            loadProjekte();
        }
    }, [authLoading, loadProjekte]);

    useEffect(() => {
        if (viewMode === 'geloescht' && isAdmin) {
            loadDeletedProjekte();
        }
    }, [viewMode, isAdmin, loadDeletedProjekte]);

    const handleSelect = (p: Projekt) => {
        setActiveProjekt(p);
        router.push(`/${p.id}`);
    };

    const handleEdit = (e: React.MouseEvent, p: Projekt) => {
        e.stopPropagation();
        router.push(`/projekte/bearbeiten/${p.id}`);
    };

    const handleArchiveConfirm = async () => {
        if (!confirmDeleteProject) return;
        const projectId = confirmDeleteProject.id;
        setConfirmDeleteProject(null);
        setArchivingId(projectId);
        try {
            await ProjectService.archiveProjekt(projectId);
            setProjekte(prev => prev.filter(p => p.id !== projectId));
        } catch (error: any) {
            showAlert(`Fehler beim Archivieren: ${error?.message || String(error)}`);
        } finally {
            setArchivingId(null);
        }
    };

    const getProjectImage = (p: Projekt) => {
        if (p.imageUrl) {
            if (p.imageUrl.includes('drive.google.com')) {
                return `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}`;
            }
            return p.imageUrl;
        }
        return '/images/Foto.png';
    };

    const getPreviewUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            const fileId = url.match(/id=([^&]+)/)?.[1] || url.match(/\/d\/([^/]+)/)?.[1];
            if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        return url;
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-background pt-16">
            <Header hideProjectInfo={true} />

            <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
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

                {/* View Toggle — only for admins */}
                {isAdmin && (
                    <div className="flex items-center gap-1 mb-6 bg-muted/50 p-1 rounded-xl w-fit border border-border">
                        <button
                            onClick={() => setViewMode('aktiv')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                viewMode === 'aktiv'
                                    ? "bg-white dark:bg-card text-orange-600 shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Aktiv
                        </button>
                        <button
                            onClick={() => setViewMode('geloescht')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                viewMode === 'geloescht'
                                    ? "bg-white dark:bg-card text-red-600 shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ArchiveX className="h-3.5 w-3.5" />
                            Gelöscht
                        </button>
                    </div>
                )}

                {/* ACTIVE PROJECTS */}
                {viewMode === 'aktiv' && (
                    loadingData ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array(8).fill(0).map((_, i) => (
                                <Card key={i} className="animate-pulse bg-muted h-64" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projekte.map((p) => (
                                <Card key={p.id} className={cn(
                                    "group border-2 border-orange-500 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 overflow-hidden relative bg-white dark:bg-card",
                                    archivingId === p.id && "opacity-60 pointer-events-none"
                                )}>
                                    {/* Archiving spinner overlay */}
                                    {archivingId === p.id && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                                            <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Archivierung läuft...</span>
                                        </div>
                                    )}

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
                                                className="h-7 w-7 rounded-lg bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleEdit(e, p)}
                                                title="Projekt bearbeiten"
                                            >
                                                <Pencil className="h-3.5 w-3.5 text-slate-700" />
                                            </Button>

                                            {isAdmin && (
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg bg-red-500/90 hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteProject(p); }}
                                                    title="Projekt löschen und archivieren"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-white" />
                                                </Button>
                                            )}
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
                                    <CardFooter className="pt-0 pb-4 flex flex-col gap-2">
                                        <Button
                                            onClick={() => handleSelect(p)}
                                            className="w-full h-9 text-sm font-bold transition-all hover:bg-orange-600 hover:text-white"
                                            variant="secondary"
                                        >
                                            Projekt öffnen
                                            <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                        </Button>

                                        {p.infoBlattUrl && (
                                            <Button
                                                variant="secondary"
                                                className="w-full h-9 text-sm font-bold transition-all hover:bg-orange-600 hover:text-white group"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewUrl(p.infoBlattUrl!);
                                                }}
                                            >
                                                Infoblatt
                                                <FileText className="ml-2 h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )
                )}

                {/* DELETED PROJECTS */}
                {viewMode === 'geloescht' && isAdmin && (
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Archive className="h-4 w-4" />
                            Archivierte Projekte — werden nicht gelöscht, nur deaktiviert
                        </p>

                        {loadingDeleted ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : deletedProjekte.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                                <ArchiveX className="h-12 w-12 opacity-20" />
                                <p className="font-bold text-sm uppercase tracking-widest opacity-50">Keine archivierten Projekte</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {deletedProjekte.map((p) => (
                                    <Card key={p.id} className="border-2 border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/50 opacity-80">
                                        <div className="h-28 w-full overflow-hidden relative">
                                            <img
                                                src={getProjectImage(p)}
                                                alt="Projektbild"
                                                className="w-full h-full object-cover grayscale"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/Foto.png'; }}
                                            />
                                            <div className="absolute inset-0 bg-slate-900/60" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Badge className="bg-red-600 text-white border-0 text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-lg">
                                                    Archiviert
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2 pt-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border">
                                                    {p.projektnummer}
                                                </span>
                                            </div>
                                            <CardTitle className="text-base font-bold text-muted-foreground line-clamp-1">
                                                {p.projektname}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-1 pb-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                <MapPin className="h-3 w-3" />
                                                <span className="line-clamp-1">{p.ort}, {p.kanton}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                                <span>Gelöscht: {new Date(p.deletedAt!).toLocaleDateString('de-CH')}</span>
                                            </div>
                                            {p.archivedZipName && (
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-medium truncate">
                                                    <Archive className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate">{p.archivedZipName}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-0 pb-4">
                                            {p.archivedZipUrl ? (
                                                <a href={p.archivedZipUrl} target="_blank" rel="noreferrer" className="w-full">
                                                    <Button variant="outline" className="w-full h-9 text-xs font-bold gap-2">
                                                        <Archive className="h-3.5 w-3.5" />
                                                        Backup öffnen
                                                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                                                    </Button>
                                                </a>
                                            ) : (
                                                <Button variant="outline" className="w-full h-9 text-xs font-bold gap-2 opacity-40" disabled>
                                                    Kein Backup verfügbar
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 py-3 flex flex-row items-center justify-between px-8 z-[60]">
                <Signature />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-60">
                    © {new Date().getFullYear()} METHABAU AG. v1.3
                </p>
            </footer>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!confirmDeleteProject}
                onClose={() => setConfirmDeleteProject(null)}
                onConfirm={handleArchiveConfirm}
                variant="danger"
                title="Projekt archivieren und löschen"
                description={`Das Projekt "${confirmDeleteProject?.projektname}" wird vor dem Löschen als ZIP-Datei in Google Drive archiviert (inkl. aller Daten und Dateien). Dieser Vorgang kann einige Minuten dauern.`}
                confirmLabel="Archivieren und löschen"
            />

            {/* Infoblatt Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setPreviewUrl(null)}
                    />
                    <div className="relative bg-white dark:bg-card w-full h-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Infoblatt Vorschau
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewUrl(null)}
                                className="rounded-full hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
                            <iframe
                                src={getPreviewUrl(previewUrl)}
                                className="w-full h-full border-none"
                                title="Infoblatt Preview"
                                allow="autoplay"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
