import { NextResponse } from 'next/server';
import { deleteFileFromDrive } from '@/lib/services/googleDriveService';
import { extractDriveFileId } from '@/lib/services/server/deleteHelpers';
import { requireAuth } from '@/lib/auth/serverSession';

export async function POST(req: Request) {
    try {
        await requireAuth(); // Solo usuarios autenticados pueden borrar material
        
        const body = await req.json();
        const { url } = body;
        
        if (!url) {
            return NextResponse.json({ error: 'URL required' }, { status: 400 });
        }
        
        const fileId = extractDriveFileId(url);
        if (!fileId) {
            return NextResponse.json({ error: 'Invalid Drive URL' }, { status: 400 });
        }
        
        await deleteFileFromDrive(fileId);
        return NextResponse.json({ success: true, message: 'File deleted from Drive' });
    } catch (error: any) {
        console.error('[API Drive Delete] Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
