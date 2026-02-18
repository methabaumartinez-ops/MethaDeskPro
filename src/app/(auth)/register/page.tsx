'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, MailCheck } from 'lucide-react';

const registerSchema = z.object({
    vorname: z.string().min(2, 'Vorname ist erforderlich'),
    nachname: z.string().min(2, 'Nachname ist erforderlich'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
    department: z.string().min(1, 'Abteilung ist erforderlich'),
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

            // Show confirmation pending view
            setRegistered(true);
            if (result.confirmationToken) {
                setConfirmToken(result.confirmationToken);
            }
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    const departments = [
        { label: 'Bitte wählen...', value: '' },
        { label: 'Projektleitung', value: 'Projektleitung' },
        { label: 'Planer', value: 'Planer' },
        { label: 'Produktion', value: 'Produktion' },
        { label: 'Ausführung', value: 'Ausführung' },
        { label: 'Werkhof', value: 'Werkhof' },
        { label: 'Fuhrpark', value: 'Fuhrpark' },
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
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Fast geschafft!</h2>
                        <p className="text-slate-500 leading-relaxed mb-6">
                            Wir haben Ihnen eine Bestätigungs-E-Mail gesendet.
                            Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
                        </p>

                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6">
                            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Hinweis</p>
                            <p className="text-sm text-slate-600">
                                Überprüfen Sie auch Ihren Spam-Ordner.
                            </p>
                        </div>

                        {/* Dev mode: show direct confirm link */}
                        {confirmToken && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6">
                                <p className="text-[11px] font-bold uppercase text-amber-600 mb-2">🛠 Entwicklungsmodus</p>
                                <Button
                                    className="w-full"
                                    onClick={() => router.push(`/confirm?token=${confirmToken}`)}
                                >
                                    E-Mail jetzt bestätigen
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
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-3xl font-extrabold shadow-lg shadow-primary/20">
                        M
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">
                            METHA<span className="text-primary">Desk</span> <span className="font-light text-slate-400 text-lg">pro</span>
                        </CardTitle>
                        <p className="text-sm text-slate-500 font-medium">Werden Sie Teil der METHABAU-Zukunft</p>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                        <Input
                            label="Passwort"
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            error={errors.password?.message}
                        />
                        <Select
                            label="Abteilung"
                            options={departments}
                            {...register('department')}
                            error={errors.department?.message}
                        />

                        <Button type="submit" className="w-full h-12 text-base font-bold mt-4" disabled={isSubmitting}>
                            {isSubmitting ? 'Wird erstellt...' : (
                                <span className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5" />
                                    Konto erstellen
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-500">Bereits ein Konto? </span>
                        <Link href="/login" className="font-bold text-primary hover:underline">
                            Hier anmelden
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
