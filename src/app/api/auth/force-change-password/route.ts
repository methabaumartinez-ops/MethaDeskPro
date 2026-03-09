import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { forceChangePassword, generateToken } from '@/lib/services/authService';
import { z } from 'zod';

const schema = z.object({
    newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
});

export async function POST(req: Request) {
    const { user, error } = await requireAuth();
    if (error) return error;

    try {
        const body = await req.json();
        const validation = schema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
        }

        const result = await forceChangePassword(user!.id, validation.data.newPassword);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Generate a fresh JWT WITHOUT mustChangePassword so the middleware
        // no longer redirects back to /force-change-password
        const newToken = await generateToken({
            userId: user!.id,
            email: user!.email,
            role: user!.role,
            mustChangePassword: false,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set('methabau_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ error: 'Passwortänderung fehlgeschlagen.' }, { status: 500 });
    }
}
