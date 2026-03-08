import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { requireAuth } from '@/lib/helpers/requireAuth';

/**
 * POST /api/projekte/[id]/export-delete
 *
 * Full archive flow:
 *  1. Fetch all project data from DB
 *  2. Download all files from the project's Google Drive folder
 *  3. Package everything (JSON manifest + files) into a ZIP file using JSZip
 *  4. Upload the ZIP to the _MethaDeskArchives folder in Drive
 *  5. Verify the file actually exists in Drive (by querying the file ID)
 *  6. Delete DB records (positionen, teilsysteme, ausfuehrung, projekt)
 *  7. Delete the project Drive folder and all its contents
 *  8. Return the archive ZIP download to the admin
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // SECURITY: Only admins and superadmins can export+delete projects.
    const { error } = await requireAuth(['admin', 'superadmin']);
    if (error) return error;

    try {
        const { id } = await params;

        // ─── 1. Collect ALL project data from DB ──────────────────────────
        const projekt = await DatabaseService.get<any>('projekte', id);
        if (!projekt) {
            return NextResponse.json({ error: 'Projekt nicht gefunden.' }, { status: 404 });
        }

        let teilsysteme: any[] = [];
        try { teilsysteme = await DatabaseService.list('teilsysteme', { must: [{ key: 'projektId', match: { value: id } }] }); }
        catch { console.warn('[ExportDelete] teilsysteme empty'); }

        let positionen: any[] = [];
        try { positionen = await DatabaseService.list('positionen', { must: [{ key: 'projektId', match: { value: id } }] }); }
        catch { console.warn('[ExportDelete] positionen empty'); }

        let ausfuehrungen: any[] = [];
        try { ausfuehrungen = await DatabaseService.list('ausfuehrung', { must: [{ key: 'projektId', match: { value: id } }] }); }
        catch { console.warn('[ExportDelete] ausfuehrungen empty'); }

        const exportManifest = {
            _exportInfo: {
                exportedAt: new Date().toISOString(),
                projektId: id,
                projektName: projekt.projektname,
                projektnummer: projekt.projektnummer,
                version: 'METHADesk Pro v1.0.0',
                archivedBy: 'system',
            },
            projekt,
            teilsysteme,
            positionen,
            ausfuehrungen,
        };

        // ─── 2. Download all files from Google Drive ───────────────────────
        let JSZip: any;
        try {
            JSZip = (await import('jszip')).default;
        } catch (e) {
            throw new Error('jszip module not found. Run: npm install jszip');
        }

        const zip = new JSZip();

        // Add JSON manifest to root of zip
        zip.file('projekt_daten.json', JSON.stringify(exportManifest, null, 2));

        const driveFolderId = (projekt as any).driveFolderId;
        let driveFilesDownloaded = 0;
        let driveError: string | null = null;

        if (driveFolderId && process.env.GOOGLE_CLIENT_ID) {
            try {
                const { listFolderFilesRecursive, downloadFileFromDriveAsBuffer } = await import('@/lib/services/googleDriveService');

                console.log(`[ExportDelete] Downloading files from Drive folder: ${driveFolderId}`);
                const files = await listFolderFilesRecursive(driveFolderId, 'drive_files');

                const driveFolder = zip.folder('drive_files');

                for (const file of files) {
                    try {
                        const buffer = await downloadFileFromDriveAsBuffer(file.id, file.mimeType);
                        // Use relative path within zip
                        zip.file(file.path, buffer);
                        driveFilesDownloaded++;
                    } catch (dlErr: any) {
                        console.warn(`[ExportDelete] Could not download ${file.name}: ${dlErr.message}`);
                        // Add a placeholder with the error info
                        zip.file(`${file.path}.download_failed.txt`, `Could not download: ${dlErr.message}`);
                    }
                }

                console.log(`[ExportDelete] Downloaded ${driveFilesDownloaded}/${files.length} files from Drive`);
            } catch (driveLoadErr: any) {
                driveError = driveLoadErr.message;
                console.error('[ExportDelete] Drive download error:', driveError);
                // Add error note to zip but continue
                zip.file('DRIVE_DOWNLOAD_ERROR.txt', `Could not download Drive files: ${driveError}`);
            }
        } else {
            zip.file('DRIVE_NOTE.txt', driveFolderId
                ? 'Google Drive integration not configured.'
                : 'This project had no Drive folder assigned.');
        }

        // ─── 3. Generate ZIP buffer ────────────────────────────────────────
        console.log('[ExportDelete] Generating ZIP...');
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        const zipFileName = `archiv_${(projekt.projektnummer || id).replace(/[^a-zA-Z0-9-_]/g, '_')}_${new Date().toISOString().slice(0, 10)}.zip`;

        // ─── 4. Upload ZIP to _MethaDeskArchives folder in Drive ──────────
        let archiveFileId: string | null = null;

        if (process.env.GOOGLE_CLIENT_ID) {
            try {
                const { ensureArchivesFolder, uploadFileToDrive } = await import('@/lib/services/googleDriveService');

                console.log('[ExportDelete] Ensuring MethaArchives/ProjekteGeloescht folder...');
                const archiveFolderId = await ensureArchivesFolder('ProjekteGeloescht');

                console.log('[ExportDelete] Uploading ZIP to Drive archive folder...');
                const uploaded = await uploadFileToDrive(
                    zipBuffer,
                    zipFileName,
                    'application/zip',
                    archiveFolderId,
                    undefined // no subfolder
                );
                archiveFileId = uploaded?.id ?? null;

                if (!archiveFileId) {
                    throw new Error('Drive upload returned no file ID');
                }

                console.log(`[ExportDelete] ZIP uploaded to Drive. File ID: ${archiveFileId}`);
            } catch (uploadErr: any) {
                console.error('[ExportDelete] Failed to upload archive to Drive:', uploadErr.message);
                throw new Error(`Archiv-Upload fehlgeschlagen: ${uploadErr.message}. Löschvorgang abgebrochen.`);
            }
        } else {
            console.warn('[ExportDelete] Drive not configured. Skipping archive upload. Proceeding with local export only.');
        }

        // ─── 5. Verify the file exists in Drive ───────────────────────────
        if (archiveFileId && process.env.GOOGLE_CLIENT_ID) {
            try {
                const { google } = await import('googleapis');

                const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
                const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
                const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim();
                const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

                const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
                oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
                const drive = google.drive({ version: 'v3', auth: oauth2Client });

                const verification = await (drive.files as any).get({
                    fileId: archiveFileId,
                    fields: 'id, name, size',
                });

                if (!verification.data?.id) {
                    throw new Error('Datei nach Upload nicht in Drive gefunden.');
                }

                console.log(`[ExportDelete] ✅ Archive verified in Drive: ${verification.data.name} (${verification.data.size} bytes)`);
            } catch (verifyErr: any) {
                console.error('[ExportDelete] Verification failed:', verifyErr.message);
                throw new Error(`Archiv-Verifikation fehlgeschlagen: ${verifyErr.message}. Löschvorgang abgebrochen.`);
            }
        }

        // ─── 6. Delete DB records ──────────────────────────────────────────
        console.log('[ExportDelete] Deleting DB records...');

        for (const pos of positionen) {
            try { await DatabaseService.delete('positionen', pos.id); } catch { /* ignore */ }
        }
        for (const ts of teilsysteme) {
            try { await DatabaseService.delete('teilsysteme', ts.id); } catch { /* ignore */ }
        }
        for (const a of ausfuehrungen) {
            try { await DatabaseService.delete('ausfuehrung', a.id); } catch { /* ignore */ }
        }
        await DatabaseService.delete('projekte', id);

        console.log('[ExportDelete] DB records deleted.');

        // ─── 7. Delete Drive folder ────────────────────────────────────────
        if (driveFolderId && process.env.GOOGLE_CLIENT_ID) {
            try {
                const { deleteFileFromDrive } = await import('@/lib/services/googleDriveService');
                await deleteFileFromDrive(driveFolderId);
                console.log(`[ExportDelete] ✅ Drive folder deleted: ${driveFolderId}`);
            } catch (delDriveErr: any) {
                console.error('[ExportDelete] Failed to delete Drive folder:', delDriveErr.message);
                // Not fatal — DB is already deleted. Log and continue.
            }
        }

        // ─── 8. Return ZIP to client for download ─────────────────────────
        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFileName}"`,
                'X-Archive-Drive-File-Id': archiveFileId || 'not-uploaded',
                'X-Drive-Files-Downloaded': String(driveFilesDownloaded),
            },
        });

    } catch (error: any) {
        console.error('[ExportDelete] Critical error:', error);
        return NextResponse.json(
            { error: `${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
