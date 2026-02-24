import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { mockStore } from '@/lib/mock/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');

        const all = await DatabaseService.list<any>('bestellungen');
        const data = projektId ? all.filter((b: any) => b.projektId === projektId) : all;

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching bestellungen:", error);
        return NextResponse.json(
            { error: 'Failed to fetch bestellungen' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const newItem = {
            ...body,
            id: body.id || `mb-${Date.now()}-${uuidv4().substring(0, 8)}`,
        };

        const result = await DatabaseService.upsert('bestellungen', newItem);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating bestellung:", error);
        return NextResponse.json(
            { error: 'Failed to create bestellung' },
            { status: 500 }
        );
    }
}
