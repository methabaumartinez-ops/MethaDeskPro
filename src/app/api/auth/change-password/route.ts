import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/services/authService';
import { changePassword } from '@/lib/services/authService';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Sitzung abgelaufen.' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Aktuelles und neues Passwort sind erforderlich.' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Neues Passwort muss mindestens 6 Zeichen lang sein.' },
                { status: 400 }
            );
        }

        const result = await changePassword(payload.userId, currentPassword, newPassword);

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Passwort erfolgreich geändert.' });
    } catch (error) {
        console.error('Change password API error:', error);
        return NextResponse.json(
            { error: 'Passwortänderung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
