'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProjekt } from '@/lib/context/ProjektContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Building2,
    Shield,
    Lock,
    CheckCircle,
    ArrowLeft,
    KeyRound,
} from 'lucide-react';

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
    newPassword: z.string().min(6, 'Neues Passwort muss mindestens 6 Zeichen lang sein'),
    confirmPassword: z.string().min(1, 'Passwort-Bestätigung ist erforderlich'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfilPage() {
    const { currentUser, logout } = useProjekt();
    const router = useRouter();
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<PasswordValues>({
        resolver: zodResolver(passwordSchema),
    });

    const onPasswordSubmit = async (data: PasswordValues) => {
        setServerError(null);
        setSuccessMsg(null);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setServerError(result.error || 'Passwortänderung fehlgeschlagen.');
                return;
            }

            setSuccessMsg('Passwort erfolgreich geändert.');
            setShowPasswordForm(false);
            reset();
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    if (!currentUser) return null;

    const initials = `${currentUser.vorname?.[0] || ''}${currentUser.nachname?.[0] || ''}`.toUpperCase();

    const roleLabels: Record<string, string> = {
        admin: 'Administrator',
        projektleiter: 'Projektleiter',
        mitarbeiter: 'Mitarbeiter',
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
            <Header />
            <div className="pt-16">
                <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
                    {/* Back button */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Zurück
                    </button>

                    {/* Profile Header Card */}
                    <Card className="shadow-2xl border-none mb-6 overflow-hidden">
                        {/* Orange gradient banner */}
                        <div className="h-28 bg-primary-gradient relative">
                            <div className="absolute -bottom-10 left-8">
                                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-primary text-2xl font-extrabold shadow-lg border-4 border-white">
                                    {initials}
                                </div>
                            </div>
                        </div>
                        <CardContent className="pt-14 pb-6 px-8">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                        {currentUser.vorname} {currentUser.nachname}
                                    </h1>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {roleLabels[currentUser.role] || currentUser.role}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-2"
                                    onClick={() => logout()}
                                >
                                    Abmelden
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 mb-6">
                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                                        <Mail className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">E-Mail</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentUser.email}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                                        <Building2 className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Abteilung</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{currentUser.department || '—'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                                        <Shield className="h-5 w-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Rolle</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{roleLabels[currentUser.role] || currentUser.role}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                                        <User className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                                        <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-green-400 inline-block"></span>
                                            Aktiv
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Success banner */}
                    {successMsg && (
                        <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-6 flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                            <p className="text-sm font-medium text-green-700">{successMsg}</p>
                        </div>
                    )}

                    {/* Password Change Section */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-slate-400" />
                                Passwort ändern
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            {!showPasswordForm ? (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        Ändern Sie Ihr Passwort regelmässig für maximale Sicherheit.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 shrink-0"
                                        onClick={() => { setShowPasswordForm(true); setSuccessMsg(null); }}
                                    >
                                        <Lock className="h-4 w-4" />
                                        Passwort ändern
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    {serverError && (
                                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                                            {serverError}
                                        </div>
                                    )}
                                    <Input
                                        label="Aktuelles Passwort"
                                        type="password"
                                        placeholder="••••••••"
                                        {...register('currentPassword')}
                                        error={errors.currentPassword?.message}
                                    />
                                    <Input
                                        label="Neues Passwort"
                                        type="password"
                                        placeholder="••••••••"
                                        {...register('newPassword')}
                                        error={errors.newPassword?.message}
                                    />
                                    <Input
                                        label="Neues Passwort bestätigen"
                                        type="password"
                                        placeholder="••••••••"
                                        {...register('confirmPassword')}
                                        error={errors.confirmPassword?.message}
                                    />
                                    <div className="flex gap-3 pt-2">
                                        <Button type="submit" className="font-bold gap-2" disabled={isSubmitting}>
                                            {isSubmitting ? 'Wird gespeichert...' : 'Passwort speichern'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => { setShowPasswordForm(false); setServerError(null); reset(); }}
                                        >
                                            Abbrechen
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-[11px] text-slate-400 font-medium">
                            METHABAU AG — METHADesk Pro v1.0.0
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
