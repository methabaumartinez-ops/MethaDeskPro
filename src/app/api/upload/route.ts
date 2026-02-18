
import { NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/services/googleDriveService';
import { ProjectService } from '@/lib/services/projectService';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const projektId = formData.get('projektId') as string | null;
        const type = formData.get('type') as string || 'Dokumente';

        if (!file || !projektId) {
            return NextResponse.json({ error: 'File and ProjektID required' }, { status: 400 });
        }

        const project = await ProjectService.getProjektById(projektId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.driveFolderId) {
            // Try to find/create folder if missing (should be handled by service but good fallback)
            // For now error if no folder, or we could call ensureProjectFolder here too
            return NextResponse.json({ error: 'Project has no Drive folder assigned' }, { status: 400 });
        }

        // Determine subfolder based on type
        // 'image' -> '03_Fotos'
        // 'ifc' -> '04_IFC'
        // default -> '01_Dokumente'
        let subfolder = '01_Dokumente';
        if (type === 'image') subfolder = '03_Fotos';
        if (type === 'ifc') subfolder = '04_IFC';
        if (type === 'plan') subfolder = '02_Pläne';

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await uploadFileToDrive(
            buffer,
            file.name,
            file.type,
            project.driveFolderId,
            subfolder
        );

        if (!result) throw new Error('Upload failed');

        // Return the usable link (e.g. webContentLink or thumbnailLink for images)
        // For images we might want webContentLink or thumbnailLink
        // user requested "almacenamiento de imagenes", so likely for display

        // Note: Google Drive images might not display directly in <img> tags without public access or proxy
        // But let's return the link provided by API

        return NextResponse.json({
            success: true,
            id: result.id,
            url: result.webContentLink || result.webViewLink
        });

    } catch (error) {
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
