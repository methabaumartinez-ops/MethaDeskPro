'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, CheckCircle, XCircle, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Signature } from '@/components/shared/Signature';
import { passwordSchema, PASSWORD_RULES, checkPasswordRules } from '@/lib/validators/authValidators';
import type { RuleId } from '@/lib/validators/authValidators';
import { useProjekt } from '@/lib/context/ProjektContext';

const schema = z.object({
    password: passwordSchema,
    passwordConfirm: z.string(),
}).refine(d => d.password === d.passwordConfirm, {
    message: 'Passwörter stimmen nicht überein.',
    path: ['passwordConfirm'],
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────
// Inner component — uses useSearchParams(), MUST be inside Suspense
// Next.js 15: useSearchParams() in client components requires a
// Suspense boundary above it to prevent blocking prerender.
// ─────────────────────────────────────────────────────────────
function SetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { setCurrentUser } = useProjekt();

    const [showPw, setShowPw] = useState(false);
    const [showPwConfirm, setShowPwConfirm] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [livePassword, setLivePassword] = useState('');

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const watchedPw = watch('password', '');
    useEffect(() => { setLivePassword(watchedPw || ''); }, [watchedPw]);

    const ruleStatus = checkPasswordRules(livePassword);
    const allRulesMet = Object.values(ruleStatus).every(Boolean);

    const onSubmit = async (data: FormValues) => {
        if (!token) { setServerError('Kein gültiger Token gefunden.'); return; }
        setServerError(null);
        try {
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: data.password }),
            });
            const result = await res.json();
            if (!res.ok) { setServerError(result.error || 'Fehler beim Setzen des Passworts.'); return; }
            setCurrentUser(result.user);
            router.push('/welcome');
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white p-4">
                <Card className="w-full max-w-md shadow-2xl border-none text-center p-8">
                    <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">Ungültiger Link</h2>
                    <p className="text-slate-500 mt-2 text-sm">Der Bestätigungslink ist nicht mehr gültig oder fehlt. Bitte registrieren Sie sich erneut.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-3xl font-extrabold shadow-lg shadow-primary/20">
                        M
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">
                            METHA<span className="text-primary">Desk</span>{' '}
                            <span className="font-light text-slate-400 text-lg">pro</span>
                        </CardTitle>
                        <p className="text-sm text-slate-500 font-medium">Passwort festlegen</p>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="mb-6 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-3">
                        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                        <p className="text-xs text-orange-700 font-medium">
                            Ihre E-Mail ist bestätigt. Legen Sie jetzt Ihr Passwort fest, um den Zugang zu aktivieren.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {serverError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                                {serverError}
                            </div>
                        )}

                        <Input
                            label="Neues Passwort"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Mindestens 8 Zeichen"
                            {...register('password')}
                            error={errors.password?.message}
                            endAdornment={
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="text-slate-400 hover:text-primary transition-colors focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100">
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />

                        {livePassword.length > 0 && (
                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                                {PASSWORD_RULES.map((rule) => {
                                    const met = ruleStatus[rule.id as RuleId];
                                    return (
                                        <div key={rule.id} className={`flex items-center gap-2 text-xs font-medium transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {met
                                                ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                : <XCircle className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                                            }
                                            {rule.label}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Input
                            label="Passwort bestätigen"
                            type={showPwConfirm ? 'text' : 'password'}
                            placeholder="Passwort wiederholen"
                            {...register('passwordConfirm')}
                            error={errors.passwordConfirm?.message}
                            endAdornment={
                                <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)}
                                    className="text-slate-400 hover:text-primary transition-colors focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100">
                                    {showPwConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold"
                            disabled={isSubmitting || !allRulesMet}
                        >
                            {isSubmitting ? 'Wird gespeichert...' : (
                                <span className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5" />
                                    Passwort aktivieren &amp; Anmelden
                                </span>
                            )}
                        </Button>
                    </form>
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

// ─────────────────────────────────────────────────────────────
// Page export — wraps form in Suspense to satisfy Next.js 15
// requirement: useSearchParams() must be inside a Suspense boundary
// ─────────────────────────────────────────────────────────────
export default function SetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <SetPasswordForm />
        </Suspense>
    );
}
