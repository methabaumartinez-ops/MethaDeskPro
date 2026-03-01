import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/services/taskService';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user) return NextResponse.json({ error: 'Ungültiger Token.' }, { status: 401 });

        const body = await req.json();
        const { projektId } = body;

        if (!projektId) {
            return NextResponse.json({ error: 'Projekt ID wird benötigt' }, { status: 400 });
        }

        console.log(`API: Syncing Bau Teilsysteme to tasks for projekt ${projektId}...`);
        await TaskService.syncBauTeilsysteme(projektId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error syncing Bau Teilsysteme:", error);
        return NextResponse.json(
            { error: 'Fehler bei der Sychronisation' },
            { status: 500 }
        );
    }
}
