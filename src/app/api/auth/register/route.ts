import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/authService';
import { emailDomainSchema } from '@/lib/validators/authValidators';

export async function POST(req: Request) {
    try {
        const { vorname, nachname, email, abteilung } = await req.json();

        if (!vorname || !nachname || !email) {
            return NextResponse.json(
                { error: 'Alle Pflichtfelder müssen ausgefüllt werden.' },
                { status: 400 }
            );
        }

        // Domain validation (redundant with authService, but belt-and-suspenders)
        const domainCheck = emailDomainSchema.safeParse(email);
        if (!domainCheck.success) {
            return NextResponse.json(
                { error: domainCheck.error.errors[0]?.message ?? 'Ungültige E-Mail-Domäne.' },
                { status: 403 }
            );
        }

        const result = await registerUser({ vorname, nachname, email, abteilung });

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Registrierung erfolgreich. Bitte prüfen Sie Ihre E-Mail-Adresse.',
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
