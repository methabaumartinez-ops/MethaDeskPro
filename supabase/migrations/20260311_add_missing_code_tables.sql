-- ============================================================
-- Migration: 20260311_add_missing_code_tables.sql
-- Description: Create critical missing tables (ts_stunden, ts_materialkosten, ifc_import_logs) that are fully formed in TypeScript logic.
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: ts_stunden
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ts_stunden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teilsystemId" UUID REFERENCES teilsysteme(id) ON DELETE CASCADE,
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    "mitarbeiterId" UUID REFERENCES mitarbeiter(id) ON DELETE SET NULL,
    datum TEXT,
    stunden NUMERIC,
    stundensatz NUMERIC,
    gesamtpreis NUMERIC,
    abteilung TEXT,
    taetigkeit TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apply updated_at trigger for ts_stunden
DROP TRIGGER IF EXISTS set_updated_at ON ts_stunden;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ts_stunden FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- TABLE: ts_materialkosten
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ts_materialkosten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teilsystemId" UUID REFERENCES teilsysteme(id) ON DELETE CASCADE,
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    "lieferantId" UUID REFERENCES lieferanten(id) ON DELETE SET NULL,
    bezeichnung TEXT,
    menge NUMERIC,
    einheit TEXT,
    einzelpreis NUMERIC,
    gesamtpreis NUMERIC,
    bestelldatum TEXT,
    lieferdatum TEXT,
    rechnungsnummer TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apply updated_at trigger for ts_materialkosten
DROP TRIGGER IF EXISTS set_updated_at ON ts_materialkosten;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ts_materialkosten FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- TABLE: ifc_import_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ifc_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teilsystemId" UUID REFERENCES teilsysteme(id) ON DELETE CASCADE,
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    "fileName" TEXT,
    "checksum" TEXT,
    "importedAt" TEXT,
    "importedBy" TEXT,
    "elementsTotal" NUMERIC,
    "positionsCreated" NUMERIC,
    "unterpositionsCreated" NUMERIC,
    "orphansCount" NUMERIC,
    "fallbackUsed" BOOLEAN DEFAULT FALSE,
    "warnings" JSONB DEFAULT '[]'::jsonb,
    "missingFields" JSONB DEFAULT '[]'::jsonb,
    "debugPaths" JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs usually don't need update triggers since they are insert-only logic.
