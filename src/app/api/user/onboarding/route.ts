import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { updateOnboardingStatus } from '@/lib/services/authService';

export async function PATCH(req: Request) {
    const { user, error } = await requireAuth();
    if (error) return error;

    try {
        const { status } = await req.json();

        if (!['completed', 'skipped'].includes(status)) {
            return NextResponse.json(
                { error: 'Ungültiger Status. Erlaubt: completed, skipped.' },
                { status: 400 }
            );
        }

        const result = await updateOnboardingStatus(user.id, status);

        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Onboarding API error:', err);
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Onboarding-Status.' }, { status: 500 });
    }
}
