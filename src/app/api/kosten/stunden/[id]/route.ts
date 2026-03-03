// src/app/api/kosten/stunden/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await DatabaseService.delete('ts_stunden', id);
    return NextResponse.json({ success: true });
}
