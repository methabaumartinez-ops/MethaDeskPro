// src/app/api/lagerorte/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { Lagerort } from '@/types';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const item = await DatabaseService.get<Lagerort>('lagerorte', id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const existing = await DatabaseService.get<Lagerort>('lagerorte', id);
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const updates = await request.json();
        const updated = await DatabaseService.upsert('lagerorte', { ...existing, ...updates, updatedAt: new Date().toISOString() });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await DatabaseService.delete('lagerorte', id);
    return NextResponse.json({ success: true });
}
