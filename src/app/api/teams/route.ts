import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');

        if (!projektId) {
            return NextResponse.json({ error: 'ProjektId is required' }, { status: 400 });
        }

        const teams = await DatabaseService.list<any>('teams');
        const normalized = teams.map(t => ({ ...t, members: t.members || [] }));
        const data = projektId ? normalized.filter(t => t.projektId === projektId) : normalized;
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error fetching teams:', error);
        return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const body = await req.json();
        const id = uuidv4();
        const now = new Date().toISOString();
        const newTeam = {
            ...body,
            id,
            createdAt: now,
            updatedAt: now,
        };
        const result = await DatabaseService.upsert('teams', newTeam);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error creating team:', error);
        return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }
}
