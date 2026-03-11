import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ChangelogService } from '@/lib/services/changelogService';

export async function GET(req: Request) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');

    if (!entityId) {
        return NextResponse.json({ error: 'entityId parameter required' }, { status: 400 });
    }

    try {
        const entries = await ChangelogService.getEntriesForEntity(entityId);
        return NextResponse.json(entries);
    } catch (err) {
        console.error('[API] Changelog fetch error:', err);
        return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { user, error } = await requireAuth();
    if (error) return error;

    try {
        const body = await req.json();
        
        // Allowed only strictly formed manual entries from client, mostly for bulk imports
        if (!body.entityId || !body.entityType || !body.summary) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        await ChangelogService.createEntry({
            entityType: body.entityType,
            entityId: body.entityId,
            projektId: body.projektId,
            changedAt: new Date().toISOString(),
            changedBy: `${user.vorname} ${user.nachname}`,
            changedByEmail: user.email,
            changedFields: body.changedFields || [],
            summary: body.summary,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[API] Changelog create error:', err);
        return NextResponse.json({ error: 'Failed to create changelog' }, { status: 500 });
    }
}
