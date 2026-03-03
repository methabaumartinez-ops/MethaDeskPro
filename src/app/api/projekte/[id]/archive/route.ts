import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';
import { DatabaseService } from '@/lib/services/db';
import {
    ensureArchivesFolder,
    listFolderFilesRecursive,
    downloadFileFromDriveAsBuffer,
    uploadFileToDrive,
} from '@/lib/services/googleDriveService';
import JSZip from 'jszip';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Auth check — only admins
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });

        const user = await getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Nur Administratoren können Projekte archivieren.' }, { status: 403 });
        }

        // Load the project
        const project = await DatabaseService.get<any>('projekte', id);
        if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        if (project.deletedAt) return NextResponse.json({ error: 'Projekt bereits archiviert.' }, { status: 409 });

        // ─────────────────────────────────────────────────
        // 1. Gather all project data from database
        // ─────────────────────────────────────────────────
        const [
            teilsysteme,
            lagerorte,
            teams,
            tasks,
        ] = await Promise.all([
            DatabaseService.list<any>('teilsysteme').then(items => items.filter((i: any) => i.projektId === id)),
            DatabaseService.list<any>('lagerorte').then(items => items.filter((i: any) => i.projektId === id)),
            DatabaseService.list<any>('teams').then(items => items.filter((i: any) => i.projektId === id)),
            DatabaseService.list<any>('tasks').then(items => items.filter((i: any) => i.projektId === id)),
        ]);

        const tsIds = teilsysteme.map((ts: any) => ts.id);

        const [positionen, dokumente, kosten_stunden, kosten_material] = await Promise.all([
            DatabaseService.list<any>('positionen').then(items => items.filter((i: any) => tsIds.includes(i.teilsystemId))),
            DatabaseService.list<any>('dokumente').then(items => items.filter((i: any) => i.projektId === id || tsIds.includes(i.entityId))),
            DatabaseService.list<any>('ts_stunden').then(items => items.filter((i: any) => i.projektId === id)),
            DatabaseService.list<any>('ts_materialkosten').then(items => items.filter((i: any) => i.projektId === id)),
        ]);

        const posIds = positionen.map((p: any) => p.id);
        const unterpositionen = await DatabaseService.list<any>('unterpositionen')
            .then(items => items.filter((i: any) => posIds.includes(i.positionId)));

        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: user.email || user.id,
            projekt: project,
            teilsysteme,
            positionen,
            unterpositionen,
            lagerorte,
            teams,
            tasks,
            dokumente,
            kosten: { stunden: kosten_stunden, materialkosten: kosten_material },
        };

        // ─────────────────────────────────────────────────
        // 2. Create ZIP in memory
        // ─────────────────────────────────────────────────
        const zip = new JSZip();

        // Add database export as JSON
        zip.file('datos_proyecto.json', JSON.stringify(exportData, null, 2));

        // ─────────────────────────────────────────────────
        // 3. Download Drive files and add to ZIP
        // ─────────────────────────────────────────────────
        if (project.driveFolderId) {
            try {
                const driveFiles = await listFolderFilesRecursive(project.driveFolderId, 'archivos_drive');
                const driveFolder = zip.folder('archivos_drive');

                const BATCH_SIZE = 5; // Download in batches to avoid rate limits
                for (let i = 0; i < driveFiles.length; i += BATCH_SIZE) {
                    const batch = driveFiles.slice(i, i + BATCH_SIZE);
                    await Promise.all(
                        batch.map(async (file) => {
                            try {
                                const buffer = await downloadFileFromDriveAsBuffer(file.id);
                                // Preserve directory structure in ZIP
                                const relativePath = file.path.startsWith('archivos_drive/')
                                    ? file.path.slice('archivos_drive/'.length)
                                    : file.path;
                                driveFolder?.file(relativePath, buffer);
                            } catch (e) {
                                console.warn(`[Archive] Could not download file ${file.id} (${file.name}):`, e);
                                driveFolder?.file(`ERROR_${file.name}.txt`, `Could not download: ${String(e)}`);
                            }
                        })
                    );
                }
            } catch (driveErr) {
                console.warn('[Archive] Drive download failed, continuing without Drive files:', driveErr);
                zip.file('DRIVE_ERROR.txt', `No se pudieron descargar los archivos de Drive: ${String(driveErr)}`);
            }
        }

        // ─────────────────────────────────────────────────
        // 4. Generate ZIP buffer
        // ─────────────────────────────────────────────────
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        // ─────────────────────────────────────────────────
        // 5. Upload ZIP to _MethaDeskArchives in Drive
        // ─────────────────────────────────────────────────
        const archivesFolderId = await ensureArchivesFolder();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const zipName = `${project.projektnummer || 'P'}_${(project.projektname || 'Projekt').replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}.zip`;

        const uploadResult = await uploadFileToDrive(
            zipBuffer,
            zipName,
            'application/zip',
            archivesFolderId
        );

        const zipUrl = uploadResult.webViewLink || uploadResult.directUrl || '';

        // ─────────────────────────────────────────────────
        // 6. Soft-delete: mark project as deleted in DB
        // ─────────────────────────────────────────────────
        const updatedProject = {
            ...project,
            deletedAt: new Date().toISOString(),
            archivedZipUrl: zipUrl,
            archivedZipName: zipName,
        };
        await DatabaseService.upsert('projekte', updatedProject);

        return NextResponse.json({ success: true, zipUrl, zipName });

    } catch (error: any) {
        console.error('[Archive API] Error:', error);
        return NextResponse.json(
            { error: `Archivierung fehlgeschlagen: ${error?.message || String(error)}` },
            { status: 500 }
        );
    }
}
