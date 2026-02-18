import { NextResponse } from 'next/server';
import { confirmEmail } from '@/lib/services/authService';

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Bestätigungstoken fehlt.' },
                { status: 400 }
            );
        }

        const result = await confirmEmail(token);

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
        console.error('Confirm API error:', error);
        return NextResponse.json(
            { error: 'Bestätigung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
