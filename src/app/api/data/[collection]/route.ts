import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    try {
        const { collection } = await params;
        const { searchParams } = new URL(req.url);

        console.log(`API: Fetching from collection '${collection}'...`);

        // Construct filter from query params if needed
        let filter = undefined;
        // Example: ?projektId=123
        const entries = Array.from(searchParams.entries()).filter(([key]) => key !== '_r' && key !== 't');
        if (entries.length > 0) {
            const must = entries.map(([key, value]) => ({
                key,
                match: { value }
            }));
            filter = { must };
        }

        const data = await DatabaseService.list(collection, filter);
        return NextResponse.json(data);
    } catch (error) {
        const { collection } = await params;
        console.error(`API Error fetching ${collection}:`, error);
        return NextResponse.json(
            { error: `Failed to fetch ${collection}` },
            { status: 500 }
        );
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ collection: string }> }) {
    try {
        const { collection } = await params;
        const body = await req.json();
        console.log(`API: Creating item in '${collection}'...`, body);

        const newItem = {
            ...body,
            id: body.id || uuidv4(),
        };

        const result = await DatabaseService.upsert(collection, newItem);
        return NextResponse.json(result);
    } catch (error) {
        // Recover collection name from params if possible
        const { collection } = await params;
        console.error(`API Error creating item in ${collection}:`, error);
        return NextResponse.json(
            { error: `Failed to create item in ${collection}` },
            { status: 500 }
        );
    }
}
