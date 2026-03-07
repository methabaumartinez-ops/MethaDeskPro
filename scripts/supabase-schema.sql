-- ============================================================
-- MethaDeskPro Supabase Schema
-- Full migration from Qdrant document store to relational model
-- ============================================================

-- 1) PROJEKTE
CREATE TABLE IF NOT EXISTS projekte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projektname TEXT,
    projektnummer TEXT,
    strasse TEXT,
    plz TEXT,
    ort TEXT,
    bauleiter TEXT,
    projektleiter TEXT,
    polier TEXT,
    status TEXT DEFAULT 'aktiv',
    description TEXT,
    image TEXT,
    "deletedAt" TEXT,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) TEILSYSTEME
CREATE TABLE IF NOT EXISTS teilsysteme (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    name TEXT,
    "teilsystemNummer" TEXT,
    ks TEXT,
    status TEXT DEFAULT 'offen',
    "planStatus" TEXT DEFAULT 'offen',
    abteilung TEXT DEFAULT 'AVOR',
    verantwortlich TEXT,
    lieferfrist TEXT,
    montagetermin TEXT,
    "abgabePlaner" TEXT,
    bemerkung TEXT,
    "montageterminSetByBauleiter" BOOLEAN DEFAULT FALSE,
    "unternehmer" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teilsysteme_projekt ON teilsysteme("projektId");
CREATE INDEX IF NOT EXISTS idx_teilsysteme_status ON teilsysteme(status);
CREATE INDEX IF NOT EXISTS idx_teilsysteme_abteilung ON teilsysteme(abteilung);

-- 3) POSITIONEN
CREATE TABLE IF NOT EXISTS positionen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teilsystemId" UUID REFERENCES teilsysteme(id) ON DELETE CASCADE,
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    name TEXT,
    nummer TEXT,
    status TEXT DEFAULT 'offen',
    "planStatus" TEXT DEFAULT 'offen',
    abteilung TEXT,
    menge NUMERIC,
    einheit TEXT,
    material TEXT,
    lieferant TEXT,
    preis NUMERIC,
    lieferfrist TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_positionen_teilsystem ON positionen("teilsystemId");
CREATE INDEX IF NOT EXISTS idx_positionen_projekt ON positionen("projektId");

-- 4) UNTERPOSITIONEN
CREATE TABLE IF NOT EXISTS unterpositionen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "positionId" UUID REFERENCES positionen(id) ON DELETE CASCADE,
    "teilsystemId" UUID,
    "projektId" UUID REFERENCES projekte(id) ON DELETE CASCADE,
    name TEXT,
    nummer TEXT,
    status TEXT DEFAULT 'offen',
    "planStatus" TEXT DEFAULT 'offen',
    abteilung TEXT,
    menge NUMERIC,
    einheit TEXT,
    material TEXT,
    lieferant TEXT,
    preis NUMERIC,
    lieferfrist TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unterpositionen_position ON unterpositionen("positionId");

-- 5) MITARBEITER
CREATE TABLE IF NOT EXISTS mitarbeiter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vorname TEXT,
    nachname TEXT,
    email TEXT,
    telefon TEXT,
    rolle TEXT,
    abteilung TEXT,
    aktiv BOOLEAN DEFAULT TRUE,
    "isGlobal" BOOLEAN DEFAULT FALSE,
    "projektId" UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) WORKERS
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vorname TEXT,
    nachname TEXT,
    rolle TEXT,
    abteilung TEXT,
    aktiv BOOLEAN DEFAULT TRUE,
    "isGlobal" BOOLEAN DEFAULT FALSE,
    "projektId" UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7) LIEFERANTEN
CREATE TABLE IF NOT EXISTS lieferanten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    kontakt TEXT,
    email TEXT,
    telefon TEXT,
    adresse TEXT,
    website TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8) SUBUNTERNEHMER
CREATE TABLE IF NOT EXISTS subunternehmer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    kontakt TEXT,
    email TEXT,
    telefon TEXT,
    adresse TEXT,
    fachgebiet TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9) MATERIAL
CREATE TABLE IF NOT EXISTS material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    bezeichnung TEXT,
    name TEXT,
    menge NUMERIC,
    einheit TEXT,
    preis NUMERIC,
    lieferant TEXT,
    liefertermin TEXT,
    status TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10) LAGERORTE
CREATE TABLE IF NOT EXISTS lagerorte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    name TEXT,
    beschreibung TEXT,
    typ TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11) LAGERBEWEGUNGEN
CREATE TABLE IF NOT EXISTS lagerbewegungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lagerortId" UUID,
    "projektId" UUID,
    typ TEXT,
    bezeichnung TEXT,
    menge NUMERIC,
    einheit TEXT,
    datum TEXT,
    benutzer TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12) FAHRZEUGE
CREATE TABLE IF NOT EXISTS fahrzeuge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bezeichnung TEXT,
    name TEXT,
    typ TEXT,
    status TEXT DEFAULT 'Verfuegbar',
    standort TEXT,
    "geprueftBis" TEXT,
    kennzeichen TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13) FAHRZEUG_RESERVIERUNGEN
CREATE TABLE IF NOT EXISTS fahrzeug_reservierungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fahrzeugId" UUID,
    "projektId" UUID,
    "mitarbeiterId" TEXT,
    "startDatum" TEXT,
    "endDatum" TEXT,
    zweck TEXT,
    status TEXT DEFAULT 'aktiv',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14) RESERVIERUNGEN
CREATE TABLE IF NOT EXISTS reservierungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    "fahrzeugId" UUID,
    datum TEXT,
    zweck TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15) BESTELLUNGEN
CREATE TABLE IF NOT EXISTS bestellungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    status TEXT DEFAULT 'offen',
    "bestelldatum" TEXT,
    "bestelltVon" TEXT,
    "containerBez" TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16) KOSTEN
CREATE TABLE IF NOT EXISTS kosten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    bezeichnung TEXT,
    betrag NUMERIC,
    kategorie TEXT,
    datum TEXT,
    bemerkung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17) TEAMS
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    "projektId" UUID,
    beschreibung TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18) TEAM_MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teamId" UUID,
    "workerId" UUID,
    rolle TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 19) TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "teamId" UUID,
    "projektId" UUID,
    "teilsystemId" UUID,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'Offen',
    priority TEXT DEFAULT 'Normal',
    "assignedTo" TEXT,
    "dueDate" TEXT,
    "sourceType" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20) SUBTASKS
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "taskId" UUID,
    title TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21) AUSFUEHRUNG TASKS
CREATE TABLE IF NOT EXISTS ausfuehrung_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "projektId" UUID,
    "teilsystemId" UUID,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'Offen',
    priority TEXT DEFAULT 'Normal',
    "assignedTo" TEXT,
    "dueDate" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22) AUSFUEHRUNG SUBTASKS
CREATE TABLE IF NOT EXISTS ausfuehrung_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "taskId" UUID,
    title TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 23) AUSFUEHRUNG RESOURCES
CREATE TABLE IF NOT EXISTS ausfuehrung_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    typ TEXT,
    einheit TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24) AUSFUEHRUNG TASK RESOURCES
CREATE TABLE IF NOT EXISTS ausfuehrung_task_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "taskId" UUID,
    "resourceId" UUID,
    menge NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25) USERS (App Users — custom auth, not Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    email TEXT,
    "passwordHash" TEXT,
    role TEXT DEFAULT 'viewer',
    name TEXT,
    department TEXT,
    aktiv BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 26) DASHBOARD REQUESTS
CREATE TABLE IF NOT EXISTS dashboard_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID,
    "projektId" UUID,
    action TEXT,
    status TEXT DEFAULT 'pending',
    payload JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 27) CONVERSATION LOGS
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "requestId" UUID,
    role TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 28) DOKUMENTE
CREATE TABLE IF NOT EXISTS dokumente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityId" UUID,
    "entityType" TEXT,
    "projektId" UUID,
    name TEXT,
    url TEXT,
    typ TEXT,
    size NUMERIC,
    "uploadedBy" TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokumente_entity ON dokumente("entityId", "entityType");

-- 29) CHANGELOG
CREATE TABLE IF NOT EXISTS changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "entityId" UUID,
    "entityType" TEXT,
    "projektId" UUID,
    field TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_changelog_entity ON changelog("entityId", "entityType");

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all main tables
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'projekte','teilsysteme','positionen','unterpositionen',
            'mitarbeiter','workers','lieferanten','subunternehmer',
            'material','lagerorte','lagerbewegungen','fahrzeuge',
            'fahrzeug_reservierungen','reservierungen','bestellungen',
            'kosten','teams','team_members','tasks','subtasks',
            'ausfuehrung_tasks','ausfuehrung_subtasks',
            'ausfuehrung_resources','ausfuehrung_task_resources',
            'users','dashboard_requests','dokumente'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            tbl
        );
    END LOOP;
END $$;
