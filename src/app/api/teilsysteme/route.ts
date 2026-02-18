import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');

        console.log(`API: Fetching teilsysteme (projektId=${projektId || 'all'})...`);

        let filter = undefined;
        if (projektId) {
            filter = {
                must: [
                    { key: "projektId", match: { value: projektId } }
                ]
            };
        }

        const data = await DatabaseService.list('teilsysteme', filter);
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching teilsysteme:", error);
        return NextResponse.json(
            { error: 'Failed to fetch teilsysteme' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("API: Creating teilsystem...", body);

        const newItem = {
            ...body,
            id: body.id || uuidv4(),
        };

        const result = await DatabaseService.upsert('teilsysteme', newItem);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating teilsystem:", error);
        return NextResponse.json(
            { error: 'Failed to create teilsystem' },
            { status: 500 }
        );
    }
}
