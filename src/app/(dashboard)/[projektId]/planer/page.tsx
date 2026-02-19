'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
    Calendar, Search, Filter,
    Clock, CheckCircle2, FileText,
    Download, UploadCloud, FileType, X,
    ChevronRight, Save, Image as ImageIcon, File
} from 'lucide-react';
import { SubsystemService } from '@/lib/services/subsystemService';
import { ProjectService } from '@/lib/services/projectService';
import { Teilsystem } from '@/types';
import { cn } from '@/lib/utils';

export default function PlannerPage() {
    const { projektId } = useParams() as { projektId: string };
    const [items, setItems] = useState<Teilsystem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // File Upload States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ifcInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    // Track drag state for specific drop zones
    const [dragActive, setDragActive] = useState<string | null>(null); // 'image', 'ifc', 'doc' or null
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const subsystems = await SubsystemService.getTeilsysteme(projektId);
            setItems(subsystems);
            setLoading(false);
        };
        load();
    }, [projektId]);

    const updateItem = async (id: string, field: keyof Teilsystem, value: string) => {
        try {
            // Optimistic update
            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            ));

            // API update
            await SubsystemService.updateTeilsystem(id, { [field]: value });
        } catch (error) {
            console.error("Failed to update item:", error);
        }
    };

    const handleFileUpload = async (file: File, type: 'image' | 'plan' | 'ifc' | 'document') => {
        if (!selectedId) return;
        setUploading(true);
        try {
            // Map 'document' to 'plan' type for backend upload if backend doesn't support 'document' yet,
            // or assume we use 'plan' folder for docs. 
            // 'plan' -> 02_Pläne, 'image' -> 03_Fotos, 'ifc' -> 04_IFC.
            // For Documents, ideally '01_Dokumente'. 
            // If backend doesn't support 'document', 'plan' is safest fallback.
            // Using 'plan' for now for docs to ensure it saves somewhere.
            const uploadType = type === 'document' ? 'plan' : type;

            const url = await ProjectService.uploadImage(file, projektId, uploadType as any);

            // Determine which field to update on Teilsystem
            const updateField = type === 'ifc' ? 'ifcUrl' : type === 'document' ? 'documentUrl' : 'imageUrl';

            await updateItem(selectedId, updateField, url);

            // Update local state immediately
            setItems(prev => prev.map(item =>
                item.id === selectedId ? { ...item, [updateField]: url } : item
            ));
        } catch (error) {
            console.error("Upload failed:", error);
            const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
            alert(`Upload fehlgeschlagen: ${message}`);
        } finally {
            setUploading(false);
            setDragActive(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'plan' | 'ifc' | 'document') => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], type);
        }
    };

    const handleDrag = (e: React.DragEvent, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(type);
        } else if (e.type === "dragleave") {
            setDragActive(null);
        }
    };

    const handleDrop = (e: React.DragEvent, type: 'image' | 'plan' | 'ifc' | 'document') => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(null);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0], type);
        }
    };

    const filteredItems = items.filter(item =>
        (item.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (item.teilsystemNummer?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const getPlanStatusColor = (status: string | undefined) => {
        if (status === 'fertig' || status === 'abgeschlossen') return 'bg-green-100 text-green-700 border-green-200';
        if (status === 'in_produktion') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-muted text-muted-foreground border-border';
    };

    const selectedItem = items.find(i => i.id === selectedId);

    const getPreviewUrl = (url?: string) => {
        if (!url) return null;
        if (url.includes('drive.google.com')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // Helper to sync date input with text input
    const handleDateSelect = (field: keyof Teilsystem, dateString: string) => {
        if (!selectedId || !dateString) return;
        const date = new Date(dateString);
        const formatted = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        updateItem(selectedId, field, formatted);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 animate-in fade-in duration-500 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planer</h1>
                    <p className="text-slate-500 font-medium mt-1">Überwachen Sie Meilensteine, Planabgaben und Lieferfristen.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="font-bold gap-2">
                        <Download className="h-4 w-4" />
                        Exportieren
                    </Button>
                </div>
            </div>

            {/* Master-Detail Layout */}
            <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
                {/* Column 1: List (25%) */}
                <Card className="w-1/4 flex flex-col border-none shadow-md bg-white h-full">
                    <CardHeader className="p-4 border-b bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Suche..."
                                className="pl-9 h-9 border-slate-200 bg-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : filteredItems.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className={cn(
                                            "p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between group",
                                            selectedId === item.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent"
                                        )}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    #{item.teilsystemNummer}
                                                </span>
                                                <div className={cn("w-2 h-2 rounded-full",
                                                    item.planStatus === 'fertig' ? "bg-green-500" :
                                                        item.planStatus === 'in_produktion' ? "bg-blue-500" : "bg-slate-300"
                                                )} />
                                            </div>
                                            <p className={cn("text-sm font-bold truncate", selectedId === item.id ? "text-primary" : "text-slate-700")}>
                                                {item.name}
                                            </p>
                                        </div>
                                        <ChevronRight className={cn("h-4 w-4 text-slate-300 transition-transform", selectedId === item.id ? "text-primary translate-x-1" : "group-hover:translate-x-1")} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Keine Elemente</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Column 2: Detail Form (50%) */}
                <Card className="flex-1 border-none shadow-md bg-white h-full flex flex-col min-w-0">
                    {selectedItem ? (
                        <>
                            <CardHeader className="border-b bg-slate-50/50 p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
                                            Teilsystem #{selectedItem.teilsystemNummer}
                                        </div>
                                        <CardTitle className="text-2xl font-extrabold text-slate-900 truncate">
                                            {selectedItem.name}
                                        </CardTitle>
                                    </div>
                                    <div className={cn("px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider shrink-0", getPlanStatusColor(selectedItem.planStatus))}>
                                        {selectedItem.planStatus || 'OFFEN'}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bezeichnung</label>
                                        <Input
                                            value={selectedItem.name}
                                            onChange={(e) => updateItem(selectedItem.id, 'name', e.target.value)}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                                        <Select
                                            value={selectedItem.planStatus || 'offen'}
                                            onChange={(e) => updateItem(selectedItem.id, 'planStatus', e.target.value)}
                                            options={[
                                                { label: 'Offen', value: 'offen' },
                                                { label: 'In Produktion', value: 'in_produktion' },
                                                { label: 'Bestellt', value: 'bestellt' },
                                                { label: 'Geliefert', value: 'geliefert' },
                                                { label: 'Verbaut', value: 'verbaut' },
                                                { label: 'Abgeschlossen', value: 'abgeschlossen' },
                                            ]}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">WEMA Link</label>
                                    <Input
                                        value={selectedItem.wemaLink || ''}
                                        onChange={(e) => updateItem(selectedItem.id, 'wemaLink', e.target.value)}
                                        placeholder="Pfad oder URL"
                                    />
                                </div>

                                {/* Dates Section */}
                                <div className="bg-slate-50 p-6 rounded-xl space-y-6 border border-slate-100">
                                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Termine & Fristen
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <div className="space-y-2 relative group">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Plan-Abgabe</label>
                                            <div className="relative">
                                                <Input
                                                    value={selectedItem.abgabePlaner || ''}
                                                    onChange={(e) => updateItem(selectedItem.id, 'abgabePlaner', e.target.value)}
                                                    className="pl-10 font-medium"
                                                    placeholder="DD.MM.YYYY"
                                                />
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleDateSelect('abgabePlaner', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 relative group">
                                            <label className="text-xs font-bold text-orange-600 uppercase tracking-wide">Montagetermin</label>
                                            <div className="relative">
                                                <Input
                                                    value={selectedItem.montagetermin || ''}
                                                    onChange={(e) => updateItem(selectedItem.id, 'montagetermin', e.target.value)}
                                                    className="pl-10 font-bold text-orange-700 bg-orange-50/50 border-orange-100"
                                                    placeholder="DD.MM.YYYY"
                                                />
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleDateSelect('montagetermin', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 relative group">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lieferfrist</label>
                                            <div className="relative">
                                                <Input
                                                    value={selectedItem.lieferfrist || ''}
                                                    onChange={(e) => updateItem(selectedItem.id, 'lieferfrist', e.target.value)}
                                                    className="pl-10 font-medium"
                                                    placeholder="DD.MM.YYYY"
                                                />
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="date"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleDateSelect('lieferfrist', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t bg-slate-50/50 p-4 text-xs text-slate-400 flex justify-between items-center">
                                <span>Zuletzt bearbeitet: Heute</span>
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Gespeichert
                                </div>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                <Search className="h-8 w-8 opacity-50" />
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-700">Kein Teilsystem ausgewählt</h3>
                                <p className="text-sm">Wähle ein Element aus der Liste links.</p>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Column 3: Upload Sidebar (25%) */}
                <div className="w-1/4 flex flex-col gap-6 h-full overflow-y-auto pr-1">
                    {/* Plan/Image Upload */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 py-3 px-4">
                            <CardTitle className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                                <ImageIcon className="h-3 w-3" />
                                Plan / Ansicht
                            </CardTitle>
                        </CardHeader>
                        <CardContent
                            className={cn(
                                "p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[160px] relative group",
                                !selectedId ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50",
                                dragActive === 'image' ? "bg-primary/5 border-primary border-2 border-dashed" : "border-2 border-transparent"
                            )}
                            onDragEnter={(e) => handleDrag(e, 'image')}
                            onDragLeave={(e) => handleDrag(e, 'image')}
                            onDragOver={(e) => handleDrag(e, 'image')}
                            onDrop={(e) => handleDrop(e, 'plan')}
                            onClick={() => selectedId && fileInputRef.current?.click()}
                        >
                            {selectedItem?.imageUrl ? (
                                <div className="w-full relative">
                                    <img
                                        src={getPreviewUrl(selectedItem.imageUrl) || ''}
                                        alt="Preview"
                                        className="w-full h-auto max-h-[200px] object-contain rounded-md shadow-sm border border-slate-100"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                        <span className="text-white text-xs font-bold">Ändern</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-500 text-center">Bild/Plan hochladen</p>
                                    <span className="text-[10px] text-slate-400 mt-1">Drag & Drop</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'plan')} disabled={!selectedId} />
                        </CardContent>
                    </Card>

                    {/* IFC Upload */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 py-3 px-4">
                            <CardTitle className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                                <FileType className="h-3 w-3" />
                                IFC Modell
                            </CardTitle>
                        </CardHeader>
                        <CardContent
                            className={cn(
                                "p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[120px] relative group",
                                !selectedId ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50",
                                dragActive === 'ifc' ? "bg-primary/5 border-primary border-2 border-dashed" : "border-2 border-transparent"
                            )}
                            onDragEnter={(e) => handleDrag(e, 'ifc')}
                            onDragLeave={(e) => handleDrag(e, 'ifc')}
                            onDragOver={(e) => handleDrag(e, 'ifc')}
                            onDrop={(e) => handleDrop(e, 'ifc')}
                            onClick={() => selectedId && ifcInputRef.current?.click()}
                        >
                            {selectedItem?.ifcUrl ? (
                                <div className="w-full flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-lg border border-green-100">
                                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold truncate">Modell hochgeladen</p>
                                        <p className="text-[10px] opacity-70 truncate">Klicken zum Ersetzen</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <FileType className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-500 text-center">IFC hochladen</p>
                                    <span className="text-[10px] text-slate-400 mt-1">.ifc Datei</span>
                                </>
                            )}
                            <input type="file" ref={ifcInputRef} className="hidden" accept=".ifc" onChange={(e) => handleFileChange(e, 'ifc')} disabled={!selectedId} />
                        </CardContent>
                    </Card>

                    {/* Documents Upload */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 py-3 px-4">
                            <CardTitle className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                                <File className="h-3 w-3" />
                                Dokumente
                            </CardTitle>
                        </CardHeader>
                        <CardContent
                            className={cn(
                                "p-4 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[120px] relative group",
                                !selectedId ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50",
                                dragActive === 'doc' ? "bg-primary/5 border-primary border-2 border-dashed" : "border-2 border-transparent"
                            )}
                            onDragEnter={(e) => handleDrag(e, 'doc')}
                            onDragLeave={(e) => handleDrag(e, 'doc')}
                            onDragOver={(e) => handleDrag(e, 'doc')}
                            onDrop={(e) => handleDrop(e, 'document')}
                            onClick={() => selectedId && docInputRef.current?.click()}
                        >
                            {selectedItem?.documentUrl ? (
                                <div className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                                    <FileText className="h-5 w-5 shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold truncate">Dokument vorhanden</p>
                                        <p className="text-[10px] opacity-70 truncate">Klicken zum Ersetzen</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-500 text-center">Doku hochladen</p>
                                    <span className="text-[10px] text-slate-400 mt-1">PDF, Word, etc.</span>
                                </>
                            )}
                            <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => handleFileChange(e, 'document')} disabled={!selectedId} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
