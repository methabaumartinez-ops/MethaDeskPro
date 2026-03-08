'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, MailCheck, ShieldAlert } from 'lucide-react';
import { Signature } from '@/components/shared/Signature';
import { ABTEILUNGEN_CONFIG } from '@/types';
import { emailDomainSchema, ALLOWED_DOMAINS } from '@/lib/validators/authValidators';

const registerSchema = z.object({
    vorname: z.string().min(2, 'Vorname ist erforderlich'),
    nachname: z.string().min(2, 'Nachname ist erforderlich'),
    email: emailDomainSchema,
    abteilung: z.string().min(1, 'Abteilung ist erforderlich'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const [registered, setRegistered] = useState(false);
    const [confirmToken, setConfirmToken] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterValues) => {
        setServerError(null);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                setServerError(result.error || 'Registrierung fehlgeschlagen.');
                return;
            }

            setRegistered(true);
            if (result.confirmationToken) {
                setConfirmToken(result.confirmationToken);
            }
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    const departments = [
        { label: 'Abteilung wählen...', value: '' },
        ...ABTEILUNGEN_CONFIG.map(a => ({ label: a.name, value: a.name }))
    ];

    // ─── Confirmation pending view ──────────────────────
    if (registered) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-2xl border-none text-center">
                    <CardContent className="p-10">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 mb-6">
                            <MailCheck className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">E-Mail wird versendet!</h2>
                        <p className="text-slate-500 leading-relaxed mb-6">
                            Wir haben Ihnen eine Bestätigungs-E-Mail gesendet.
                            Bitte klicken Sie auf den Link in der E-Mail — er führt Sie direkt zur Passworterstellung.
                        </p>

                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6 text-left">
                            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Nächste Schritte</p>
                            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                                <li>E-Mail-Postfach prüfen (auch Spam)</li>
                                <li>Link in der E-Mail anklicken</li>
                                <li>Passwort festlegen</li>
                                <li>Anmelden und loslegen</li>
                            </ol>
                        </div>

                        {/* Dev mode: show direct link */}
                        {confirmToken && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6">
                                <p className="text-[11px] font-bold uppercase text-amber-600 mb-2">🛠 Entwicklungsmodus</p>
                                <Button
                                    className="w-full"
                                    onClick={() => router.push(`/auth/set-password?token=${confirmToken}`)}
                                >
                                    Direkt zum Passwort festlegen →
                                </Button>
                            </div>
                        )}

                        <Link href="/login" className="text-sm font-bold text-primary hover:underline">
                            Zurück zur Anmeldung
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Registration form ──────────────────────────────
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg shadow-2xl border-none">
                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-3xl font-extrabold shadow-lg shadow-primary/20">
                        M
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">
                            METHA<span className="text-primary">Desk</span>{' '}
                            <span className="font-light text-slate-400 text-lg">pro</span>
                        </CardTitle>
                        <p className="text-sm text-slate-500 font-medium">Werden Sie Teil der METHABAU-Zukunft</p>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    {/* Domain restriction notice */}
                    <div className="mb-5 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
                        <ShieldAlert className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">
                            Registrierung nur für Mitarbeitende von METHABAU AG und Manser Group.
                            Erlaubte Domains:{' '}
                            {ALLOWED_DOMAINS.map((d, i) => (
                                <span key={d}>
                                    <span className="font-bold">@{d}</span>
                                    {i < ALLOWED_DOMAINS.length - 1 ? ', ' : ''}
                                </span>
                            ))}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {serverError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                                {serverError}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Vorname"
                                placeholder="Max"
                                {...register('vorname')}
                                error={errors.vorname?.message}
                            />
                            <Input
                                label="Nachname"
                                placeholder="Muster"
                                {...register('nachname')}
                                error={errors.nachname?.message}
                            />
                        </div>
                        <Input
                            label="E-Mail-Adresse"
                            placeholder="m.muster@methabau.ch"
                            {...register('email')}
                            error={errors.email?.message}
                        />
                        <Select
                            label="Abteilung"
                            options={departments}
                            {...register('abteilung')}
                            error={errors.abteilung?.message}
                        />

                        <p className="text-xs text-slate-400 pt-1">
                            Sie erhalten eine E-Mail zur Bestätigung. Das Passwort wird danach festgelegt.
                        </p>

                        <Button type="submit" className="w-full h-12 text-base font-bold mt-2" disabled={isSubmitting}>
                            {isSubmitting ? 'Wird erstellt...' : (
                                <span className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Konto erstellen
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-slate-500">Bereits ein Konto? </span>
                        <Link href="/login" className="font-bold text-primary hover:underline">
                            Hier anmelden
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-6 left-8 flex items-end justify-between right-8 pointer-events-none">
                <div className="pointer-events-auto">
                    <Signature />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider opacity-60">v1.4</p>
            </div>
        </div>
    );
}
