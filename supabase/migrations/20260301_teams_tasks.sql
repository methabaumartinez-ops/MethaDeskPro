-- supabase/migrations/20260301_teams_tasks.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TEAMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projekt_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 2. TEAM MEMBERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    mitarbeiter_id UUID NOT NULL,
    role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, mitarbeiter_id)
);

-- ==============================================================================
-- 3. TASKS (Aufgaben)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projekt_id UUID NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    assigned_to_mitarbeiter_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Offen', -- 'Offen', 'In Arbeit', 'Blockiert', 'Erledigt'
    priority VARCHAR(50), -- 'Niedrig', 'Mittel', 'Hoch'
    due_date DATE,
    source_type VARCHAR(50), -- 'ts' for Teilsystem, 'manual' for ad-hoc tasks
    source_ts_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate auto-generated tasks per Teilsystem
    CONSTRAINT unique_source_ts UNIQUE NULLS NOT DISTINCT (source_type, source_ts_id)
);

-- Note on UNIQUE NULLS NOT DISTINCT: 
-- In PG>15 this works as expected where (NULL, NULL) avoids duplicates.
-- For standard PG<15 you might need a partial index:
-- CREATE UNIQUE INDEX unique_ts_task ON public.tasks (source_type, source_ts_id) WHERE source_type = 'ts';

-- ==============================================================================
-- 4. SUBTASKS (Unteraufgaben / Checkliste)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Offen', -- 'Offen', 'Erledigt'
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS für updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
    BEFORE UPDATE ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
