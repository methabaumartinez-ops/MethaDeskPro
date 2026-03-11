-- ============================================================
-- Migration: 20260311_teilsysteme_alignment.sql
-- Description: Align teilsysteme schema with TypeScript domain model fields that currently depend on auto-heal.
-- ============================================================

ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "eroeffnetAm" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "eroeffnetDurch" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "beschreibung" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "ifcUrl" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "ifcFileName" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "ifcChecksum" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "ifcSchema" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "ifcUnits" JSONB;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "lagerortId" UUID;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "subunternehmerId" UUID;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "wemaLink" TEXT;
ALTER TABLE teilsysteme ADD COLUMN IF NOT EXISTS "montageterminProvisional" BOOLEAN DEFAULT FALSE;

-- Ensure an index on ifcChecksum exists for faster lookups during IFC duplicate matching
CREATE INDEX IF NOT EXISTS idx_teilsysteme_ifcchecksum ON teilsysteme("ifcChecksum");
