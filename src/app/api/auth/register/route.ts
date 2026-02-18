import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/authService';

export async function POST(req: Request) {
    try {
        const { vorname, nachname, email, password, department } = await req.json();

        if (!vorname || !nachname || !email || !password) {
            return NextResponse.json(
                { error: 'Alle Pflichtfelder müssen ausgefüllt werden.' },
                { status: 400 }
            );
        }

        const result = await registerUser({ vorname, nachname, email, password, department });

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        const response = NextResponse.json({ user: result.user });
        response.cookies.set('methabau_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });

        return response;
    } catch (error) {
        console.error('Register API error:', error);
        return NextResponse.json(
            { error: 'Registrierung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
