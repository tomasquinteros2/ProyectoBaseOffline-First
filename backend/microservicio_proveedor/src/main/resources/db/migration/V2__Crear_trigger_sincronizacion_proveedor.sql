-- 1. Sincronización Inmediata
SELECT setval('proveedor_id_seq', COALESCE((SELECT MAX(id) FROM proveedor), 1), true);

-- 2. Función de actualización
CREATE
OR REPLACE FUNCTION fn_actualizar_secuencia_proveedor()
        RETURNS TRIGGER AS $$
BEGIN
        PERFORM
setval('proveedor_id_seq', (SELECT max(id) FROM proveedor), true);
RETURN NULL;
END;
    $$
LANGUAGE plpgsql;

    -- 3. Trigger idempotente
DROP TRIGGER IF EXISTS trg_actualizar_secuencia_proveedor_statement ON proveedor;
CREATE TRIGGER trg_actualizar_secuencia_proveedor_statement
    AFTER INSERT
    ON proveedor
    FOR EACH STATEMENT
    EXECUTE FUNCTION fn_actualizar_secuencia_proveedor();