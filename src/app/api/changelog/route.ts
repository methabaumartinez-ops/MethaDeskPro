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
