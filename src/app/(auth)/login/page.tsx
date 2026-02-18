'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProjekt } from '@/lib/context/ProjektContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(5, 'Passwort muss mindestens 5 Zeichen lang sein'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { setCurrentUser } = useProjekt();
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginValues) => {
        setServerError(null);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                setServerError(result.error || 'Anmeldung fehlgeschlagen.');
                return;
            }

            setCurrentUser(result.user);
            router.push('/projekte');
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Card className="w-full max-w-md shadow-2xl border-none">
                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white text-3xl font-extrabold shadow-lg shadow-primary/20">
                        M
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">
                            METHA<span className="text-primary">Desk</span> <span className="font-light text-slate-400 text-lg">pro</span>
                        </CardTitle>
                        <p className="text-sm text-slate-500 font-medium">METHABAU Dashboard Login</p>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {serverError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-medium">
                                {serverError}
                            </div>
                        )}
                        <Input
                            label="E-Mail-Adresse"
                            placeholder="name@methabau.ch"
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
                        <Button type="submit" className="w-full h-12 text-base font-bold" disabled={isSubmitting}>
                            {isSubmitting ? 'Wird angemeldet...' : (
                                <span className="flex items-center gap-2">
                                    <LogIn className="h-5 w-5" />
                                    Anmelden
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-slate-500">Noch kein Konto? </span>
                        <Link href="/register" className="font-bold text-primary hover:underline">
                            Jetzt registrieren
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
