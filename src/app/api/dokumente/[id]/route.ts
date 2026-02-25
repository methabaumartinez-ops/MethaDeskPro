// src/app/api/dokumente/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { TsDokument } from '@/types';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    const item = await DatabaseService.get<TsDokument>('ts_dokumente', params.id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const existing = await DatabaseService.get<TsDokument>('ts_dokumente', params.id);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const updates = await request.json();
        const updated = await DatabaseService.upsert('ts_dokumente', { ...existing, ...updates });
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    await DatabaseService.delete('ts_dokumente', params.id);
    return NextResponse.json({ success: true });
}
