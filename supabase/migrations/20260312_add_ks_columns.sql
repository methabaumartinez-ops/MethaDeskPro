-- Migración: Añadir columna 'ks' (Kostenstelle) a las tablas relevantes
-- =========================================================================

-- Tabla: kosten
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kosten' AND column_name = 'ks') THEN
        ALTER TABLE kosten ADD COLUMN ks TEXT;
    END IF;
END $$;

-- Tabla: tasks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'ks') THEN
        ALTER TABLE tasks ADD COLUMN ks TEXT;
    END IF;
END $$;

-- Tabla: ausfuehrung_tasks
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ausfuehrung_tasks' AND column_name = 'ks') THEN
        ALTER TABLE ausfuehrung_tasks ADD COLUMN ks TEXT;
    END IF;
END $$;

-- Tabla: fahrzeuge
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fahrzeuge' AND column_name = 'ks') THEN
        ALTER TABLE fahrzeuge ADD COLUMN ks TEXT;
    END IF;
END $$;

-- Asegurar que la tabla teilsysteme tenga ks por si no lo tuviera (el schema lo tiene, pero como salvaguarda)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teilsysteme' AND column_name = 'ks') THEN
        ALTER TABLE teilsysteme ADD COLUMN ks TEXT;
    END IF;
END $$;
