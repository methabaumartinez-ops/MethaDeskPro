-- ============================================================
-- Migration 001: Workforce Planning Extension
-- Adds scheduling fields to ausfuehrung_tasks,
-- creates team_membership_history table,
-- and adds teamId + fullName to workers table.
-- ============================================================

-- 1) Add scheduling fields to ausfuehrung_tasks
ALTER TABLE ausfuehrung_tasks
  ADD COLUMN IF NOT EXISTS "workerId" UUID,
  ADD COLUMN IF NOT EXISTS "scheduledDate" TEXT,
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "endTime" TEXT,
  ADD COLUMN IF NOT EXISTS "estimatedHours" NUMERIC,
  ADD COLUMN IF NOT EXISTS "planStatus" TEXT DEFAULT 'Ungeplant',
  ADD COLUMN IF NOT EXISTS "teamId" UUID,
  ADD COLUMN IF NOT EXISTS "sourceTsId" UUID,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT;

CREATE INDEX IF NOT EXISTS idx_ausfuehrung_tasks_worker ON ausfuehrung_tasks("workerId");
CREATE INDEX IF NOT EXISTS idx_ausfuehrung_tasks_team ON ausfuehrung_tasks("teamId");
CREATE INDEX IF NOT EXISTS idx_ausfuehrung_tasks_scheduled ON ausfuehrung_tasks("scheduledDate");
CREATE INDEX IF NOT EXISTS idx_ausfuehrung_tasks_projekt ON ausfuehrung_tasks("projektId");

-- 2) Create team membership history table
CREATE TABLE IF NOT EXISTS team_membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workerId" UUID NOT NULL,
  "teamId" UUID NOT NULL,
  "projektId" UUID,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  "reason" TEXT,
  "changedBy" TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tmh_worker ON team_membership_history("workerId");
CREATE INDEX IF NOT EXISTS idx_tmh_team ON team_membership_history("teamId");

-- 3) Add teamId and fullName to workers table
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS "teamId" UUID,
  ADD COLUMN IF NOT EXISTS "fullName" TEXT;

-- 4) Apply updated_at trigger to new table
DROP TRIGGER IF EXISTS set_updated_at ON team_membership_history;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON team_membership_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5) Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
