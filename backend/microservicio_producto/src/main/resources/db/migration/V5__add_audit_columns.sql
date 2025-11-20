-- Agregar columnas solo si no existen
ALTER TABLE producto
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Inicializar con fecha_ingreso o fecha actual para registros existentes que no tengan valores
SET session_replication_role = 'replica';

UPDATE producto
SET created_at = COALESCE(created_at, fecha_ingreso::timestamp, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, fecha_ingreso::timestamp, CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR updated_at IS NULL;

SET session_replication_role = 'origin';
-- Hacer las columnas NOT NULL después de inicializarlas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'producto' AND column_name = 'created_at'
               AND is_nullable = 'YES') THEN
ALTER TABLE producto ALTER COLUMN created_at SET NOT NULL;
END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'producto' AND column_name = 'updated_at'
               AND is_nullable = 'YES') THEN
ALTER TABLE producto ALTER COLUMN updated_at SET NOT NULL;
END IF;
END $$;
