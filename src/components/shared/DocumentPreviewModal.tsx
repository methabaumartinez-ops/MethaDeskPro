'use client';

import React from 'react';
import { X, Download, Maximize2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

export function DocumentPreviewModal({ isOpen, onClose, url, title }: DocumentPreviewModalProps) {
    if (!isOpen) return null;

    // Enhanced detection: check extension and common URL patterns (like Google Drive)
    const normalizedUrl = url.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(normalizedUrl) || normalizedUrl.includes('image');
    const isPDF = /\.pdf($|\?)/i.test(normalizedUrl) || normalizedUrl.includes('drive.google.com') || normalizedUrl.includes('docs.google.com');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
            <div
                className="absolute inset-0 bg-slate-900/80 animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-slate-950 border-2 border-border/50 rounded-[2.5rem] shadow-2xl w-full h-full flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 ring-8 ring-white/5">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500 rounded-2xl shadow-lg ring-4 ring-orange-500/20">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">{title}</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mt-1">VORSCHAU / PREVIEW</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a href={url} download target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-10 px-5 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-white dark:bg-slate-900 border-2 active:scale-95 transition-all">
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </a>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-red-50 hover:text-red-600 transition-all border-2 border-transparent"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 md:p-8 relative overflow-hidden flex items-center justify-center">
                    {isPDF ? (
                        <iframe
                            src={url.includes('drive.google.com') ? url.replace(/\/view\?usp=sharing|\/view/g, '/preview') : `${url}#view=FitH`}
                            className="w-full h-full rounded-2xl border-2 border-border/50 bg-white shadow-inner"
                            title={title}
                            allow="autoplay"
                        />
                    ) : isImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={url}
                                alt={title}
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-2 border-white/50 ring-1 ring-slate-200/20"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-950 rounded-3xl border-2 border-border shadow-2xl max-w-sm">
                            <div className="h-20 w-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6 shadow-orange-500/10 shadow-xl border-2 border-orange-500/10">
                                <FileText className="h-10 w-10 text-orange-500" />
                            </div>
                            <h4 className="text-lg font-black text-foreground mb-2">Keine Vorschau verfügbar</h4>
                            <p className="text-sm text-muted-foreground font-medium mb-8">Dieser Dateityp kann nicht direkt im Browser angezeigt werden.</p>
                             <a href={url} target="_blank" rel="noopener noreferrer">
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 h-12 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                    Datei extern öffnen
                                </Button>
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-8 py-3 bg-muted/30 border-t border-border/50 flex justify-between items-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] shrink-0">
                    <div>METHA Desk PRO / PREVIEW ENGINE</div>
                    <div className="flex items-center gap-4">
                        <span className="opacity-40">System: {isPDF ? 'PDF RENDERING' : isImage ? 'IMAGE VIEWER' : 'FILE STREAM'}</span>
                        <div className="w-1 h-3 bg-primary/20 rounded-full" />
                        <span>Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
