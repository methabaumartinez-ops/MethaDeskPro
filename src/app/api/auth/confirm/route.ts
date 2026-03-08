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

        // Email confirmed — send token back so set-password page can use it
        // The user is redirected to /auth/set-password?token=xxx to set their password
        return NextResponse.json({
            success: true,
            userId: result.userId,
            email: result.email,
        });
    } catch (error) {
        console.error('Confirm API error:', error);
        return NextResponse.json(
            { error: 'Bestätigung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}

// GET — for direct confirmation link clicks (Supabase-style redirect via GET)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/auth/login?error=missing_token', req.url));
    }

    const result = await confirmEmail(token);

    if ('error' in result) {
        const errParam = encodeURIComponent(result.error);
        return NextResponse.redirect(new URL(`/auth/login?error=${errParam}`, req.url));
    }

    // Redirect to set-password page with the confirmation token
    return NextResponse.redirect(new URL(`/auth/set-password?token=${token}`, req.url));
}
