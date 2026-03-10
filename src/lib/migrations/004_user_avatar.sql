-- ================================================================
-- Migration: User Profile Avatar
-- Adds profileImageUrl column to users table
-- Creates avatars storage bucket with public access policy
-- ================================================================

-- 1. Add profileImageUrl column to users table (safe, idempotent)
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT DEFAULT NULL;

-- 2. Create the avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policy: allow public read of own avatar
CREATE POLICY IF NOT EXISTS "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Storage policy: allow service_role to upload/delete
-- (API uses service_role key via supabaseAdmin — bypasses RLS)
-- No additional policy needed for service_role writes.
