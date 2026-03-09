-- ============================================================
-- Migration: DB-backed Abteilung Page & Table Permissions
-- Replaces localStorage-based permission storage.
-- Run in Supabase SQL editor or apply via migration script.
-- ============================================================

-- 1) Page permissions per Abteilung
--    Stores which sidebar pages each Abteilung can access.
--    Mirrors DEFAULT_ABT_PERMISSIONS from abteilungPagePermissions.ts
CREATE TABLE IF NOT EXISTS abt_page_permissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abteilung_id TEXT NOT NULL,
    page_key     TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(abteilung_id, page_key)
);
CREATE INDEX IF NOT EXISTS idx_abt_page_perms_abt ON abt_page_permissions(abteilung_id);

-- 2) Table permissions per Abteilung
--    Stores read/export/edit/delete flags per table per Abteilung.
CREATE TABLE IF NOT EXISTS abt_table_permissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abteilung_id TEXT NOT NULL,
    table_id     TEXT NOT NULL,
    can_read     BOOLEAN NOT NULL DEFAULT false,
    can_export   BOOLEAN NOT NULL DEFAULT false,
    can_edit     BOOLEAN NOT NULL DEFAULT false,
    can_delete   BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE(abteilung_id, table_id)
);
CREATE INDEX IF NOT EXISTS idx_abt_table_perms_abt ON abt_table_permissions(abteilung_id);

-- 3) updated_at triggers
DO $$
BEGIN
    -- Page permissions trigger
    EXECUTE 'DROP TRIGGER IF EXISTS set_updated_at ON abt_page_permissions';
    EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON abt_page_permissions
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    -- Table permissions trigger
    EXECUTE 'DROP TRIGGER IF EXISTS set_updated_at ON abt_table_permissions';
    EXECUTE 'CREATE TRIGGER set_updated_at BEFORE UPDATE ON abt_table_permissions
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
END $$;

-- ============================================================
-- 4) Seed default page permissions
--    Matches DEFAULT_ABT_PERMISSIONS in abteilungPagePermissions.ts
-- ============================================================
INSERT INTO abt_page_permissions (abteilung_id, page_key) VALUES
  ('planung',        'dashboard-builder'),
  ('planung',        'my-dashboard'),
  ('planung',        'bauleitung'),
  ('planung',        'analyse'),
  ('planung',        'produktion'),
  ('planung',        'planung'),
  ('planung',        'tabellen'),
  ('einkauf',        'dashboard-builder'),
  ('einkauf',        'my-dashboard'),
  ('einkauf',        'einkauf'),
  ('einkauf',        'tabellen'),
  ('avor',           'dashboard-builder'),
  ('avor',           'my-dashboard'),
  ('avor',           'avor'),
  ('avor',           'tabellen'),
  ('schlosserei',    'dashboard-builder'),
  ('schlosserei',    'my-dashboard'),
  ('schlosserei',    'produktion'),
  ('schlosserei',    'schlosserei'),
  ('schlosserei',    'tabellen'),
  ('blech',          'dashboard-builder'),
  ('blech',          'my-dashboard'),
  ('blech',          'produktion'),
  ('blech',          'blech'),
  ('blech',          'tabellen'),
  ('werkhof',        'dashboard-builder'),
  ('werkhof',        'my-dashboard'),
  ('werkhof',        'werkhof-bestellungen'),
  ('werkhof',        'lagerort'),
  ('werkhof',        'qr-scan'),
  ('montage',        'dashboard-builder'),
  ('montage',        'my-dashboard'),
  ('montage',        'ausfuehrung'),
  ('montage',        'tabellen'),
  ('bau',            'dashboard-builder'),
  ('bau',            'my-dashboard'),
  ('bau',            'bauleitung'),
  ('bau',            'ausfuehrung'),
  ('bau',            'tabellen'),
  ('subunternehmer', 'dashboard-builder'),
  ('subunternehmer', 'my-dashboard'),
  ('subunternehmer', 'tabellen'),
  ('unternehmer',    'dashboard-builder'),
  ('unternehmer',    'my-dashboard'),
  ('unternehmer',    'tabellen')
ON CONFLICT (abteilung_id, page_key) DO NOTHING;
