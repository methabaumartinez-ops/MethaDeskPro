import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function GET() {
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const data = await DatabaseService.list('mitarbeiter');
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error fetching employees:', error);
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const body = await req.json();
        const newEmployee = {
            ...body,
            id: body.id || uuidv4(),
        };
        const result = await DatabaseService.upsert('mitarbeiter', newEmployee);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error creating employee:', error);
        return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }
}
