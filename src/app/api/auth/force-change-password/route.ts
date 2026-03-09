import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { forceChangePassword } from '@/lib/services/authService';
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

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Passwortänderung fehlgeschlagen.' }, { status: 500 });
    }
}
