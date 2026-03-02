import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function GET() {
    try {
        const users = await DatabaseService.list('users', {});
        return NextResponse.json({ users });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
