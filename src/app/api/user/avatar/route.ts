import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { DatabaseService } from '@/lib/services/db';

const BUCKET = 'avatars';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * POST /api/user/avatar
 * Uploads a profile photo for the authenticated user.
 * Body: multipart/form-data with field "file"
 * Returns: { profileImageUrl: string }
 */
export async function POST(req: NextRequest) {
    const { user, error } = await requireAuth();
    if (error) return error;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Keine Datei gefunden.' }, { status: 400 });
        }

        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Nur JPG, PNG und WebP sind erlaubt.' },
                { status: 400 }
            );
        }

        // Validate size
        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json(
                { error: 'Datei darf maximal 5 MB gross sein.' },
                { status: 400 }
            );
        }

        const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
        const storagePath = `${user!.id}.${ext}`;

        // Convert to Buffer for Supabase upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload (upsert replaces existing)
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('[avatar/upload] Storage error:', uploadError);
            return NextResponse.json(
                { error: 'Fehler beim Hochladen: ' + uploadError.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        const profileImageUrl = urlData.publicUrl;

        // Update user record
        const existing = await DatabaseService.get<any>('users', user!.id);
        if (existing) {
            await DatabaseService.upsert('users', {
                ...existing,
                profileImageUrl,
            });
        }

        return NextResponse.json({ profileImageUrl });
    } catch (err) {
        console.error('[api/user/avatar] POST error:', err);
        return NextResponse.json(
            { error: 'Interner Fehler beim Avatar-Upload.' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/user/avatar
 * Removes the profile photo for the authenticated user.
 */
export async function DELETE() {
    const { user, error } = await requireAuth();
    if (error) return error;

    try {
        // Try removing both jpg and png variants
        const pathsToTry = [
            `${user!.id}.jpg`,
            `${user!.id}.png`,
            `${user!.id}.webp`,
        ];

        await supabaseAdmin.storage.from(BUCKET).remove(pathsToTry);

        // Clear the profileImageUrl on the user record
        const existing = await DatabaseService.get<any>('users', user!.id);
        if (existing) {
            await DatabaseService.upsert('users', {
                ...existing,
                profileImageUrl: null,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[api/user/avatar] DELETE error:', err);
        return NextResponse.json({ error: 'Fehler beim Löschen des Avatars.' }, { status: 500 });
    }
}
