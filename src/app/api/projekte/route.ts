import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

export async function GET() {
    // SECURITY: All authenticated users can list projects.
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const data = await DatabaseService.list('projekte');
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error fetching projects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    // SECURITY: Only admins and projektleiters can create projects.
    const { error } = await requireAuth(['admin', 'projektleiter']);
    if (error) return error;

    try {
        const body = await req.json();

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
        console.error('API Error creating project:', error);
        return NextResponse.json(
            { error: 'Failed to create project' },
            { status: 500 }
        );
    }
}
