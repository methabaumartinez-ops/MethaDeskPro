import { NextResponse } from 'next/server';
import { login } from '@/lib/services/authService';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'E-Mail und Passwort sind erforderlich.' },
                { status: 400 }
            );
        }

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
