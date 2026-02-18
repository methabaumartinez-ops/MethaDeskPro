'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjekt } from '@/lib/context/ProjektContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function ConfirmContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { setCurrentUser } = useProjekt();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setErrorMsg('Kein Bestätigungstoken vorhanden.');
            return;
        }

        async function confirm() {
            try {
                const res = await fetch('/api/auth/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: searchParams.get('token') }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setStatus('error');
                    setErrorMsg(data.error || 'Bestätigung fehlgeschlagen.');
                    return;
                }

                setCurrentUser(data.user);
                setStatus('success');
            } catch {
                setStatus('error');
                setErrorMsg('Verbindungsfehler.');
            }
        }

        confirm();
    }, [searchParams, setCurrentUser]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-none text-center">
                <CardContent className="p-10">
                    {/* Header */}
                    <div className="mb-6">
                        <span className="text-xl font-bold tracking-tight text-slate-800">
                            METHA<span className="text-primary">Desk</span> <span className="font-light text-slate-400 text-sm">pro</span>
                        </span>
                    </div>

                    {status === 'loading' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 mb-6 animate-pulse">
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">E-Mail wird bestätigt...</h2>
                            <p className="text-slate-500">Bitte warten Sie einen Moment.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 mb-6">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">E-Mail bestätigt!</h2>
                            <p className="text-slate-500 mb-6">
                                Ihr Konto ist jetzt aktiv. Willkommen bei METHADesk Pro.
                            </p>

                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6">
                                <p className="text-sm text-slate-600 flex items-center gap-2 justify-center">
                                    <span className="inline-block h-2 w-2 rounded-full bg-green-400"></span>
                                    Konto erfolgreich aktiviert
                                </p>
                            </div>

                            <Button className="w-full h-12 font-bold text-base" onClick={() => router.push('/projekte')}>
                                Zum Dashboard
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-6">
                                <XCircle className="h-10 w-10 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Bestätigung fehlgeschlagen</h2>
                            <p className="text-slate-500 mb-6">{errorMsg}</p>

                            <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
                                Zur Anmeldung
                            </Button>
                        </>
                    )}

                    <div className="mt-8 pt-4 border-t">
                        <p className="text-[11px] text-slate-400 font-medium">
                            METHABAU AG — METHADesk Pro
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <ConfirmContent />
        </Suspense>
    );
}
