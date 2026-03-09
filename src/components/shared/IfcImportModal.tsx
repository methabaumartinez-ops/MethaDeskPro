'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Package, Layers, FileText, ListTodo, Loader2, FileStack, ChevronRight } from 'lucide-react';
import { PositionService } from '@/lib/services/positionService';
import { SubPositionService } from '@/lib/services/subPositionService';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type ExtractedPosition = {
    tempId: string;
    posNr: string;
    name: string;
    beschreibung: string;
    menge: number;
    einheit: string;
    expressID: number;
    ifcType: string;
    weight?: number;
    length?: string;
    width?: string;
    height?: string;
    rawPsets?: any;
    ok?: string | number | null;
    uk?: string | number | null;
};

type ExtractedUnterposition = {
    tempId: string;
    parentExpressID: number;
    posNummer: string;
    name: string;
    beschreibung: string;
    menge: number;
    einheit: string;
    material: string;
    gewicht: number;
    dimensions?: any;
    rawPsets?: any;
    ok?: string | number | null;
    uk?: string | number | null;
    area?: string | number | null;
    color?: string | number | null;
    remark?: string | number | null;
};

type ExtractedMaterial = {
    tempId: string;
    name: string;
    hersteller: string;
    menge: number;
    einheit: string;
};

export type IfcExtractResult = {
    tsInfo?: {
        nummer?: string;
        name?: string;
        building?: string;
        section?: string;
        floor?: string;
    };
    positionen: any[];
    unterpositionen: any[];
    materiale: any[];
    warnings?: string[];
    debugLogs?: string[];
    summary: { totalPositionen: number; totalUnterpositionen: number; totalMateriale: number };
};

type Props = {
    data: IfcExtractResult;
    teilsystemId: string;
    projektId: string;
    onClose: () => void;
    onImported: () => void;
};

type Tab = 'positionen' | 'unterpositionen' | 'material';

// ── Helper: editable cell ────────────────────────────────────────────────────
function EditCell({ value, onChange, type = 'text' }: { value: string | number; onChange: (v: string) => void; type?: string }) {
    return (
        <input
            type={type}
            className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-xs font-semibold py-0.5 px-1 text-slate-900"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function IfcImportModal({ data, teilsystemId, projektId, onClose, onImported }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('positionen');
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);
    const [showRawJson, setShowRawJson] = useState<any>(null);

    // Local mutable copies
    const [positions, setPositions] = useState((data.positionen || []).map(p => ({ ...p, selected: true })));
    const [unterpos, setUnterpos] = useState((data.unterpositionen || []).map(u => ({ ...u, selected: true })));
    const [materials, setMaterials] = useState((data.materiale || []).map(m => ({ ...m, selected: true })));

    const selectedPos = positions.filter(p => p.selected);
    const selectedUPos = unterpos.filter(u => u.selected);
    const selectedMat = materials.filter(m => m.selected);

    // ── Import logic ──────────────────────────────────────────────────────────
    const handleImport = async () => {
        setImporting(true);
        const log: string[] = [];

        try {
            // Anti-confusion rule: Group check
            for (const p of selectedPos) {
                const overlaps = selectedUPos.find(u => u.posNummer === p.posNummer);
                if (overlaps) {
                    log.push(`⚠️ WARNUNG: Position ${p.posNummer} hat die gleiche ID wie ein Teil.`);
                }
            }

            // Map expressID → real DB positionId
            const expressIdToPositionId = new Map<number, string>();

            // 1. Create Positionen
            for (let i = 0; i < selectedPos.length; i++) {
                const p = selectedPos[i];
                try {
                    const created = await PositionService.createPosition({
                        teilsystemId,
                        projektId,
                        posNummer: p.posNr || String(i + 1).padStart(3, '0'),
                        name: p.name,
                        beschreibung: p.beschreibung,
                        menge: Number(p.menge),
                        einheit: p.einheit || 'Stk',
                        status: 'offen',
                        weight: Number(p.weight || 0),
                        ifcMeta: {
                            psets: p.rawPsets,
                            dimensions: { length: p.length, width: p.width, height: p.height },
                            ok: p.ok,
                            uk: p.uk
                        },
                        groupingMethod: p.ifcType === 'Fallback' ? 'FALLBACK_GROUP' : 'REAL_PARENT',
                    } as any);
                    expressIdToPositionId.set(p.expressID, created.id);
                    log.push(`✅ Position: ${p.posNr || ''} ${p.name}`);
                } catch (e: any) {
                    log.push(`❌ Position: ${p.name} — ${e.message}`);
                }
            }

            // 2. Create Unterpositionen (link to parent)
            for (const u of selectedUPos) {
                const parentPositionId = expressIdToPositionId.get(u.parentExpressID);
                if (!parentPositionId && u.parentExpressID !== 0) {
                    log.push(`⚠️ Unterposition: ${u.name} — parent nicht importiert, übersprungen`);
                    continue;
                }

                const targetPosId = parentPositionId || expressIdToPositionId.get(0);

                try {
                    await SubPositionService.createUnterposition({
                        positionId: targetPosId,
                        teilsystemId,
                        projektId,
                        posNummer: u.posNummer || '001',
                        name: u.name,
                        beschreibung: u.beschreibung,
                        menge: Number(u.menge),
                        einheit: u.einheit || 'Stk',
                        material: u.material,
                        gewicht: u.gewicht,
                        ifcMeta: {
                            psets: u.rawPsets,
                            dimensions: u.dimensions,
                            ok: u.ok,
                            uk: u.uk,
                            area: u.area,
                            color: u.color,
                            remark: u.remark
                        },
                        status: 'offen',
                    } as any);
                    log.push(`✅ Unterposition: ${u.posNummer || ''} ${u.name}`);
                } catch (e: any) {
                    log.push(`❌ Unterposition: ${u.name} — ${e.message}`);
                }
            }

            // 3. Create Material (via data API)
            for (const mat of selectedMat) {
                try {
                    const res = await fetch('/api/data/material', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            teilsystemId,
                            projektId,
                            name: mat.name,
                            hersteller: mat.hersteller || '—',
                            menge: Number(mat.menge),
                            einheit: mat.einheit,
                            status: 'offen',
                        }),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    log.push(`✅ Material: ${mat.name}`);
                } catch (e: any) {
                    log.push(`❌ Material: ${mat.name} — ${e.message}`);
                }
            }

            setImportLog(log);
            setDone(true);
        } catch (e: any) {
            setImportLog([`❌ Kritischer Fehler: ${e.message}`]);
            setDone(true);
        } finally {
            setImporting(false);
        }
    };

    // ── Done Screen ───────────────────────────────────────────────────────────
    if (done) {
        const errors = importLog.filter(l => l.startsWith('❌'));
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-card rounded-2xl shadow-2xl border-2 border-border w-full max-w-lg p-8 flex flex-col items-center gap-4">
                    <div className={`text-5xl ${errors.length === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                        {errors.length === 0 ? '✅' : '⚠️'}
                    </div>
                    <h2 className="text-xl font-black text-foreground">Import abgeschlossen</h2>
                    <div className="w-full bg-muted/50 rounded-xl p-4 max-h-64 overflow-y-auto space-y-1">
                        {importLog.map((l, i) => (
                            <p key={i} className="text-xs font-mono">{l}</p>
                        ))}
                    </div>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full px-8"
                        onClick={() => { onImported(); onClose(); }}
                    >
                        Fertig
                    </Button>
                </div>
            </div>
        );
    }

    // ── Main Modal ────────────────────────────────────────────────────────────
    const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number; selected: number }[] = [
        { id: 'positionen', label: 'Positionen', icon: <Layers className="h-4 w-4" />, count: positions.length, selected: selectedPos.length },
        { id: 'unterpositionen', label: 'Unterpos.', icon: <FileStack className="h-4 w-4" />, count: unterpos.length, selected: selectedUPos.length },
        { id: 'material', label: 'Material', icon: <Package className="h-4 w-4" />, count: materials.length, selected: selectedMat.length },
    ];

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative bg-white dark:bg-card w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl border-2 border-primary/20 flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between px-10 py-6 border-b border-border bg-muted/30">
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1 block">IFC ANALYSE</span>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Extrahierte Daten importieren</h2>
                        {data.tsInfo && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {data.tsInfo.nummer && <Badge variant="info" className="text-[10px] font-black rounded-full px-3">SYSTEM: {data.tsInfo.nummer}</Badge>}
                                {data.tsInfo.building && <Badge variant="outline" className="text-[10px] font-black border-primary/30 text-primary rounded-full px-3">GEBÄUDE: {data.tsInfo.building}</Badge>}
                                {data.tsInfo.floor && <Badge variant="outline" className="text-[10px] font-black rounded-full px-3">GESCHOSS: {data.tsInfo.floor}</Badge>}
                                {data.tsInfo.section && <Badge variant="outline" className="text-[10px] font-black rounded-full px-3">ABSCHNITT: {data.tsInfo.section}</Badge>}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Summary pills */}
                <div className="flex gap-4 px-10 py-4 border-b border-border bg-background/50">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={cn(
                                "flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs font-black transition-all",
                                activeTab === t.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                            )}
                        >
                            {t.icon}
                            <span className="uppercase tracking-widest">{t.label}</span>
                            <span className={cn(
                                "ml-1 px-2 py-0.5 rounded-lg text-[10px] font-black",
                                activeTab === t.id ? 'bg-white/20 text-white' : 'bg-background text-foreground'
                            )}>
                                {t.selected}/{t.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Table content */}
                <div className="flex-1 overflow-auto px-6">
                    <div className="rounded-3xl border-2 border-border/50 overflow-hidden my-4 bg-background shadow-inner">
                        {/* ── Positionen ── */}
                        {activeTab === 'positionen' && (
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-md z-10">
                                    <TableRow className="border-b-2 border-border/50">
                                        <TableHead className="w-12 text-center">
                                            <input type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={positions.every(p => p.selected)}
                                                onChange={e => setPositions(prev => prev.map(p => ({ ...p, selected: e.target.checked })))}
                                            />
                                        </TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-16">#</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-60">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Beschreibung</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-32 text-right">Gewicht</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-12 text-center">Info</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-20 bg-muted/5">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <Layers className="h-12 w-12" />
                                                    <p className="text-sm font-black uppercase tracking-widest">Keine Positionen gefunden</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : positions.map((p, i) => (
                                        <TableRow key={p.tempId} className={cn(
                                            "border-b border-border/40 transition-colors",
                                            p.selected ? "bg-primary/[0.02] hover:bg-primary/[0.04]" : "opacity-40 grayscale-[0.5] hover:opacity-60"
                                        )}>
                                            <TableCell className="text-center">
                                                <input type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={p.selected}
                                                    onChange={e => setPositions(prev => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                                                />
                                            </TableCell>
                                            <TableCell className="font-black text-xs text-slate-500">
                                                {p.posNr}
                                            </TableCell>
                                            <TableCell className="font-bold text-sm">
                                                <EditCell value={p.name}
                                                    onChange={v => setPositions(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))}
                                                />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <EditCell value={p.beschreibung}
                                                    onChange={v => setPositions(prev => prev.map((x, j) => j === i ? { ...x, beschreibung: v } : x))}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5 font-black text-sm">
                                                    <EditCell value={p.weight || 0} type="number"
                                                        onChange={v => setPositions(prev => prev.map((x, j) => j === i ? { ...x, weight: parseFloat(v) || 0 } : x))}
                                                    />
                                                    <span className="text-[10px] text-muted-foreground uppercase">kg</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setShowRawJson(p.rawPsets)}>
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* ── Unterpositionen ── */}
                        {activeTab === 'unterpositionen' && (
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-md z-10">
                                    <TableRow className="border-b-2 border-border/50">
                                        <TableHead className="w-12 text-center">
                                            <input type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={unterpos.every(u => u.selected)}
                                                onChange={e => setUnterpos(prev => prev.map(u => ({ ...u, selected: e.target.checked })))}
                                            />
                                        </TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-16">#</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-72">Bezeichnung</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-32 text-right">Gewicht</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-12 text-center">Info</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Parent Element</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unterpos.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-20 bg-muted/5">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <FileStack className="h-12 w-12" />
                                                <p className="text-sm font-black uppercase tracking-widest">Keine Teile gefunden</p>
                                            </div>
                                        </TableCell></TableRow>
                                    ) : unterpos.map((u, i) => {
                                        const parent = positions.find(p => p.expressID === u.parentExpressID);
                                        return (
                                            <TableRow key={u.tempId} className={cn(
                                                "border-b border-border/40 transition-colors",
                                                u.selected ? "bg-primary/[0.02] hover:bg-primary/[0.04]" : "opacity-40 grayscale-[0.5] hover:opacity-60"
                                            )}>
                                                <TableCell className="text-center">
                                                    <input type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        checked={u.selected}
                                                        onChange={e => setUnterpos(prev => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-black text-xs text-slate-500">
                                                    {u.posNummer}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <EditCell value={u.name}
                                                            onChange={v => setUnterpos(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))}
                                                        />
                                                        <span className="text-[9px] text-muted-foreground uppercase font-black px-1 tracking-tight">{u.beschreibung}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5 font-black text-sm">
                                                        <EditCell value={u.gewicht || 0} type="number"
                                                            onChange={v => setUnterpos(prev => prev.map((x, j) => j === i ? { ...x, gewicht: parseFloat(v) || 0 } : x))}
                                                        />
                                                        <span className="text-[10px] text-muted-foreground uppercase">kg</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setShowRawJson(u.rawPsets)}>
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                                        <span className="text-[10px] font-black text-muted-foreground/80 truncate block uppercase tracking-tight">
                                                            {parent?.name || (u.parentExpressID === 0 ? "AUTO-GROUP" : `#${u.parentExpressID}`)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        {/* ── Material ── */}
                        {activeTab === 'material' && (
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-md z-10">
                                    <TableRow className="border-b-2 border-border/50">
                                        <TableHead className="w-12 text-center">
                                            <input type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={materials.every(m => m.selected)}
                                                onChange={e => setMaterials(prev => prev.map(m => ({ ...m, selected: e.target.checked })))}
                                            />
                                        </TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Material</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">Hersteller</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-32">Menge</TableHead>
                                        <TableHead className="font-black text-[10px] text-muted-foreground uppercase tracking-widest w-24">Einheit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materials.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-20 bg-muted/5">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <Package className="h-12 w-12" />
                                                <p className="text-sm font-black uppercase tracking-widest">Keine Materialien gefunden</p>
                                            </div>
                                        </TableCell></TableRow>
                                    ) : materials.map((m, i) => (
                                        <TableRow key={m.tempId} className={cn(
                                            "border-b border-border/40 transition-colors",
                                            m.selected ? "bg-primary/[0.02] hover:bg-primary/[0.04]" : "opacity-40 grayscale-[0.5] hover:opacity-60"
                                        )}>
                                            <TableCell className="text-center">
                                                <input type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={m.selected}
                                                    onChange={e => setMaterials(prev => prev.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                                                />
                                            </TableCell>
                                            <TableCell className="font-bold text-sm">
                                                <EditCell value={m.name}
                                                    onChange={v => setMaterials(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x))}
                                                />
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-medium">
                                                <EditCell value={m.hersteller}
                                                    onChange={v => setMaterials(prev => prev.map((x, j) => j === i ? { ...x, hersteller: v } : x))}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-black text-sm">
                                                    <EditCell value={m.menge} type="number"
                                                        onChange={v => setMaterials(prev => prev.map((x, j) => j === i ? { ...x, menge: parseFloat(v) || 1 } : x))}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-[10px] font-black uppercase text-muted-foreground">
                                                    <EditCell value={m.einheit}
                                                        onChange={v => setMaterials(prev => prev.map((x, j) => j === i ? { ...x, einheit: v } : x))}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 border-t border-border bg-muted/30 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-semibold flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-7 rounded-lg px-2.5 font-black text-foreground bg-background border-2 border-border/50">
                                {selectedPos.length} POS.
                            </Badge>
                            <Badge variant="outline" className="h-7 rounded-lg px-2.5 font-black text-foreground bg-background border-2 border-border/50">
                                {selectedUPos.length} TEILE
                            </Badge>
                            <Badge variant="outline" className="h-7 rounded-lg px-2.5 font-black text-foreground bg-background border-2 border-border/50">
                                {selectedMat.length} MAT.
                            </Badge>
                        </div>
                        <div className="h-8 w-px bg-border/50 mx-2" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Gesamtgewicht</span>
                            <span className="text-lg font-black text-foreground tracking-tighter leading-none">
                                {selectedPos.reduce((sum, p) => sum + (Number(p.weight) || 0) * Number(p.menge), 0).toFixed(2)} <span className="text-sm">kg</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Abbrechen
                        </button>
                        <Button
                            onClick={handleImport}
                            disabled={importing || (selectedPos.length === 0 && selectedUPos.length === 0 && selectedMat.length === 0)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl h-12 px-10 flex items-center gap-3 shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            {importing ? (
                                <><Loader2 className="h-5 w-5 animate-spin" /> <span className="uppercase tracking-[0.2em] text-[10px]">Importiere...</span></>
                            ) : (
                                <><Check className="h-5 w-5" /> <span className="uppercase tracking-[0.2em] text-[10px]">Import Bestätigen</span></>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Raw JSON Viewer Overlay */}
                {showRawJson && (
                    <div className="absolute inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-12 animate-in fade-in duration-300" onClick={() => setShowRawJson(null)}>
                        <div className="bg-white dark:bg-card w-full max-w-2xl max-h-full rounded-[2.5rem] shadow-2xl border-2 border-border flex flex-col overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                            <div className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
                                <h3 className="font-black text-foreground uppercase tracking-widest text-sm">IFC Raw Psets (JSON)</h3>
                                <button onClick={() => setShowRawJson(null)} className="p-2 rounded-full hover:bg-muted">
                                    <X className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-8 bg-muted/20">
                                <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed">
                                    {JSON.stringify(showRawJson, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
