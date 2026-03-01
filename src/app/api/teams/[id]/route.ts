import { NextResponse } from 'next/server';
import { TeamService } from '@/lib/services/teamService';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await req.json();
        const result = await TeamService.updateTeam(id, body);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error updating team:", error);
        return NextResponse.json(
            { error: 'Failed to update team' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        await TeamService.deleteTeam(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error deleting team:", error);
        return NextResponse.json(
            { error: 'Failed to delete team' },
            { status: 500 }
        );
    }
}
