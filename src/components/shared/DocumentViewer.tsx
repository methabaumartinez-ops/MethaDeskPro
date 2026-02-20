'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FileText, FileImage, FileCode, Download, Eye,
    Maximize2, Minimize2, MoreVertical, Trash2,
    ChevronLeft, ChevronRight, FileUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'doc' | 'other';
    url: string;
    date: string;
    size: string;
}

interface DocumentViewerProps {
    documents: Document[];
    title?: string;
}

export function DocumentViewer({ documents = [], title = "Dokumente & Pläne" }: DocumentViewerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const toggleFullscreen = () => setIsExpanded(!isExpanded);

    const nextDoc = () => setCurrentIndex((prev) => (prev + 1) % documents.length);
    const prevDoc = () => setCurrentIndex((prev) => (prev - 1 + documents.length) % documents.length);

    const currentDoc = documents[currentIndex];

    const getIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <FileText className="h-4 w-4" />;
            case 'image': return <FileImage className="h-4 w-4" />;
            default: return <FileCode className="h-4 w-4" />;
        }
    };

    return (
        <div className={cn(
            "transition-all duration-300",
            isExpanded ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-md p-4 flex items-center justify-center" : "h-full w-full"
        )}>
            <Card className={cn(
                "h-full w-full bg-white border-2 border-border shadow-xl overflow-hidden flex flex-col",
                isExpanded ? 'max-w-6xl max-h-[90vh]' : ''
            )}>
                {/* Header / Toolbar */}
                <CardHeader className="py-1.5 px-3 bg-muted/30 border-b flex flex-row items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <CardTitle className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                            {title} {documents.length > 0 && `(${currentIndex + 1}/${documents.length})`}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="icon" className="h-6 w-6 bg-background shadow-sm" onClick={toggleFullscreen} title="Vollbild">
                            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                        </Button>
                    </div>
                </CardHeader>

                {/* Main Content Area */}
                <CardContent className="flex-1 p-0 flex relative overflow-hidden bg-muted/10">
                    {documents.length > 0 ? (
                        <>
                            {/* Navigation Arrows */}
                            {documents.length > 1 && (
                                <>
                                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/50 backdrop-blur-sm border border-border" onClick={prevDoc}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white/50 backdrop-blur-sm border border-border" onClick={nextDoc}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </>
                            )}

                            {/* Preview Area */}
                            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-500">
                                {currentDoc.type === 'image' ? (
                                    <div className="relative group max-h-[180px]">
                                        <img src={currentDoc.url} alt={currentDoc.name} className="max-h-[160px] object-contain rounded-lg shadow-sm border border-border" />
                                    </div>
                                ) : (
                                    <div className="w-24 h-32 bg-white rounded-lg shadow-md border border-border flex flex-col items-center justify-center gap-2 relative">
                                        <div className="p-2 bg-primary/10 rounded-full scale-75">
                                            {getIcon(currentDoc.type)}
                                        </div>
                                        <div className="px-2">
                                            <p className="text-[10px] font-bold text-foreground line-clamp-1">{currentDoc.name}</p>
                                        </div>

                                        {/* Ribbon for PDF */}
                                        {currentDoc.type === 'pdf' && (
                                            <div className="absolute top-0 right-0 w-10 h-10 overflow-hidden">
                                                <div className="absolute top-1 -right-4 w-12 py-0.5 bg-red-500 text-white text-[6px] font-black uppercase tracking-widest rotate-45 text-center shadow-sm">
                                                    PDF
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-2">
                                    <h4 className="text-[10px] font-black text-foreground truncate max-w-[150px]">{currentDoc.name}</h4>
                                </div>

                                <div className="mt-2 flex gap-2 scale-90">
                                    <Button size="sm" variant="secondary" className="font-bold text-[9px] h-7 px-3 bg-background border border-border shadow-sm flex items-center gap-1.5">
                                        <Eye className="h-3 w-3" />
                                        View
                                    </Button>
                                    <Button size="sm" variant="secondary" className="font-bold text-[9px] h-7 px-3 bg-background border border-border shadow-sm flex items-center gap-1.5">
                                        <Download className="h-3 w-3" />
                                        Load
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none">
                            <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-border/50">
                                <FileUp className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Keine Dokumente</h3>
                            <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">Hier erscheinen Pläne, Fotos und Lieferscheine, die dieser Position zugeordnet wurden.</p>
                        </div>
                    )}

                    {/* Left Sidebar / Thumbnail List */}
                    {documents.length > 0 && !isExpanded && (
                        <div className="w-20 bg-muted/20 border-l border-border flex flex-col gap-1.5 p-1.5 overflow-y-auto shrink-0">
                            {documents.map((doc, idx) => (
                                <button
                                    key={doc.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={cn(
                                        "w-full aspect-square rounded-md border transition-all flex flex-col items-center justify-center p-1 gap-1 overflow-hidden",
                                        currentIndex === idx ? "border-primary bg-white shadow-sm scale-105" : "border-transparent bg-muted/40 hover:bg-muted/60 opacity-60"
                                    )}
                                >
                                    <div className="scale-75">{getIcon(doc.type)}</div>
                                    <span className="text-[7px] font-black uppercase tracking-tighter truncate w-full">{doc.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* Footer */}
                <div className="py-1 px-3 bg-muted/30 border-t flex justify-between items-center shrink-0">
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{documents.length} DATEI(EN)</span>
                    <div className="flex gap-2">
                        {/* Placeholder for actions */}
                    </div>
                </div>
            </Card>
        </div>
    );
}
