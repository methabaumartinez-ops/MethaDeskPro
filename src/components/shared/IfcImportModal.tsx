'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, Upload, Loader2, Check, AlertTriangle, FileArchive, Search } from 'lucide-react';
import { toast } from '@/lib/toast';

type Props = {
    projektId: string;
    onClose: () => void;
    onImported?: () => void;
    // Retrocompatibility props
    data?: any;
    teilsystemId?: string;
    previewMode?: boolean;
    onPreviewConfirm?: (result: any) => void;
};

// Exported for backward compatibility with erfassen/page.tsx
export type IfcExtractResult = any;
export type IfcPreviewResult = any;

type ParsedHierarchy = {
    teilsystem: any;
    positionen: any[];
    unterpositionen: any[];
};

export function IfcImportModal({ projektId, onClose, onImported }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'saving' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // State for Step 2: The parsed Hierarchy
    const [hierarchy, setHierarchy] = useState<ParsedHierarchy | null>(null);
    
    // Selection state for checkboxes. Stores signatures of explicitly *deselected* items.
    // We assume everything is selected by default initially.
    const [deselectedNodes, setDeselectedNodes] = useState<Set<string>>(new Set());

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setErrorMsg('');
        }
    };

    /**
     * STEP 1: Upload and Analyze (Parse JSON only)
     */
    const handleAnalyze = async () => {
        if (!file) return;
        setStatus('analyzing');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projektId', projektId);

            const res = await fetch('/api/ifc-analyze-hierarchy', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                let errorMessage = 'Verbindungsfehler oder Serverfehler (Kein JSON empfangen).';
                try {
                    const errorJson = JSON.parse(text);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    console.error('HTML Error Response:', text.substring(0, 500));
                }
                throw new Error(errorMessage);
            }

            const bodyResponse = await res.json();

            setHierarchy(bodyResponse.data);
            setStatus('idle');
            setStep(2); // Move to Step 2!
        } catch (e: any) {
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    /**
     * STEP 2: Review Checkboxes logic
     */
    const togglePosition = (posSignature: string, isCurrentlySelected: boolean) => {
        const newDeselected = new Set(deselectedNodes);
        
        if (isCurrentlySelected) {
            // Deselecting Parent: Add parent and all children
            newDeselected.add(posSignature);
            hierarchy?.unterpositionen.forEach(unt => {
                if (unt.signature.startsWith(posSignature + '|')) {
                    newDeselected.add(unt.signature);
                }
            });
        } else {
            // Selecting Parent: Remove parent and all children (reset them to true)
            newDeselected.delete(posSignature);
            hierarchy?.unterpositionen.forEach(unt => {
                if (unt.signature.startsWith(posSignature + '|')) {
                    newDeselected.delete(unt.signature);
                }
            });
        }
        
        setDeselectedNodes(newDeselected);
    };

    const toggleUnterposition = (untSignature: string, isCurrentlySelected: boolean) => {
        const newDeselected = new Set(deselectedNodes);
        if (isCurrentlySelected) {
            newDeselected.add(untSignature);
        } else {
            newDeselected.delete(untSignature);
        }
        setDeselectedNodes(newDeselected);
    };

    /**
     * STEP 3: Final Submission (Save to DB)
     */
    const handleFinalImport = async () => {
        if (!hierarchy) return;
        setStatus('saving');

        // Filter arrays based on selected true
        const filteredPositionen = hierarchy.positionen.filter(p => !deselectedNodes.has(p.signature));
        const filteredUnterpositionen = hierarchy.unterpositionen.filter(u => !deselectedNodes.has(u.signature));

        const payload = {
            teilsystem: hierarchy.teilsystem,
            positionen: filteredPositionen,
            unterpositionen: filteredUnterpositionen
        };

        try {
            const res = await fetch('/api/ifc-save-hierarchy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                let errorMessage = 'Speichern fehlgeschlagen (Kein JSON empfangen).';
                try {
                    const errorJson = JSON.parse(text);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    console.error('HTML Error Response:', text.substring(0, 500));
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();

            setStatus('success');
            router.refresh();
            if (onImported) onImported();
            
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (e: any) {
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-none shadow-2xl border-2 border-orange-500 w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden">
                
                {/* Header: White Background, Black text, Orange Border */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-orange-500 bg-white">
                    <h2 className="text-xl font-bold text-black uppercase tracking-widest">
                        {step === 1 ? 'IFC Import (Schritt 1: Modell hochladen)' : 'IFC Import (Schritt 2: Daten überprüfen)'}
                    </h2>
                    <button onClick={onClose} disabled={status === 'analyzing' || status === 'saving'} className="p-2 text-black hover:bg-orange-100 transition-colors cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                {/* Main Body */}
                <div className="flex-1 overflow-hidden bg-white flex flex-col">
                    {/* Status Modals Overlaying step content */}
                    {status === 'success' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <Check className="h-20 w-20 text-orange-500 mb-6" />
                            <p className="text-2xl font-bold text-black uppercase">Import erfolgreich!</p>
                            <p className="text-sm font-bold text-black mt-2">Die Seite wird aktualisiert...</p>
                        </div>
                    )}

                    {(status === 'analyzing' || status === 'saving') && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-6" />
                            <p className="text-xl font-bold text-black uppercase tracking-wider">
                                {status === 'analyzing' ? 'Modell wird analysiert...' : 'Daten werden gespeichert...'}
                            </p>
                            <p className="text-sm font-bold text-orange-500 mt-2">Bitte haben Sie einen Moment Geduld.</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex-1 border-2 border-black m-6 p-6 bg-white flex flex-col items-center justify-center">
                            <AlertTriangle className="h-12 w-12 text-black mb-4" />
                            <p className="text-xl font-bold text-black uppercase tracking-wider">Fehler aufgetreten</p>
                            <p className="text-sm font-bold text-orange-500 mt-4 text-center break-all">{errorMsg}</p>
                            <Button className="mt-6 bg-black text-white rounded-none uppercase font-bold px-8 hover:bg-gray-800" onClick={() => { setStatus('idle'); setErrorMsg(''); }}>
                                Erneut versuchen
                            </Button>
                        </div>
                    )}

                    {/* Step 1: File Upload */}
                    {step === 1 && status === 'idle' && (
                        <div className="p-8 flex-1 overflow-y-auto w-full max-w-xl mx-auto flex flex-col items-center justify-center gap-6">
                            <div className="border-4 border-dashed border-orange-500 p-10 w-full flex flex-col items-center justify-center bg-white transition-colors hover:bg-orange-50">
                                <FileArchive className="h-16 w-16 text-black mb-4" />
                                <input
                                    type="file"
                                    accept=".ifc"
                                    onChange={handleFileChange}
                                    className="text-sm font-bold text-black file:mr-4 file:py-2 file:px-6 file:border-2 file:border-orange-500 file:text-sm file:font-bold file:bg-white file:text-black hover:file:bg-orange-500 hover:file:text-white transition-all cursor-pointer w-full text-center"
                                />
                                {file && <p className="mt-6 text-sm font-bold text-orange-500 bg-orange-100 px-4 py-1 border border-orange-500">Datei: {file.name}</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Tree Review */}
                    {step === 2 && hierarchy && status === 'idle' && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                                <Search className="w-5 h-5 text-orange-500" />
                                <p className="text-sm font-bold text-black">
                                    <span className="text-orange-500">{hierarchy.positionen.length}</span> Positionen und <span className="text-orange-500">{hierarchy.unterpositionen.length}</span> Teil(e) gefunden.
                                </p>
                            </div>

                            {/* Internal Scrollable Area max-h-[60vh] */}
                            <div className="flex-1 overflow-y-auto max-h-[60vh] p-6 space-y-4">
                                {hierarchy.positionen.map((pos) => {
                                    const isPosSelected = !deselectedNodes.has(pos.signature);
                                    const children = hierarchy.unterpositionen.filter(u => u.signature.startsWith(pos.signature + '|'));
                                    
                                    return (
                                        <div key={pos.signature} className="border-2 border-orange-500 bg-white shadow-sm p-4">
                                            {/* Parent Row */}
                                            <div className="flex items-center gap-4 border-b-2 border-black pb-2 mb-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isPosSelected}
                                                    onChange={() => togglePosition(pos.signature, isPosSelected)}
                                                    className="w-5 h-5 accent-orange-500 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-base font-black text-black uppercase cursor-pointer" onClick={() => togglePosition(pos.signature, isPosSelected)}>
                                                        {pos.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Menge: {pos.menge} {pos.einheit}</p>
                                                </div>
                                            </div>

                                            {/* Children Rows */}
                                            {children.length > 0 && (
                                                <div className="pl-8 pt-2 space-y-2">
                                                    {children.map(unt => {
                                                        const isUntSelected = !deselectedNodes.has(unt.signature);
                                                        return (
                                                            <div key={unt.signature} className="flex items-center gap-3 py-1 hover:bg-orange-50">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isUntSelected}
                                                                    disabled={!isPosSelected} // Disable child if parent is unchecked
                                                                    onChange={() => toggleUnterposition(unt.signature, isUntSelected)}
                                                                    className="w-4 h-4 accent-orange-500 cursor-pointer disabled:opacity-50"
                                                                />
                                                                <div className="flex-1 flex justify-between items-center cursor-pointer" onClick={() => isPosSelected && toggleUnterposition(unt.signature, isUntSelected)}>
                                                                    <p className={`text-sm font-bold truncate ${!isPosSelected ? 'text-gray-400' : 'text-black'}`}>
                                                                        {unt.name}
                                                                    </p>
                                                                    <div className="flex gap-4 text-xs font-bold text-gray-500 min-w-40 justify-end">
                                                                        <span>{unt.materialProp || '-'}</span>
                                                                        {unt.gewichtKg ? <span>{Number(unt.gewichtKg).toFixed(2)} kg</span> : null}
                                                                        <span>x {unt.menge}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {children.length === 0 && (
                                                <p className="pl-8 text-xs text-gray-400 font-bold tracking-wider italic">Keine Unterpositionen.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t-2 border-orange-500 flex justify-between bg-white items-center">
                    <div>
                        {step === 2 && status === 'idle' && (
                            <Button 
                                variant="outline" 
                                onClick={() => { setStep(1); setHierarchy(null); setDeselectedNodes(new Set()); }}
                                className="border-0 text-gray-500 font-bold hover:bg-transparent hover:text-black hover:underline px-0 shadow-none uppercase h-10"
                            >
                                Zurück zur Auswahl
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <Button 
                            variant="outline" 
                            className="border-2 border-black text-black font-bold hover:bg-black hover:text-white rounded-none h-12 px-8 uppercase" 
                            onClick={onClose} 
                            disabled={status === 'analyzing' || status === 'saving'}
                        >
                            {step === 2 ? 'Schliessen' : 'Abbrechen'}
                        </Button>
                        
                        {step === 1 ? (
                            <Button 
                                onClick={handleAnalyze} 
                                disabled={!file || status !== 'idle'}
                                className="border-2 border-orange-500 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-none h-12 px-8 uppercase shadow-none"
                            >
                                Modell analysieren
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleFinalImport} 
                                disabled={status !== 'idle'}
                                className="border-2 border-orange-500 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-none h-12 px-8 uppercase shadow-none"
                            >
                                {hierarchy?.positionen.filter(p => !deselectedNodes.has(p.signature)).length} Positionen importieren
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
