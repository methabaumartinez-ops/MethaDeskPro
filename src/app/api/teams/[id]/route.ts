import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { requireAuth } from '@/lib/helpers/requireAuth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await req.json();
        const existing = await DatabaseService.get<any>('teams', id);
        if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        const updatedData = { ...existing, ...body, updatedAt: new Date().toISOString() };
        const result = await DatabaseService.upsert('teams', updatedData);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error updating team:", error);
        return NextResponse.json(
            { error: 'Failed to update team' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const { id } = await params;
        await DatabaseService.delete('teams', id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error deleting team:", error);
        return NextResponse.json(
            { error: 'Failed to delete team' },
            { status: 500 }
        );
    }
}
