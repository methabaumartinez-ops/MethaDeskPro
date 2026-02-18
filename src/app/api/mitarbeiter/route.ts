import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        console.log("API: Fetching employees from Qdrant...");
        const data = await DatabaseService.list('mitarbeiter');
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching employees:", error);
        return NextResponse.json(
            { error: 'Failed to fetch employees' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("API: Creating employee in Qdrant...", body);

        const newEmployee = {
            ...body,
            id: body.id || uuidv4(),
        };

        const result = await DatabaseService.upsert('mitarbeiter', newEmployee);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating employee:", error);
        return NextResponse.json(
            { error: 'Failed to create employee' },
            { status: 500 }
        );
    }
}
