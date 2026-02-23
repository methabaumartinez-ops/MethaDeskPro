import { NextResponse } from 'next/server';
import { login } from '@/lib/services/authService';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email({ message: 'Ungültiges E-Mail-Format.' }),
    password: z.string().min(1, { message: 'Passwort ist erforderlich.' }),
});

export async function POST(req: Request) {
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
            return NextResponse.json(
                { error: result.error },
                { status: 401 }
            );
        }

        const response = NextResponse.json({ user: result.user });
        response.cookies.set('methabau_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { error: 'Anmeldung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
