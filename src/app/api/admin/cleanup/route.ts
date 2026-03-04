import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { listFilesByParent, deleteFileFromDrive } from '@/lib/services/googleDriveService';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // RBAC Check
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Nur Administratoren können die Bereinigung durchführen.' }, { status: 403 });
        }

        console.log('[Cleanup] Starting global IFC cleanup...');

        // 1. Get all projects
        const allProj = await DatabaseService.list<any>('projekte');
        const projects = allProj.filter(p => !p.deletedAt);
        let deletedCount = 0;
        let keptCount = 0;
        let errors = [];

        for (const project of projects) {
            if (!project.driveFolderId) continue;

            // 2. Find the IFC subfolder (04_IFC)
            const filesInProject = await listFilesByParent(project.driveFolderId);
            const ifcSubfolder = filesInProject.find(f => f.name === '04_IFC' && f.mimeType === 'application/vnd.google-apps.folder');

            if (!ifcSubfolder) continue;

            // 3. List all files in 04_IFC
            const ifcFiles = await listFilesByParent(ifcSubfolder.id);

            // 4. Get all Teilsysteme for this project to find used IFC URLs
            const teilsysteme = await DatabaseService.list<any>('teilsysteme', { filter: { must: [{ key: 'projektId', match: { value: project.id } }] } });
            const usedFileIds = new Set<string>();

            teilsysteme.forEach(ts => {
                if (ts.ifcUrl && ts.ifcUrl.includes('id=')) {
                    const id = ts.ifcUrl.split('id=')[1].split('&')[0];
                    usedFileIds.add(id);
                }
            });

            // 5. Delete files that are NOT in usedFileIds
            for (const file of ifcFiles) {
                if (file.mimeType === 'application/vnd.google-apps.folder') continue; // Skip folders

                if (!usedFileIds.has(file.id)) {
                    console.log(`[Cleanup] Deleting unused IFC: ${file.name} (${file.id}) from project ${project.projektnummer}`);
                    try {
                        await deleteFileFromDrive(file.id);
                        deletedCount++;
                    } catch (e: any) {
                        console.error(`[Cleanup] Failed to delete file ${file.id}:`, e.message);
                        errors.push(`File ${file.id}: ${e.message}`);
                    }
                } else {
                    keptCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Bereinigung abgeschlossen.',
            summary: {
                deletedFiles: deletedCount,
                keptFiles: keptCount,
                errors: errors.length > 0 ? errors : undefined
            }
        });

    } catch (error: any) {
        console.error('[Cleanup API] Global Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
