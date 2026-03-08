'use client';

import { useState, useEffect } from 'react';
import { TsDokument, DokumentTyp } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, FileText, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/shared/DocumentPreviewModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/lib/toast';

interface DokumentePanelProps {
    entityId: string;
    entityType: 'teilsystem' | 'position' | 'unterposition';
    projektId: string;
    readonly?: boolean;
}

const DOKUMENT_TYPEN: { value: DokumentTyp; label: string; icon: string; color: string }[] = [
    { value: 'PDF', label: 'PDF', icon: '📄', color: 'bg-red-100 text-red-700' },
    { value: 'DXF', label: 'DXF/DWG', icon: '📏', color: 'bg-blue-100 text-blue-700' },
    { value: 'Zeichnung', label: 'Zeichnung/Plan', icon: '📐', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'Schnittliste', label: 'Schnittliste', icon: '✂️', color: 'bg-orange-50 text-orange-600' },
    { value: 'Auszug', label: 'Auszug', icon: '📋', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'IFC', label: 'IFC', icon: '🏗️', color: 'bg-green-100 text-green-700' },
    { value: 'Lieferschein', label: 'Lieferschein', icon: '📦', color: 'bg-purple-100 text-purple-700' },
    { value: 'Rechnung', label: 'Rechnung', icon: '🧾', color: 'bg-teal-100 text-teal-700' },
    { value: 'Andere', label: 'Sonstiges', icon: '📎', color: 'bg-muted text-muted-foreground' },
];

export default function DokumentePanel({ entityId, entityType, projektId, readonly }: DokumentePanelProps) {
    const [dokumente, setDokumente] = useState<TsDokument[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', typ: 'PDF' as DokumentTyp, url: '', sendeDatum: '', bemerkung: '',
    });
    const [previewDoc, setPreviewDoc] = useState<{ url: string, title: string } | null>(null);

    // Delete confirmation state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => { loadDokumente(); }, [entityId]);

    async function loadDokumente() {
        setLoading(true);
        try {
            const res = await fetch(`/api/dokumente?entityId=${entityId}&entityType=${entityType}`);
            if (res.ok) setDokumente(await res.json());
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name) return;
        setSaving(true);
        try {
            const res = await fetch('/api/dokumente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, entityId, entityType, projektId }),
            });
            if (res.ok) {
                setForm({ name: '', typ: 'PDF', url: '', sendeDatum: '', bemerkung: '' });
                setShowForm(false);
                await loadDokumente();
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteClick(id: string) {
        setItemToDelete(id);
        setConfirmOpen(true);
    }

    async function handleConfirmDelete() {
        if (!itemToDelete) return;
        try {
            await fetch(`/api/dokumente/${itemToDelete}`, { method: 'DELETE' });
            toast.success('Dokument gelöscht');
            await loadDokumente();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Fehler beim Löschen');
        } finally {
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    }

    return (
        <div className="p-5 space-y-4">
            {/* Form Toggle */}
            {!readonly && (
                <div className="flex justify-end">
                    <Button
                        size="sm"
                        variant={showForm ? 'ghost' : 'outline'}
                        onClick={() => setShowForm(!showForm)}
                        className="font-bold gap-2 h-8"
                    >
                        {showForm ? <><ChevronUp className="h-3.5 w-3.5" /> Abbrechen</> : <><Plus className="h-3.5 w-3.5" /> Hinzufügen</>}
                    </Button>
                </div>
            )}

            {/* Inline Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-muted border border-border rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Bezeichnung *"
                            value={form.name}
                            onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                            placeholder="z.B. Schaltplan A1"
                            required
                        />
                        <Select
                            label="Typ"
                            value={form.typ}
                            onChange={e => setForm(s => ({ ...s, typ: e.target.value as DokumentTyp }))}
                            options={DOKUMENT_TYPEN.map(t => ({ label: `${t.icon} ${t.label}`, value: t.value }))}
                        />
                    </div>
                    <Input
                        label="URL / Pfad"
                        value={form.url}
                        onChange={e => setForm(s => ({ ...s, url: e.target.value }))}
                        placeholder="https:// oder \\server\pfad"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Datum"
                            type="date"
                            value={form.sendeDatum}
                            onChange={e => setForm(s => ({ ...s, sendeDatum: e.target.value }))}
                        />
                        <Input
                            label="Bemerkung"
                            value={form.bemerkung}
                            onChange={e => setForm(s => ({ ...s, bemerkung: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Abbrechen</Button>
                        <Button type="submit" size="sm" disabled={saving} className="font-bold">
                            {saving ? 'Speichert...' : 'Speichern'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Document List */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={`${entityId}-skeleton-${i}`} className="h-12 bg-muted rounded-lg animate-pulse" />)}
                </div>
            ) : dokumente.length === 0 ? (
                <div className="py-8 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Keine Dokumente vorhanden</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {dokumente.map(d => {
                        const ti = DOKUMENT_TYPEN.find(t => t.value === d.typ) || DOKUMENT_TYPEN[8];
                        return (
                            <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors group">
                                <span className="text-lg shrink-0">{ti.icon}</span>
                                <div className="flex-1 min-w-0">
                                    {d.url ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc({ url: d.url, title: d.name })}
                                            className="flex items-center gap-1 font-bold text-sm text-foreground hover:text-primary transition-colors truncate text-left"
                                        >
                                            {d.name}
                                            <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                                        </button>
                                    ) : (
                                        <span className="font-bold text-sm text-foreground">{d.name}</span>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', ti.color)}>{ti.label}</span>
                                        {d.sendeDatum && <span className="text-[11px] text-muted-foreground">{d.sendeDatum}</span>}
                                        {d.bemerkung && <span className="text-[11px] text-muted-foreground truncate">{d.bemerkung}</span>}
                                    </div>
                                </div>
                                {!readonly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                        onClick={() => handleDeleteClick(d.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <DocumentPreviewModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                url={previewDoc?.url || ''}
                title={previewDoc?.title || ''}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Dokument löschen?"
                description="Möchten Sie dieses Dokument wirklich unwiderruflich löschen?"
                confirmLabel="Löschen"
                cancelLabel="Abbrechen"
                variant="danger"
            />
        </div>
    );
}
