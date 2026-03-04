import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.ifc', '.zip', '.docx', '.xlsx'];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const projektId = formData.get('projektId') as string | null;
        const type = formData.get('type') as string || 'Dokumente';

        if (!file || !projektId) {
            return NextResponse.json({ error: 'File and ProjektID required' }, { status: 400 });
        }

        // 1. RBAC Check
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
        }
        const user = await getUserFromToken(token);
        if (!user || (user.role !== 'admin' && user.role !== 'projektleiter')) {
            return NextResponse.json({ error: 'Keine Berechtigung zum Hochladen von Dateien.' }, { status: 403 });
        }

        // 2. File Size Validation
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Datei ist zu gross (max. 10MB).' }, { status: 400 });
        }

        // 3. Extension Validation
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return NextResponse.json({ error: 'Dateityp nicht erlaubt.' }, { status: 400 });
        }

        const { DatabaseService } = await import('@/lib/services/db');
        const project = await DatabaseService.get<any>('projekte', projektId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.driveFolderId) {
            // Try to find/create folder if missing (self-healing)
            console.log('Project has no Drive folder assigned, attempting to create one...');
            const { ensureProjectFolder } = await import('@/lib/services/googleDriveService');
            const folderId = await ensureProjectFolder({
                projektnummer: project.projektnummer,
                projektname: project.projektname
            });

            if (folderId) {
                // Update project with new folder ID
                project.driveFolderId = folderId;
                await DatabaseService.upsert('projekte', { ...project, driveFolderId: folderId });
            } else {
                return NextResponse.json({ error: 'Failed to create Drive folder for project' }, { status: 500 });
            }
        }

        const newName = formData.get('newName') as string | null;

        // Determine subfolder based on type
        // 'image' -> '03_Fotos'
        // 'ifc' -> '04_IFC'
        // default -> '01_Dokumente'
        let subfolder = '01_Dokumente';
        if (type === 'image') subfolder = '03_Fotos';
        if (type === 'ifc') subfolder = '04_IFC';
        if (type === 'plan') subfolder = '02_Pläne';
        if (type === 'lagerort') subfolder = 'lagerorts';

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Fallback for IFC mime type if browser doesn't detect it
        let mimeType = file.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
            if (file.name.toLowerCase().endsWith('.ifc')) {
                mimeType = 'application/x-step'; // Standard IFC mime type or similar
            }
        }

        let finalFileName = file.name;
        if (newName) {
            // Keep the original extension
            const ext = file.name.substring(file.name.lastIndexOf('.'));
            finalFileName = `${newName}${ext}`;
        }

        const { uploadFileToDrive } = await import('@/lib/services/googleDriveService');

        console.log(`[Upload] Starting: ${finalFileName} (${buffer.length} bytes), Type: ${mimeType}, Project: ${projektId}`);

        const result = await uploadFileToDrive(
            buffer,
            finalFileName,
            mimeType,
            project.driveFolderId!,
            subfolder
        );

        if (!result) {
            throw new Error('Upload failed: Google Drive service returned no result');
        }

        // Return the usable link (e.g. webContentLink or thumbnailLink for images)
        // For images we might want webContentLink or thumbnailLink
        // Benutzer hat "Bildspeicherung" angefordert, wahrscheinlich für Anzeige

        // Note: Google Drive images might not display directly in <img> tags without public access or proxy
        // But let's return the link provided by API

        return NextResponse.json({
            success: true,
            id: result.id,
            url: result.directUrl || result.webContentLink || result.webViewLink
        });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            error: `Upload failed: ${errorMessage}`,
            details: error.response?.data || null
        }, { status: 500 });
    }
}
