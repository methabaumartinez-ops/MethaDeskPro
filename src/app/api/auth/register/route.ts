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

        // Registration successful — user needs to confirm email
        // The confirmation token is logged to the server console
        return NextResponse.json({
            success: true,
            message: 'Registrierung erfolgreich. Bitte bestätigen Sie Ihre E-Mail-Adresse.',
            // En desarrollo, retornar token para facilitar pruebas
            ...(process.env.NODE_ENV !== 'production' ? { confirmationToken: result.confirmationToken } : {}),
        });
    } catch (error) {
        console.error('Register API error:', error);
        return NextResponse.json(
            { error: 'Registrierung fehlgeschlagen.' },
            { status: 500 }
        );
    }
}
