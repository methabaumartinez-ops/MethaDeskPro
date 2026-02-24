import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const data = await DatabaseService.get('bestellungen', id);
        if (!data) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching bestellung:", error);
        return NextResponse.json(
            { error: 'Failed to fetch bestellung' },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await req.json();
        const existing = await DatabaseService.get('bestellungen', id);

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const updated = { ...existing as any, ...body, id };
        const result = await DatabaseService.upsert('bestellungen', updated);

        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error updating bestellung:", error);
        return NextResponse.json(
            { error: 'Failed to update bestellung' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        await DatabaseService.delete('bestellungen', id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error deleting bestellung:", error);
        return NextResponse.json(
            { error: 'Failed to delete bestellung' },
            { status: 500 }
        );
    }
}
