// src/app/api/kosten/material/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    await DatabaseService.delete('ts_materialkosten', params.id);
    return NextResponse.json({ success: true });
}
