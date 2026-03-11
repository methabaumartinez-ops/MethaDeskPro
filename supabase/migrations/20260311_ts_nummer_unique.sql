-- ============================================================
-- Migration: 20260311_ts_nummer_unique.sql
-- Description: Enforces project-scoped unique constraints on Teilsystem IDs.
-- Fixes BUG-08 (TS-XXX Numbering Race Condition).
-- ============================================================

-- Create a unique index on 'projektId' and 'teilsystemNummer'.
-- This prevents concurrent requests from creating duplicate TS-001 numbers
-- within the same project.

CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_nummer_projekt 
ON teilsysteme("projektId", "teilsystemNummer")
WHERE "deletedAt" IS NULL; -- Allow duplicate numbers if one is soft-deleted, although MethaDeskPro typically hard-deletes or archives.
