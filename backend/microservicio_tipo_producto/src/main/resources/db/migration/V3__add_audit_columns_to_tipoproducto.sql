-- Agregar columnas solo si no existen
ALTER TABLE tipo_producto
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Desactivar temporalmente los triggers para que SymmetricDS ignore esta migración masiva
SET session_replication_role = 'replica';

-- Actualizar registros existentes con valores por defecto
UPDATE tipo_producto
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL OR updated_at IS NULL;

-- Reactivar los triggers
SET session_replication_role = 'origin';

-- Hacer las columnas NOT NULL después de poblarlas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'tipo_producto' AND column_name = 'created_at'
               AND is_nullable = 'YES') THEN
ALTER TABLE tipo_producto ALTER COLUMN created_at SET NOT NULL;
END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'tipo_producto' AND column_name = 'updated_at'
               AND is_nullable = 'YES') THEN
ALTER TABLE tipo_producto ALTER COLUMN updated_at SET NOT NULL;
END IF;
END $$;

-- Opcional: Agregar índices solo si no existen
CREATE INDEX IF NOT EXISTS idx_tipo_producto_updated_at ON tipo_producto(updated_at);
CREATE INDEX IF NOT EXISTS idx_tipo_producto_created_at ON tipo_producto(created_at);
