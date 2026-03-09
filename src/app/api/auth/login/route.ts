import { NextResponse } from 'next/server';
import { login } from '@/lib/services/authService';
import { z } from 'zod';
import { loginLimiter } from '@/lib/helpers/rateLimit';

const loginSchema = z.object({
    email: z.string().email({ message: 'Ungültiges E-Mail-Format.' }),
    password: z.string().min(1, { message: 'Passwort ist erforderlich.' }),
});

export async function POST(req: Request) {
    // RATE LIMIT: max 10 login attempts/min per IP — brute force protection
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limitResult = loginLimiter.check(ip);
    if (!limitResult.allowed) {
        return NextResponse.json({ error: limitResult.message }, { status: 429 });
    }

    try {
        const body = await req.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const { email, password } = validation.data;

        const result = await login(email, password);
        if ('error' in result) {
            console.log(`[Diagnostic-Route] Login failed for ${email} with error: ${result.error}`);
            return NextResponse.json(
                { error: result.error },
                { status: 401 }
            );
        }

        const isProduction = process.env.NODE_ENV === 'production';
        console.log(`[Diagnostic-Route] Login success for ${email}. Env: NODE_ENV=${process.env.NODE_ENV}. Setting cookie (secure: ${isProduction})`);

        const response = NextResponse.json({ user: result.user });
        response.cookies.set('methabau_token', result.token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 dias
        });

        return response;
    } catch (error) {
        console.error('[Diagnostic-Route] Unexpected Login API error:', error);
        return NextResponse.json(
            { error: 'Anmeldung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
// trigger HMR
