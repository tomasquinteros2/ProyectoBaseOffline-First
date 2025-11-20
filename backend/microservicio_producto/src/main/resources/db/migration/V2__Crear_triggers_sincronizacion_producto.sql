-- Trigger para la tabla 'producto'
SELECT setval('producto_id_seq', COALESCE((SELECT MAX(id) FROM producto), 1), true);
CREATE
OR REPLACE FUNCTION fn_actualizar_secuencia_producto() RETURNS TRIGGER AS $$
BEGIN
        PERFORM
setval('producto_id_seq', (SELECT max(id) FROM producto), true);
RETURN NULL;
END;
    $$
LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_actualizar_secuencia_producto_statement ON producto;
CREATE TRIGGER trg_actualizar_secuencia_producto_statement
    AFTER INSERT
    ON producto
    FOR EACH STATEMENT EXECUTE FUNCTION fn_actualizar_secuencia_producto();

-- Trigger para la tabla 'nro_comprobante'
SELECT setval('nro_comprobante_id_seq', COALESCE((SELECT MAX(id) FROM nro_comprobante), 1), true);
CREATE
OR REPLACE FUNCTION fn_actualizar_secuencia_nro_comprobante() RETURNS TRIGGER AS $$
BEGIN
        PERFORM
setval('nro_comprobante_id_seq', (SELECT max(id) FROM nro_comprobante), true);
RETURN NULL;
END;
    $$
LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_actualizar_secuencia_nro_comprobante_statement ON nro_comprobante;
CREATE TRIGGER trg_actualizar_secuencia_nro_comprobante_statement
    AFTER INSERT
    ON nro_comprobante
    FOR EACH STATEMENT EXECUTE FUNCTION fn_actualizar_secuencia_nro_comprobante();