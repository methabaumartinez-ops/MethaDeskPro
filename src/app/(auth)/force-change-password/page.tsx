'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useProjekt } from '@/lib/context/ProjektContext';

const schema = z.object({
    newPassword: z.string().min(8, 'Mindestens 8 Zeichen'),
    confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, {
    message: 'Passwoerter stimmen nicht ueberein',
    path: ['confirm'],
});

type FormValues = z.infer<typeof schema>;

export default function ForceChangePasswordPage() {
    const router = useRouter();
    const { setCurrentUser } = useProjekt();
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormValues) => {
        setServerError(null);
        try {
            const res = await fetch('/api/auth/force-change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: data.newPassword }),
            });
            const result = await res.json();
            if (!res.ok) {
                setServerError(result.error || 'Fehler beim Speichern.');
                return;
            }
            // Refresh user session to clear mustChangePassword flag
            const meRes = await fetch('/api/auth/me');
            if (meRes.ok) {
                const meData = await meRes.json();
                setCurrentUser({ ...meData.user, mustChangePassword: false });
            }
            router.push('/welcome');
        } catch {
            setServerError('Verbindungsfehler. Bitte erneut versuchen.');
        }
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{
                backgroundImage: "url('/construction_bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

            <Card className="relative z-10 w-full max-w-md shadow-2xl border border-white/20 bg-white/90 backdrop-blur-md">
                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                        <KeyRound className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">Passwort aendern</CardTitle>
                        <p className="text-sm text-slate-500 font-medium">
                            Bitte legen Sie ein neues Passwort fest, bevor Sie fortfahren.
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-orange-800 font-medium">
                            Ihr Konto erfordert eine Passwortaenderung. Waehlen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
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
                            {...register('newPassword')}
                            error={errors.newPassword?.message}
                            endAdornment={
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="text-slate-400 hover:text-primary transition-colors focus:outline-none flex items-center justify-center w-8 h-8"
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />

                        <Input
                            label="Passwort bestaetigen"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Passwort wiederholen"
                            {...register('confirm')}
                            error={errors.confirm?.message}
                        />

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Wird gespeichert...' : 'Passwort speichern & fortfahren'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
