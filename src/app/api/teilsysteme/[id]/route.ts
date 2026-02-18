import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        let item = await DatabaseService.get('teilsysteme', id);

        // If not found by direct ID (UUID), try to find by teilsystemNummer
        if (!item) {
            // Check if it might be a nummer (string/int)
            const list = await DatabaseService.list<any>('teilsysteme', {
                must: [
                    { key: "teilsystemNummer", match: { value: id } }
                ]
            });
            if (list.length > 0) {
                item = list[0];
            }
        }

        if (!item) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("API Error fetching teilsystem:", error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const updated = await DatabaseService.upsert('teilsysteme', { ...body, id });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("API Error updating teilsystem:", error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await DatabaseService.delete('teilsysteme', id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API Error deleting teilsystem:", error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
