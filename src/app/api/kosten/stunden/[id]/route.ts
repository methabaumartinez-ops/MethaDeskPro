// src/app/api/kosten/stunden/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    await DatabaseService.delete('ts_stunden', params.id);
    return NextResponse.json({ success: true });
}
