'use client';
import { showAlert } from '@/lib/alert';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lagerort } from '@/types';
import { LagerortService } from '@/lib/services/lagerortService';
import QrCodeGenerator from '@/components/shared/QrCodeGenerator';
import { Plus, QrCode, MapPin, Package, Pencil, Trash2, X, ScanLine, Construction, Warehouse, Globe, Factory, Truck, Map, ExternalLink, Download, Printer, Share2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ModuleActionBanner } from '@/components/layout/ModuleActionBanner';
import { cn } from '@/lib/utils';
import { ProjectService } from '@/lib/services/projectService';
import { useProjekt } from '@/lib/context/ProjektContext';

const BEREICHE = [
    { name: 'Werkhof', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { name: 'Baustelle', icon: Construction, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { name: 'Extern', icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { name: 'Lager', icon: Warehouse, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    { name: 'Produktion', icon: Factory, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
];

export default function LagerorteSeite() {
    const { projektId } = useParams<{ projektId: string }>();
    const { activeProjekt } = useProjekt();
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedQr, setSelectedQr] = useState<Lagerort | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({ bezeichnung: '', beschreibung: '', bereich: '', planUrl: '' });

    useEffect(() => { loadLagerorte(); }, [projektId]);

    async function loadLagerorte() {
        setLoading(true);
        try {
            const data = await LagerortService.getLagerorte(projektId);
            setLagerorte(data);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            let finalPlanUrl = form.planUrl;

            if (selectedFile) {
                setUploading(true);
                try {
                    finalPlanUrl = await ProjectService.uploadImage(
                        selectedFile,
                        projektId,
                        'lagerort',
                        form.bezeichnung
                    );
                } catch (err) {
                    console.error('File upload failed:', err);
                    showAlert('Fehler beim Hochladen der Datei.');
                    return;
                } finally {
                    setUploading(false);
                }
            }

            if (editingId) {
                await LagerortService.updateLagerort(editingId, { ...form, planUrl: finalPlanUrl, projektId });
            } else {
                await LagerortService.createLagerort({ ...form, planUrl: finalPlanUrl, projektId });
            }
            setForm({ bezeichnung: '', beschreibung: '', bereich: '', planUrl: '' });
            setSelectedFile(null);
            setShowForm(false);
            setEditingId(null);
            await loadLagerorte();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Lagerort wirklich löschen?')) return;
        await LagerortService.deleteLagerort(id);
        await loadLagerorte();
    }

    function startEdit(l: Lagerort) {
        setEditingId(l.id);
        setForm({
            bezeichnung: l.bezeichnung,
            beschreibung: l.beschreibung || '',
            bereich: l.bereich || '',
            planUrl: l.planUrl || ''
        });
        setSelectedFile(null);
        setShowForm(true);
        setSelectedQr(null);
    }

    function openCreate() {
        setEditingId(null);
        setForm({ bezeichnung: '', beschreibung: '', bereich: '', planUrl: '' });
        setSelectedFile(null);
        setShowForm(true);
        setSelectedQr(null);
    }

    const getBereichInfo = (name?: string) => {
        return BEREICHE.find(b => b.name === name) || { icon: MapPin, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <ModuleActionBanner
                icon={MapPin}
                title="Lagerorte"
                ctaLabel="Neu"
                ctaOnClick={openCreate}
            />


            {/* Form Modal */}
            {showForm && (
                <Card className="border-2 border-primary/30 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="border-b bg-muted/30 py-4 px-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">
                            {editingId ? 'Lagerort bearbeiten' : 'Neuer Lagerort'}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="h-8 w-8 rounded-full">
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Input
                                label="Bezeichnung *"
                                value={form.bezeichnung}
                                onChange={e => setForm(s => ({ ...s, bezeichnung: e.target.value }))}
                                placeholder="z.B. Lager A — Regal 3"
                                required
                                className="font-medium"
                            />
                            <Select
                                label="Bereich"
                                value={form.bereich}
                                onChange={e => setForm(s => ({ ...s, bereich: e.target.value }))}
                                options={[
                                    { label: '— Bereich auswählen —', value: '' },
                                    ...BEREICHE.map(b => ({ label: b.name, value: b.name }))
                                ]}
                            />
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1 font-mono uppercase tracking-wider text-[10px]">Plan Hochladen</label>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.ifc,.zip,.docx,.xlsx"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="file:bg-orange-50 file:text-orange-700 file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4 file:font-semibold file:text-xs cursor-pointer bg-white"
                                    />
                                    {form.planUrl && !selectedFile && (
                                        <a href={form.planUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline shrink-0 font-semibold truncate max-w-[200px]" title={form.planUrl}>
                                            Aktueller Plan
                                        </a>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-1">
                                    Die Datei wird in Google Drive (Ordner "lagerorts") gespeichert und unter dem Lagerort-Namen abgelegt.
                                </p>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-sm font-semibold text-foreground ml-1 font-mono uppercase tracking-wider text-[10px]">Beschreibung</label>
                                <textarea
                                    value={form.beschreibung}
                                    onChange={e => setForm(s => ({ ...s, beschreibung: e.target.value }))}
                                    className="flex min-h-[80px] w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all font-medium"
                                    placeholder="Optionale Beschreibung..."
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t mt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="font-bold">Abbrechen</Button>
                                <Button type="submit" disabled={saving || uploading} className="font-black px-8 rounded-xl shadow-lg shadow-primary/20">
                                    {uploading ? 'Lädt hoch...' : saving ? 'Speichert...' : editingId ? 'AKTUALISIEREN' : 'ERSTELLEN'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* QR Overlay Modal */}
            {selectedQr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <Card className="border-4 border-orange-500 shadow-2xl w-full max-w-sm rounded-[3rem] overflow-hidden bg-white animate-in slide-in-from-bottom-8 duration-300">
                        <CardHeader className="border-b-2 border-orange-100 bg-orange-50/50 py-5 px-8 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500 rounded-xl shadow-lg ring-4 ring-orange-500/20">
                                    <QrCode className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-800">
                                    {selectedQr.bezeichnung}
                                </CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedQr(null)} className="h-9 w-9 rounded-full hover:bg-orange-100/50 text-slate-400 hover:text-orange-600 transition-colors">
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-10 flex flex-col items-center gap-8">
                            {/* QR Section */}
                            <div className="relative group flex flex-col items-center gap-4">
                                <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl border-2 border-orange-100 ring-8 ring-orange-500/5 group-hover:ring-orange-500/10 transition-all">
                                    <QrCodeGenerator
                                        content={selectedQr.qrCode || `LAGERORT:${selectedQr.id}`}
                                        label={selectedQr.bezeichnung}
                                        size={220}
                                        className="rounded-none"
                                    />
                                </div>
                            </div>

                            {/* Label Section */}
                            <div className="text-center">
                                {activeProjekt?.projektnummer && activeProjekt?.projektname && (
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1 italic">
                                        {activeProjekt.projektnummer} {activeProjekt.projektname}
                                    </p>
                                )}
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">
                                    {selectedQr.bezeichnung}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                    LAGERORT QR-CODE
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-3 gap-3 w-full border-t-2 border-orange-50 pt-8">
                                <Button
                                    variant="outline"
                                    className="flex flex-col h-20 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group/btn"
                                    onClick={() => {
                                        const svg = document.querySelector('.qr-svg-wrapper svg') as SVGSVGElement;
                                        if (svg) {
                                            const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

                                            // Expand height and viewBox to fit the logo and text
                                            const originalWidth = parseInt(clonedSvg.getAttribute('width') || '220');
                                            const originalHeight = parseInt(clonedSvg.getAttribute('height') || '220');
                                            const originalViewBox = clonedSvg.getAttribute('viewBox') || '0 0 45 45';
                                            const vbValues = originalViewBox.split(' ').map(Number);

                                            clonedSvg.setAttribute('width', '1000');
                                            clonedSvg.setAttribute('height', '1250');
                                            clonedSvg.setAttribute('viewBox', `${vbValues[0]} ${vbValues[1] - 16} ${vbValues[2]} ${vbValues[3] + 24}`);
                                            clonedSvg.setAttribute('style', 'background: white;');

                                            // Add Header
                                            const headerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                                            headerGroup.setAttribute('transform', `translate(${vbValues[2] / 2}, ${vbValues[1] - 6})`);
                                            headerGroup.innerHTML = `
                                                ${activeProjekt?.projektnummer && activeProjekt?.projektname ? `<text x="0" y="-4" font-family="Arial, sans-serif" font-weight="400" font-size="1.5px" text-anchor="middle" fill="#94a3b8">${activeProjekt.projektnummer} ${activeProjekt.projektname}</text>` : ''}
                                                <text x="0" y="-1" font-family="Arial, sans-serif" font-weight="900" font-size="5px" text-anchor="middle" fill="#0f172a">${selectedQr.bezeichnung}</text>
                                                <text x="0" y="2" font-family="Arial, sans-serif" font-weight="700" font-size="1.5px" text-anchor="middle" fill="#64748b" text-transform="uppercase">LAGERORT</text>
                                            `;
                                            clonedSvg.insertBefore(headerGroup, clonedSvg.firstChild);

                                            // Add Logo Group
                                            const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                                            logoGroup.setAttribute('transform', `translate(${vbValues[2] / 2}, ${vbValues[3] + 4})`);

                                            logoGroup.innerHTML = `
                                                <text x="0" y="2" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="3.5px" text-anchor="middle">
                                                    <tspan fill="#1e293b">METHA</tspan><tspan fill="#F26A21">Desk</tspan><tspan fill="#94a3b8" font-size="2px" font-weight="100" dy="-1">pro</tspan>
                                                </text>
                                            `;
                                            clonedSvg.appendChild(logoGroup);

                                            const svgData = new XMLSerializer().serializeToString(clonedSvg);
                                            const blob = new Blob([svgData], { type: 'image/svg+xml' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `QR_${selectedQr.bezeichnung.replace(/\s+/g, '_')}.svg`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }
                                    }}
                                >
                                    <Download className="h-5 w-5 mb-2 text-slate-400 group-hover/btn:text-orange-600 group-hover/btn:scale-110 transition-all" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/btn:text-orange-700">Herunt.</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="flex flex-col h-20 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group/btn"
                                    onClick={() => {
                                        const svg = document.querySelector('.qr-svg-wrapper svg');
                                        if (svg) {
                                            const printWin = window.open('', '', 'width=600,height=600');
                                            if (printWin) {
                                                printWin.document.write(`
                                                    <html>
                                                        <head>
                                                            <title>Print QR</title>
                                                            <style>
                                                                @page { size: auto; margin: 0mm; }
                                                                body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; background: #fff; }
                                                                .label-container { padding: 40px; border: 4px solid #f1f5f9; border-radius: 40px; text-align: center; width: 350px; }
                                                                .project-info { font-size: 11px; font-weight: 400; color: #94a3b8; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; }
                                                                .number { font-size: 42px; font-weight: 900; color: #0f172a; margin: 0 0 5px 0; letter-spacing: -1px; }
                                                                .name { font-size: 14px; font-weight: 700; color: #64748b; margin: 0 0 30px 0; text-transform: uppercase; letter-spacing: 2px; }
                                                                .qr-container { margin-bottom: 20px; }
                                                                .qr-container svg { width: 300px; height: 300px; }
                                                                .brand { margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 4px; border-top: 2px solid #f1f5f9; padding-top: 20px; }
                                                                .brand-metha { color: #1e293b; font-weight: 900; font-size: 28px; letter-spacing: -1.5px; }
                                                                .brand-desk { color: #F26A21; font-weight: 900; font-size: 28px; letter-spacing: -1.5px; }
                                                                .brand-pro { color: #94a3b8; font-weight: 300; font-size: 12px; margin-bottom: 12px; }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            <div class="label-container">
                                                                ${activeProjekt?.projektnummer && activeProjekt?.projektname ? `<div class="project-info">${activeProjekt.projektnummer} ${activeProjekt.projektname}</div>` : ''}
                                                                <div class="number">${selectedQr.bezeichnung}</div>
                                                                <div class="name">LAGERORT QR-CODE</div>
                                                                <div class="qr-container">${svg.outerHTML}</div>
                                                                <div class="brand">
                                                                    <span class="brand-metha">METHA</span><span class="brand-desk">Desk</span><span class="brand-pro">pro</span>
                                                                </div>
                                                            </div>
                                                            <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
                                                        </body>
                                                    </html>
                                                `);
                                                printWin.document.close();
                                            }
                                        }
                                    }}
                                >
                                    <Printer className="h-5 w-5 mb-2 text-slate-400 group-hover/btn:text-orange-600 group-hover/btn:scale-110 transition-all" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/btn:text-orange-700">Drucken</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="flex flex-col h-20 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group/btn"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `Lagerort: ${selectedQr.bezeichnung}`,
                                                text: `QR Code für Lagerort ${selectedQr.bezeichnung}`,
                                                url: window.location.href
                                            }).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                            showAlert('Link kopiert!');
                                        }
                                    }}
                                >
                                    <Share2 className="h-5 w-5 mb-2 text-slate-400 group-hover/btn:text-orange-600 group-hover/btn:scale-110 transition-all" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover/btn:text-orange-700">Teilen</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Lagerorte Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={`lagerorte-skeleton-${i}`} className="h-48 bg-muted rounded-[2rem] animate-pulse" />
                    ))}
                </div>
            ) : lagerorte.length === 0 ? (
                <Card className="border-2 border-dashed border-border rounded-[3rem]">
                    <CardContent className="py-24 flex flex-col items-center justify-center gap-6 text-center">
                        <div className="p-6 rounded-[2rem] bg-muted ring-8 ring-muted/30">
                            <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Keine Lagerorte vorhanden</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Verwalten Sie Ihre Materialien effizienter durch das Erstellen von markierten Lagerorten.</p>
                        </div>
                        <Button onClick={openCreate} className="font-black gap-2 px-8 h-12 rounded-2xl shadow-xl shadow-primary/20">
                            <Plus className="h-5 w-5" /> ERSTEN LAGERORT ERSTELLEN
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lagerorte.map(l => {
                        const info = getBereichInfo(l.bereich);
                        return (
                            <Card key={l.id} className="border-2 border-border hover:border-primary/40 transition-all group shadow-sm hover:shadow-xl rounded-[2rem] overflow-hidden flex flex-col bg-white">
                                <CardHeader className="py-5 px-6 border-b border-border/50 bg-muted/5 flex-none">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={cn("p-2 rounded-xl border shrink-0", info.bg, info.border)}>
                                                    <info.icon className={cn("h-5 w-5", info.color)} />
                                                </div>
                                                <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border', info.bg, info.border, info.color)}>
                                                    {l.bereich || 'Diversas'}
                                                </span>
                                            </div>
                                            <CardTitle className="text-lg font-black text-slate-800 leading-tight">
                                                {l.bezeichnung}
                                            </CardTitle>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-9 w-9 p-0 rounded-xl font-bold shrink-0 shadow-sm border border-border"
                                            onClick={() => setSelectedQr(selectedQr?.id === l.id ? null : l)}
                                            title="QR Code anzeigen"
                                        >
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 py-5 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        {l.beschreibung ? (
                                            <p className="text-xs text-muted-foreground line-clamp-3 mb-4 font-medium leading-relaxed italic">
                                                "{l.beschreibung}"
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground/40 italic mb-4">Keine Beschreibung vorhanden...</p>
                                        )}


                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {l.planUrl && (
                                            <a
                                                href={l.planUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-10 border-2 border-orange-500 bg-orange-50/50 hover:bg-orange-100/70 text-orange-700 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm group/plan cursor-pointer"
                                            >
                                                <Map className="h-3.5 w-3.5 group-hover/plan:scale-110 transition-transform" />
                                                Plan ansehen
                                                <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                                            </a>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-slate-800 hover:bg-slate-100 flex-1 rounded-xl"
                                                onClick={() => startEdit(l)}
                                            >
                                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                onClick={() => handleDelete(l.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
