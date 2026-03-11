-- ============================================================
-- Migration: 20260311_critical_fks.sql
-- Description: Add missing Foreign Key constraints. Specifically on unterpositionen to teilsysteme.
-- ============================================================

-- 1. Pre-check: Delete orphaned unterpositionen (pointing to non-existent teilsysteme)
-- This ensures the upcoming constraint application won't fail due to existing bad data.
DELETE FROM unterpositionen
WHERE "teilsystemId" IS NOT NULL
AND "teilsystemId" NOT IN (SELECT id FROM teilsysteme);

-- 2. Add foreign key constraint to unterpositionen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_untpos_teilsystem' AND conrelid = 'unterpositionen'::regclass) THEN
        ALTER TABLE unterpositionen
        ADD CONSTRAINT fk_untpos_teilsystem
        FOREIGN KEY ("teilsystemId") REFERENCES teilsysteme(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Add teilsystemId column and constraint on material table (if not exists)
ALTER TABLE material ADD COLUMN IF NOT EXISTS "teilsystemId" UUID;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_teilsystem' AND conrelid = 'material'::regclass) THEN
        ALTER TABLE material
        ADD CONSTRAINT fk_material_teilsystem
        FOREIGN KEY ("teilsystemId") REFERENCES teilsysteme(id) ON DELETE SET NULL;
    END IF;
END $$;
