-- 1. Sincronización Inmediata al aplicar la migración
--    Asegura que la secuencia 'tipo_producto_id_seq' esté correcta.
SELECT setval('tipo_producto_id_seq', COALESCE((SELECT MAX(id) FROM tipo_producto), 1), true);

-- 2. Función para mantener la secuencia actualizada
CREATE OR REPLACE FUNCTION fn_actualizar_secuencia_tipo_producto()
    RETURNS TRIGGER AS $$
BEGIN
    PERFORM setval('tipo_producto_id_seq', (SELECT max(id) FROM tipo_producto), true);
RETURN NULL; -- Correcto para triggers a nivel de STATEMENT
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger que se ejecuta después de inserciones masivas
--    Eliminamos si existe para evitar errores en re-ejecuciones de desarrollo
DROP TRIGGER IF EXISTS trg_actualizar_secuencia_tipo_producto_statement ON tipo_producto;

CREATE TRIGGER trg_actualizar_secuencia_tipo_producto_statement
    AFTER INSERT ON tipo_producto
    FOR EACH STATEMENT
    EXECUTE FUNCTION fn_actualizar_secuencia_tipo_producto();