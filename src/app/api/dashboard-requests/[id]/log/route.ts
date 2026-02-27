import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const requestId = params.id;
        console.log(`API: Fetching conversation log for request: ${requestId}`);

        const data = await DatabaseService.list('conversation_logs', {
            must: [{ key: 'requestId', match: requestId }]
        });

        if (data.length === 0) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        return NextResponse.json(data[0]);
    } catch (error) {
        console.error("API Error fetching conversation log:", error);
        return NextResponse.json(
            { error: 'Failed to fetch conversation log' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const requestId = params.id;
        const body = await req.json();
        console.log(`API: Saving conversation log for request: ${requestId}`);

        const newItem = {
            ...body,
            requestId,
            id: body.id || uuidv4()
        };

        const result = await DatabaseService.upsert('conversation_logs', newItem);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error saving conversation log:", error);
        return NextResponse.json(
            { error: 'Failed to save conversation log' },
            { status: 500 }
        );
    }
}
