import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';
import { DatabaseService } from '@/lib/services/db';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Nur Administratoren können gelöschte Projekte einsehen.' }, { status: 403 });
        }

        const allProjects = await DatabaseService.list<any>('projekte');
        const deletedProjects = allProjects
            .filter((p: any) => p.deletedAt)
            .sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

        return NextResponse.json(deletedProjects);
    } catch (error: any) {
        console.error('[Deleted Projects API] Error:', error);
        return NextResponse.json({ error: 'Fehler beim Laden der gelöschten Projekte.' }, { status: 500 });
    }
}
