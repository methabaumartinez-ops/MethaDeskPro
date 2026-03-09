'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useProjekt } from '@/lib/context/ProjektContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Signature } from '@/components/shared/Signature';

const loginSchema = z.object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(5, 'Passwort muss mindestens 5 Zeichen lang sein'),
});

type LoginValues = z.infer<typeof loginSchema>;

// Inner component that safely uses useSearchParams() inside Suspense
function LoginForm() {
    const { setCurrentUser } = useProjekt();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/welcome';
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

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
            if (result.user.mustChangePassword) {
                router.push('/force-change-password');
            } else {
                router.push(redirectTo);
            }
        } catch {
            setServerError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
        }
    };

    return (
        <Card className="relative z-10 w-full max-w-md shadow-2xl border border-white/20 bg-white/85 backdrop-blur-md">
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
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                        error={errors.password?.message}
                        endAdornment={
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowPassword(!showPassword);
                                }}
                                className="text-slate-400 hover:text-primary transition-colors focus:outline-none flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100"
                                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                            </button>
                        }
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
    );
}

// Page shell — useSearchParams() is inside Suspense via LoginForm
export default function LoginPage() {
    return (
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{
                backgroundImage: "url('/construction_bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Overlay oscuro para legibilidad */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

            <Suspense fallback={
                <div className="relative z-10 w-full max-w-md h-96 animate-pulse bg-white/50 rounded-2xl" />
            }>
                <LoginForm />
            </Suspense>

            <div className="fixed bottom-6 left-8 flex items-end justify-between right-8 pointer-events-none z-20">
                <div className="pointer-events-auto">
                    <Signature />
                </div>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                    v1.3
                </p>
            </div>
        </div>
    );
}
