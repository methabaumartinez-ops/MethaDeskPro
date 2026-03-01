'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Package, MapPin, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Camera, Search, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import QrScanner from '@/components/shared/QrScanner';
import { LagerbewegungTyp, Lagerort } from '@/types';
import { LagerortService } from '@/lib/services/lagerortService';
import { Select } from '@/components/ui/select';

type ScanStep = 'idle' | 'scan-entity' | 'scan-lagerort' | 'confirm' | 'done' | 'error';

interface ScanState {
    entityQr?: string;
    entityType?: 'teilsystem' | 'position' | 'unterposition';
    entityId?: string;
    lagerortQr?: string;
    lagerortId?: string;
    typ: LagerbewegungTyp;
    entityName?: string;
    entityNummer?: string;
}

function parseEntityQr(qrText: string): { entityType: 'position' | 'unterposition'; entityId: string } | null {
    if (qrText.startsWith('POSITION:')) return { entityType: 'position', entityId: qrText.replace('POSITION:', '') };
    if (qrText.startsWith('UNTERPOSITION:')) return { entityType: 'unterposition', entityId: qrText.replace('UNTERPOSITION:', '') };
    return null;
}

function parseLagerortQr(qrText: string): string | null {
    if (qrText.startsWith('LAGERORT:')) return qrText.replace('LAGERORT:', '');
    return null;
}

const BEWEGUNGSTYPEN: { value: LagerbewegungTyp; label: string; icon: string; color: string }[] = [
    { value: 'einlagerung', label: 'Einlagerung', icon: '📥', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'auslagerung', label: 'Auslagerung', icon: '📤', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'umlagerung', label: 'Umlagerung', icon: '🔄', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function LagerScanSeite() {
    const { projektId } = useParams<{ projektId: string }>();
    const [step, setStep] = useState<ScanStep>('idle');
    const [state, setState] = useState<ScanState>({ typ: 'einlagerung' });
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [lagerorte, setLagerorte] = useState<Lagerort[]>([]);
    const [selectionMode, setSelectionMode] = useState<'none' | 'camera' | 'manual'>('none');
    const router = useRouter();

    // Auto-redirect on success
    React.useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === 'done') {
            timer = setTimeout(() => {
                router.push(`/${projektId}/teilsysteme`);
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [step, projektId, router]);

    // Fetch lagerorte for manual selection
    React.useEffect(() => {
        if (projektId) {
            LagerortService.getLagerorte(projektId).then(setLagerorte).catch(console.error);
        }
    }, [projektId]);

    async function fetchEntityDetails(type: string, id: string) {
        try {
            let name = '';
            let nummer = '';

            if (type === 'teilsystem') {
                const { SubsystemService } = await import('@/lib/services/subsystemService');
                const item = await SubsystemService.getTeilsystemById(id);
                if (item) {
                    name = item.name;
                    nummer = String(item.teilsystemNummer || '');
                }
            } else if (type === 'position') {
                const { PositionService } = await import('@/lib/services/positionService');
                const item = await PositionService.getPositionById(id);
                if (item) {
                    name = item.name;
                    nummer = item.posNummer || '';
                }
            } else if (type === 'unterposition') {
                const { SubPositionService } = await import('@/lib/services/subPositionService');
                const item = await SubPositionService.getUnterpositionById(id);
                if (item) {
                    name = item.name;
                    nummer = item.posNummer || '';
                }
            }

            setState(s => ({ ...s, entityName: name, entityNummer: nummer }));
        } catch (err) {
            console.error('Error fetching entity details:', err);
        }
    }

    // Support for URL parameters (deep links)
    React.useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const type = searchParams.get('type') as any;
        const id = searchParams.get('id');
        const action = searchParams.get('action') as LagerbewegungTyp;
        const qr = searchParams.get('qr');

        if (type && id && action) {
            setState({
                typ: action,
                entityType: type,
                entityId: id,
                entityQr: qr || `${type.toUpperCase()}:${id}`
            });
            setStep('scan-lagerort');
            fetchEntityDetails(type, id);
        }
    }, []);

    function handleEntityScan(qrText: string) {
        const parsed = parseEntityQr(qrText);
        // Also support TEILSYSTEM:id
        let finalParsed = parsed;
        if (!finalParsed && qrText.startsWith('TEILSYSTEM:')) {
            finalParsed = { entityType: 'teilsystem' as any, entityId: qrText.replace('TEILSYSTEM:', '') };
        }

        if (!finalParsed) {
            setErrorMsg(`Ungültiger QR-Code: "${qrText}"\nErwartet: TEILSYSTEM:id, POSITION:id oder UNTERPOSITION:id`);
            setStep('error');
            return;
        }
        setState(s => ({ ...s, entityQr: qrText, entityType: finalParsed!.entityType, entityId: finalParsed!.entityId }));
        setStep('scan-lagerort');
        fetchEntityDetails(finalParsed.entityType, finalParsed.entityId);
    }

    function handleLagerortScan(qrText: string) {
        const lagerortId = parseLagerortQr(qrText);
        if (!lagerortId) {
            setErrorMsg(`Ungültiger Lagerort QR-Code: "${qrText}"\nErwartet: LAGERORT:id`);
            setStep('error');
            return;
        }
        setState(s => ({ ...s, lagerortQr: qrText, lagerortId }));
        setStep('confirm');
    }

    async function handleConfirm() {
        if (!state.entityId || !state.lagerortId || !state.entityType) return;
        setLoading(true);
        try {
            const userData = localStorage.getItem('methabau_user');
            const user = userData ? JSON.parse(userData) : {};
            const res = await fetch('/api/lagerbewegungen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType: state.entityType,
                    entityId: state.entityId,
                    nachLagerortId: state.lagerortId,
                    typ: state.typ,
                    durchgefuehrtVon: user.id || 'unknown',
                    durchgefuehrtVonName: user.vorname ? `${user.vorname} ${user.nachname}` : 'Unbekannt',
                    projektId,
                }),
            });
            if (!res.ok) throw new Error('Speichern fehlgeschlagen');
            setStep('done');
        } catch (err: any) {
            setErrorMsg(err.message);
            setStep('error');
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setStep('idle');
        setState({ typ: 'einlagerung' });
        setErrorMsg('');
    }

    const stepLabels = ['Typ', 'Bauteil', 'Lagerort', 'Bestätigen'];
    const stepIndex = step === 'idle' ? 0 : step === 'scan-entity' ? 1 : step === 'scan-lagerort' ? 2 : step === 'confirm' ? 3 : 3;
    const selectedTyp = BEWEGUNGSTYPEN.find(t => t.value === state.typ);

    return (
        <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">

            {/* Header / Navigation Section */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-6">
                    <Link href={`/${projektId}/lagerorte`}>
                        <Button className="h-9 px-6 bg-orange-600 hover:bg-orange-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-100 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Progress Bar */}
            {step !== 'done' && step !== 'error' && (
                <div className="flex items-center gap-1">
                    {stepLabels.map((label, i) => (
                        <React.Fragment key={i}>
                            <div className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                                i === stepIndex ? 'bg-primary text-primary-foreground shadow-sm' :
                                    i < stepIndex ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                                <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black',
                                    i < stepIndex ? 'bg-primary/30' : i === stepIndex ? 'bg-primary-foreground/30' : 'bg-muted-foreground/20'
                                )}>
                                    {i < stepIndex ? '✓' : i + 1}
                                </span>
                                {label}
                            </div>
                            {i < stepLabels.length - 1 && (
                                <div className={cn('flex-1 h-0.5 rounded', i < stepIndex ? 'bg-primary/40' : 'bg-border')} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Schritt 0: Bewegungsart */}
            {step === 'idle' && (
                <Card className="border-2 border-border shadow-md">
                    <CardHeader className="border-b bg-muted/30 py-4 px-6">
                        <CardTitle className="text-base font-black">Schritt 1: Bewegungsart wählen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                        {BEWEGUNGSTYPEN.map(t => (
                            <button
                                key={t.value}
                                onClick={() => setState(s => ({ ...s, typ: t.value }))}
                                className={cn(
                                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 font-bold transition-all text-left',
                                    state.typ === t.value
                                        ? 'border-primary bg-primary/5 text-foreground shadow-sm'
                                        : 'border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <p className="font-black text-sm">{t.label}</p>
                                    <p className="text-xs font-medium opacity-70">
                                        {t.value === 'einlagerung' ? 'Bauteil an neuem Ort einlagern' :
                                            t.value === 'auslagerung' ? 'Bauteil aus Lager entnehmen' :
                                                'Bauteil von einem Ort zum anderen'}
                                    </p>
                                </div>
                                {state.typ === t.value && (
                                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto shrink-0" />
                                )}
                            </button>
                        ))}
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
                        <Button onClick={() => setStep('scan-entity')} className="font-bold gap-2">
                            Weiter
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Schritt 1: Bauteil */}
            {step === 'scan-entity' && (
                <Card className="border-2 border-border shadow-md">
                    <CardHeader className="border-b bg-muted/30 py-4 px-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-black">Schritt 2: Bauteil scannen</CardTitle>
                            {selectedTyp && (
                                <span className={cn('px-2 py-1 rounded-full text-xs font-bold border', selectedTyp.color)}>
                                    {selectedTyp.icon} {selectedTyp.label}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Scannen Sie den QR-Code der Position oder Unterposition</p>
                    </CardHeader>
                    <CardContent className="p-6">
                        <QrScanner onScan={handleEntityScan} label="" />
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4">
                        <Button variant="ghost" onClick={() => setStep('idle')} className="font-bold gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Schritt 2: Lagerort */}
            {step === 'scan-lagerort' && (
                <Card className="border-2 border-border shadow-md">
                    <CardHeader className="border-b bg-muted/30 py-4 px-6">
                        <CardTitle className="text-base font-black">Schritt 3: Lagerort scannen</CardTitle>
                        <div className="mt-2 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1.5 flex items-center gap-2">
                                <Package className="h-3 w-3" />
                                {state.entityType === 'teilsystem' ? 'Teilsystem' : state.entityType === 'position' ? 'Position' : 'Unterposition'}
                            </p>
                            <div className="flex flex-col gap-0.5">
                                {state.entityNummer && (
                                    <span className="text-xs font-black text-slate-500">
                                        NR. {state.entityNummer}
                                    </span>
                                )}
                                <span className="text-base font-extrabold text-foreground leading-tight">
                                    {state.entityName || 'Laden...'}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-6">
                            {/* Mode Selection Buttons */}
                            <div className="grid grid-cols-2 gap-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectionMode('camera')}
                                    className={cn(
                                        "h-56 flex flex-col items-center justify-center gap-4 border-2 transition-all rounded-[2.5rem] relative overflow-hidden group shadow-lg",
                                        selectionMode === 'camera'
                                            ? "border-blue-500 bg-blue-50/50 shadow-blue-500/20 scale-105"
                                            : "border-slate-100 hover:border-blue-400/30 hover:shadow-xl bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "w-28 h-28 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner",
                                        selectionMode === 'camera' ? "bg-blue-600 shadow-blue-900/40" : "bg-blue-500 shadow-blue-700/30"
                                    )}>
                                        <img
                                            src="/images/camera_scan.png"
                                            alt="Camera Scan"
                                            className="w-20 h-20 object-contain drop-shadow-2xl"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            "font-black uppercase tracking-[0.2em] text-[10px]",
                                            selectionMode === 'camera' ? "text-blue-600" : "text-slate-400"
                                        )}>Schritt 3a</span>
                                        <span className="font-black text-sm text-slate-800">Kamera Scan</span>
                                    </div>
                                    {selectionMode === 'camera' && (
                                        <div className="absolute top-4 right-4 animate-bounce">
                                            <div className="h-3 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                                        </div>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectionMode('manual')}
                                    className={cn(
                                        "h-56 flex flex-col items-center justify-center gap-4 border-2 transition-all rounded-[2.5rem] relative overflow-hidden group shadow-lg",
                                        selectionMode === 'manual'
                                            ? "border-orange-500 bg-orange-50/50 shadow-orange-500/20 scale-105"
                                            : "border-slate-100 hover:border-orange-400/30 hover:shadow-xl bg-white"
                                    )}
                                >
                                    <div className={cn(
                                        "w-28 h-28 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-inner",
                                        selectionMode === 'manual' ? "bg-orange-600 shadow-orange-900/40" : "bg-orange-500 shadow-orange-700/30"
                                    )}>
                                        <img
                                            src="/images/pointing_hand.png"
                                            alt="Manual Selection"
                                            className="w-20 h-20 object-contain drop-shadow-2xl"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className={cn(
                                            "font-black uppercase tracking-[0.2em] text-[10px]",
                                            selectionMode === 'manual' ? "text-orange-600" : "text-slate-400"
                                        )}>Schritt 3b</span>
                                        <span className="font-black text-sm text-slate-800">Manuelle Auswahl</span>
                                    </div>
                                    {selectionMode === 'manual' && (
                                        <div className="absolute top-4 right-4 animate-bounce">
                                            <div className="h-3 w-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                                        </div>
                                    )}
                                </Button>
                            </div>

                            {/* View Content based on selection */}
                            {selectionMode === 'camera' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider px-2">
                                        <ScanLine className="h-3 w-3" />
                                        QR-Code Scannen
                                    </div>
                                    <QrScanner onScan={handleLagerortScan} label="" />
                                </div>
                            )}

                            {selectionMode === 'manual' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider px-2">
                                        <Search className="h-3 w-3" />
                                        In Liste Suchen
                                    </div>
                                    <Select
                                        value={state.lagerortId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const lo = lagerorte.find(l => l.id === val);
                                            if (lo) handleLagerortScan(lo.qrCode || `LAGERORT:${lo.id}`);
                                        }}
                                        options={[
                                            { label: 'Bitte wählen...', value: '' },
                                            ...lagerorte.map(lo => ({
                                                label: `${lo.bezeichnung} (${lo.bereich})`,
                                                value: lo.id
                                            }))
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4">
                        <Button variant="outline" onClick={() => setStep('scan-entity')} className="font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Bestätigung */}
            {step === 'confirm' && (
                <Card className="border-2 border-primary/30 shadow-md">
                    <CardHeader className="border-b bg-muted/30 py-4 px-6">
                        <CardTitle className="text-base font-black">Schritt 4: Bestätigen</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                        {[
                            { label: 'Bewegungsart', value: `${selectedTyp?.icon} ${selectedTyp?.label}` },
                            { label: 'Bauteil-Typ', value: state.entityType === 'teilsystem' ? 'Teilsystem' : state.entityType === 'position' ? 'Position' : 'Unterposition' },
                            { label: 'Bauteil-ID', value: state.entityId, mono: true },
                            { label: 'Lagerort-ID', value: state.lagerortId, mono: true },
                        ].map(row => (
                            <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{row.label}</span>
                                <span className={cn('text-sm font-bold text-foreground', row.mono && 'font-mono text-xs bg-muted px-2 py-0.5 rounded')}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-between">
                        <Button variant="ghost" onClick={() => setStep('scan-lagerort')} className="font-bold gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Zurück
                        </Button>
                        <Button onClick={handleConfirm} disabled={loading} className="font-bold gap-2 min-w-[160px]">
                            {loading ? 'Speichert...' : '💾 Bewegung speichern'}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Erfolg */}
            {step === 'done' && (
                <Card className="border-2 border-green-200 shadow-md">
                    <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                        <div className="p-4 rounded-full bg-green-100">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-foreground">Bewegung erfasst!</h3>
                            <p className="text-sm text-muted-foreground mt-1">Die Lagerbewegung wurde erfolgreich gespeichert.</p>
                            <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">Automatische Weiterleitung in 5 Sekunden...</p>
                        </div>
                        <div className="flex gap-3 mt-2">
                            <Button onClick={reset} className="font-bold gap-2">
                                <ScanLine className="h-4 w-4" />
                                Nächste Bewegung
                            </Button>
                            <Link href={`/${projektId}/lagerorte`}>
                                <Button variant="outline" className="font-bold">Lagerorte anzeigen</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Fehler */}
            {step === 'error' && (
                <Card className="border-2 border-red-200 shadow-md">
                    <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                        <div className="p-4 rounded-full bg-red-100">
                            <XCircle className="h-12 w-12 text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-red-600">Fehler</h3>
                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{errorMsg}</p>
                        </div>
                        <Button onClick={reset} variant="outline" className="font-bold gap-2 mt-2">
                            Erneut versuchen
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
