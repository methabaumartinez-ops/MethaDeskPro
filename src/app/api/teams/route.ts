import { NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/teamService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');

        if (!projektId) {
            return NextResponse.json({ error: 'ProjektId is required' }, { status: 400 });
        }

        const data = await TeamService.getTeams(projektId);
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching teams:", error);
        return NextResponse.json(
            { error: 'Failed to fetch teams' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = await TeamService.createTeam(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating team:", error);
        return NextResponse.json(
            { error: 'Failed to create team' },
            { status: 500 }
        );
    }
}
