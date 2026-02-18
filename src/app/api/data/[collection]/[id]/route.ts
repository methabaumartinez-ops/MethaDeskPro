import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function GET(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    try {
        const { collection, id } = await params;
        const item = await DatabaseService.get(collection, id);

        if (!item) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error(`API Error fetching ${id} from ${collection}:`, error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    try {
        const { collection, id } = await params;
        const body = await req.json();
        const updated = await DatabaseService.upsert(collection, { ...body, id });
        return NextResponse.json(updated);
    } catch (error) {
        console.error(`API Error updating ${id} in ${collection}:`, error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ collection: string, id: string }> }) {
    try {
        const { collection, id } = await params;
        await DatabaseService.delete(collection, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`API Error deleting ${id} from ${collection}:`, error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
