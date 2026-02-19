import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';

export async function GET() {
    try {
        console.log("Debug DB: Fetching projects...");
        const projects = await DatabaseService.list('projekte');
        return NextResponse.json({
            count: projects.length,
            projects: projects.map((p: any) => ({ id: p.id, name: p.name, bezeichnung: p.bezeichnung }))
        });
    } catch (error: any) {
        console.error("Debug DB Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
