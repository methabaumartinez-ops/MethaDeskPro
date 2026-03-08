import { NextResponse } from 'next/server';
import { setPasswordAfterConfirm } from '@/lib/services/authService';
import { isPasswordValid } from '@/lib/validators/authValidators';

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token und Passwort sind erforderlich.' },
                { status: 400 }
            );
        }

        // Enforce password policy server-side
        if (!isPasswordValid(password)) {
            return NextResponse.json(
                { error: 'Das Passwort erfüllt nicht die Sicherheitsanforderungen.' },
                { status: 400 }
            );
        }

        const result = await setPasswordAfterConfirm(token, password);

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Set session cookie and return user
        const response = NextResponse.json({ user: result.user, success: true });
        response.cookies.set('methabau_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24h
        });

        return response;
    } catch (error) {
        console.error('Set-password API error:', error);
        return NextResponse.json(
            { error: 'Passwort konnte nicht gesetzt werden.' },
            { status: 500 }
        );
    }
}
