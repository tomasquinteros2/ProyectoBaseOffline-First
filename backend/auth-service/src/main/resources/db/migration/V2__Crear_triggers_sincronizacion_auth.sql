-- Trigger para la tabla 'usuario'
-- Esta tabla SÍ tiene un ID autoincremental y necesita el trigger.
SELECT setval('usuario_id_seq', COALESCE((SELECT MAX(id) FROM usuario), 1), true);

CREATE
OR REPLACE FUNCTION fn_actualizar_secuencia_usuario() RETURNS TRIGGER AS $$
BEGIN
        PERFORM
setval('usuario_id_seq', (SELECT max(id) FROM usuario), true);
RETURN NULL;
END;
    $$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_secuencia_usuario_statement ON usuario;
CREATE TRIGGER trg_actualizar_secuencia_usuario_statement
    AFTER INSERT
    ON usuario
    FOR EACH STATEMENT EXECUTE FUNCTION fn_actualizar_secuencia_usuario();

