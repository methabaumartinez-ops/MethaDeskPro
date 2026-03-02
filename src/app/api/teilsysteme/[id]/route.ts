import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { SubsystemService } from '@/lib/services/subsystemService';

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

        // Fetch existing item to merge and avoid losing fields like projektId
        const existing = await DatabaseService.get('teilsysteme', id);
        const updatedData = {
            ...(existing as Record<string, unknown> || {}),
            ...body,
            id
        };

        const result = await DatabaseService.upsert('teilsysteme', updatedData);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error updating teilsystem:", error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // USE THE SERVICE FOR CASCADE DELETE
        await SubsystemService.deleteTeilsystem(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Error deleting teilsystem:", error);
        return NextResponse.json({ error: error.message || 'Failed to delete teilsystem' }, { status: 500 });
    }
}
