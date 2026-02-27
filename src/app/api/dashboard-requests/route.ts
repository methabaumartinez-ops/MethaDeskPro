import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        console.log(`API: Fetching dashboard requests (userId=${userId || 'all'})...`);

        let data = await DatabaseService.list('dashboard_requests');

        if (userId) {
            data = (data as any[]).filter(r => r.userId === userId);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching dashboard requests:", error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard requests' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("API: Creating/Updating dashboard request...", body);

        const newItem = {
            ...body,
            id: body.id || uuidv4(),
            updatedAt: new Date().toISOString()
        };

        const result = await DatabaseService.upsert('dashboard_requests', newItem);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating dashboard request:", error);
        return NextResponse.json(
            { error: 'Failed to save dashboard request' },
            { status: 500 }
        );
    }
}
