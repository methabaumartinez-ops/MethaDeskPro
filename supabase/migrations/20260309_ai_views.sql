-- ============================================================
-- Migration: 20260309_ai_views.sql
-- Curated AI-context views for METHAbot grounding
--
-- These read-only views expose only semantically useful fields.
-- Sensitive columns (email, telefon, passwordHash, JSONB blobs)
-- are intentionally excluded.
-- Project scoping is enforced wherever a projektId column exists.
-- Cost fields (preis, betrag) are included in views but the
-- application layer (AIService) enforces RBAC before injecting
-- them into the LLM prompt.
-- ============================================================

-- ---- 1. v_ai_projekt_kontext --------------------------------
-- Single-row summary per active project.
-- Used as top-level grounding for the project header section.

CREATE OR REPLACE VIEW v_ai_projekt_kontext AS
SELECT
    p.id                    AS projekt_id,
    p.projektname,
    p.projektnummer,
    TRIM(COALESCE(p.plz,'') || ' ' || COALESCE(p.ort,'')) AS ort,
    p.status                AS projekt_status,
    p.bauleiter,
    p.projektleiter,
    p.polier,
    p.description,
    COUNT(DISTINCT ts.id)   AS ts_anzahl,
    COUNT(DISTINCT ts.id)   FILTER (WHERE ts.status IN ('fertig','Erledigt','verbaut'))
                            AS ts_fertig,
    MIN(ts.montagetermin)   AS naechster_montagetermin,
    MAX(ts.montagetermin)   AS letzter_montagetermin,
    COUNT(DISTINCT pos.id)  AS positionen_anzahl,
    SUM(COALESCE(
        CAST(pos.preis AS NUMERIC) * CAST(pos.menge AS NUMERIC), 0
    ))                      AS gesamtkosten_positionen -- exposed in view, gated by RBAC in app
FROM projekte p
LEFT JOIN teilsysteme ts  ON ts."projektId" = p.id
LEFT JOIN positionen  pos ON pos."projektId" = p.id
WHERE p."deletedAt" IS NULL
  AND (p.archived IS NULL OR p.archived = FALSE)
GROUP BY
    p.id, p.projektname, p.projektnummer, p.plz, p.ort,
    p.status, p.bauleiter, p.projektleiter, p.polier, p.description;

-- ---- 2. v_ai_teilsystem_detail --------------------------------
-- One row per Teilsystem with aggregated position count and cost.
-- Primary source for Bauzeitenplan / scheduling queries.

CREATE OR REPLACE VIEW v_ai_teilsystem_detail AS
SELECT
    ts.id,
    ts."projektId",
    ts.name,
    ts."teilsystemNummer",
    ts.status,
    ts."planStatus",
    ts.abteilung,
    ts.montagetermin,
    ts.lieferfrist,
    ts."abgabePlaner",
    ts.verantwortlich,
    ts.unternehmer,
    ts.bemerkung,
    ts."lagerortId",
    COUNT(pos.id)           AS positionen_count,
    SUM(COALESCE(
        CAST(pos.preis AS NUMERIC) * CAST(pos.menge AS NUMERIC), 0
    ))                      AS material_kosten -- gated by RBAC in app layer
FROM teilsysteme ts
LEFT JOIN positionen pos ON pos."teilsystemId" = ts.id
GROUP BY
    ts.id, ts."projektId", ts.name, ts."teilsystemNummer",
    ts.status, ts."planStatus", ts.abteilung, ts.montagetermin,
    ts.lieferfrist, ts."abgabePlaner", ts.verantwortlich,
    ts.unternehmer, ts.bemerkung, ts."lagerortId";

-- ---- 3. v_ai_task_status --------------------------------
-- One row per ausfuehrung_task with subtask progress.
-- NOTE: references ausfuehrung_tasks (canonical), NOT legacy tasks table.

CREATE OR REPLACE VIEW v_ai_task_status AS
SELECT
    at2.id,
    at2."projektId",
    at2."teilsystemId",
    at2."teamId",
    at2.title,
    at2.status,
    at2.priority,
    at2."dueDate",
    at2.description,
    COUNT(ast.id)           AS subtasks_total,
    COUNT(ast.id)  FILTER (WHERE ast.status IN ('Erledigt','fertig','done'))
                            AS subtasks_done
FROM ausfuehrung_tasks at2
LEFT JOIN ausfuehrung_subtasks ast ON ast."taskId" = at2.id
GROUP BY
    at2.id, at2."projektId", at2."teilsystemId", at2."teamId",
    at2.title, at2.status, at2.priority, at2."dueDate", at2.description;

-- ---- 4. v_ai_personal --------------------------------
-- Unified personal view from mitarbeiter + workers.
-- Sensitive fields (email, telefon, adresse) excluded.
-- Only active records included.

CREATE OR REPLACE VIEW v_ai_personal AS
SELECT
    'mitarbeiter'                               AS quelle,
    id,
    TRIM(COALESCE(vorname,'') || ' ' || COALESCE(nachname,'')) AS name,
    rolle,
    abteilung,
    aktiv,
    "isGlobal",
    "projektId"
FROM mitarbeiter
WHERE aktiv = TRUE

UNION ALL

SELECT
    'worker'                                    AS quelle,
    id,
    TRIM(COALESCE(vorname,'') || ' ' || COALESCE(nachname,'')) AS name,
    rolle,
    abteilung,
    aktiv,
    "isGlobal",
    "projektId"
FROM workers
WHERE aktiv = TRUE;
