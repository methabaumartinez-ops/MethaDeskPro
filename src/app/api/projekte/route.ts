import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        console.log("API: Fetching projekte from Qdrant...");
        const data = await DatabaseService.list('projekte');
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error fetching projects:", error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("API: Creating project in Qdrant...", body);

        // Ensure ID and basic fields
        const newProject = {
            ...body,
            id: body.id || uuidv4(),
            createdAt: body.createdAt || new Date().toISOString(),
            status: body.status || 'offen',
        };

        // Create Drive Folder
        try {
            if (process.env.GOOGLE_CLIENT_ID) {
                const { ensureProjectFolder } = await import('@/lib/services/googleDriveService');
                const folderId = await ensureProjectFolder({
                    projektnummer: newProject.projektnummer,
                    projektname: newProject.projektname
                });
                if (folderId) {
                    newProject.driveFolderId = folderId;
                }
            }
        } catch (e) {
            console.error('Failed to create Drive folder:', e);
        }

        const result = await DatabaseService.upsert('projekte', newProject);
        return NextResponse.json(result);
    } catch (error) {
        console.error("API Error creating project:", error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
