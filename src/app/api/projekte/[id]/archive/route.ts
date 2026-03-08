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
        if (!user || !['admin', 'superadmin'].includes(user.role)) {
            return NextResponse.json({ error: 'Nur Administratoren können Projekte archivieren.' }, { status: 403 });
        }

        // Load the project
        const project = await DatabaseService.get<any>('projekte', id);
        if (!project) return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        if (project.deletedAt) return NextResponse.json({ error: 'Projekt bereits archiviert.' }, { status: 409 });

        // ─────────────────────────────────────────────────
        // 1. Gather all project data from database
        // ─────────────────────────────────────────────────
        // Helper: list from table silently if it doesn't exist
        // ─────────────────────────────────────────────────
        const tryList = async (table: string, filterFn: (items: any[]) => any[]) => {
            try {
                const items = await DatabaseService.list<any>(table);
                return filterFn(items);
            } catch (e: any) {
                console.warn(`[Archive] Table '${table}' not found or error — skipping. (${e.message})`);
                return [];
            }
        };

        const [teilsysteme, lagerorte, teams, tasks] = await Promise.all([
            tryList('teilsysteme', items => items.filter(i => i.projektId === id)),
            tryList('lagerorte',   items => items.filter(i => i.projektId === id)),
            tryList('teams',       items => items.filter(i => i.projektId === id)),
            tryList('tasks',       items => items.filter(i => i.projektId === id)),
        ]);

        const tsIds = teilsysteme.map((ts: any) => ts.id);

        const [positionen, dokumente, kosten_stunden, kosten_material] = await Promise.all([
            tryList('positionen',      items => items.filter(i => tsIds.includes(i.teilsystemId))),
            tryList('dokumente',       items => items.filter(i => i.projektId === id || tsIds.includes(i.entityId))),
            tryList('ts_stunden',      items => items.filter(i => i.projektId === id)),
            tryList('ts_materialkosten', items => items.filter(i => i.projektId === id)),
        ]);

        const posIds = positionen.map((p: any) => p.id);
        const unterpositionen = await tryList('unterpositionen', items => items.filter(i => posIds.includes(i.positionId)));

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
        let driveFolderId: string | null = project.driveFolderId || null;
        let driveFilesTotal = 0;
        let driveFilesOk = 0;
        let driveNote = '';

        // Fallback: if driveFolderId not stored in DB, search Drive by project number
        if (!driveFolderId && project.projektnummer) {
            try {
                const { findProjectFolderByName } = await import('@/lib/services/googleDriveService');
                driveFolderId = await findProjectFolderByName(project.projektnummer, project.projektname);
                if (driveFolderId) {
                    console.log(`[Archive] Found Drive folder by name search: ${driveFolderId}`);
                    // Save it back to DB for future operations
                    await DatabaseService.upsert('projekte', { ...project, driveFolderId });
                }
            } catch (e: any) {
                console.warn('[Archive] Could not search Drive by name:', e.message);
            }
        }

        if (driveFolderId) {
            try {
                console.log(`[Archive] Downloading Drive folder: ${driveFolderId}`);
                const driveFiles = await listFolderFilesRecursive(driveFolderId, 'archivos_drive');
                driveFilesTotal = driveFiles.length;
                const driveFolder = zip.folder('archivos_drive');

                const BATCH_SIZE = 5;
                for (let i = 0; i < driveFiles.length; i += BATCH_SIZE) {
                    const batch = driveFiles.slice(i, i + BATCH_SIZE);
                    await Promise.all(
                        batch.map(async (file) => {
                            try {
                                const buffer = await downloadFileFromDriveAsBuffer(file.id, file.mimeType);
                                const relativePath = file.path.startsWith('archivos_drive/')
                                    ? file.path.slice('archivos_drive/'.length)
                                    : file.path;
                                driveFolder?.file(relativePath, buffer);
                                driveFilesOk++;
                            } catch (e) {
                                console.warn(`[Archive] Could not download ${file.name}:`, e);
                                driveFolder?.file(`ERROR_${file.name}.txt`, `Could not download: ${String(e)}`);
                            }
                        })
                    );
                }
                driveNote = `Drive: ${driveFilesOk}/${driveFilesTotal} Dateien heruntergeladen. Folder ID: ${driveFolderId}`;
                console.log(`[Archive] ${driveNote}`);
            } catch (driveErr) {
                driveNote = `Drive-Fehler: ${String(driveErr)}`;
                console.warn('[Archive] Drive download failed:', driveErr);
                zip.file('DRIVE_ERROR.txt', driveNote);
            }
        } else {
            driveNote = 'Kein Google Drive-Ordner für dieses Projekt gefunden (driveFolderId fehlt und Suche ergab kein Ergebnis).';
            console.warn('[Archive]', driveNote);
            zip.file('DRIVE_HINWEIS.txt', driveNote);
        }

        // Summary file always added
        zip.file('ARCHIVIERUNGS_INFO.txt', [
            `Archiviert am: ${new Date().toLocaleString('de-CH')}`,
            `Projekt: ${project.projektname} (${project.projektnummer})`,
            `Exportiert von: ${user.email || user.id}`,
            `DB-Daten: Projekt, ${teilsysteme.length} TS, ${positionen.length} Pos, ${unterpositionen.length} UnterPos`,
            driveNote,
        ].join('\n'));


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
        const archivesFolderId = await ensureArchivesFolder('ProjektBackup');
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
