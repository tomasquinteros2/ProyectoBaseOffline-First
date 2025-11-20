ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS cuit VARCHAR(13);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS calle VARCHAR(15);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS altura VARCHAR(6);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(6);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS provincia VARCHAR(20);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS ciudad VARCHAR(15);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS telefono_fijo VARCHAR(20);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS nombre_transporte VARCHAR(10);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS domicilio_transporte VARCHAR(20);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS telefono_transporte VARCHAR(20);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS pagina_web VARCHAR(50);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS usuario_pagina VARCHAR(15);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS contrasena_pagina VARCHAR(15);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS responsable_ventas1 VARCHAR(50);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS responsable_ventas2 VARCHAR(50);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS condicion_venta VARCHAR(255);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS moneda VARCHAR(255);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(255);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS valor_cotizacion_manual NUMERIC(19, 2);
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS observaciones VARCHAR(500);

ALTER TABLE proveedor ALTER COLUMN nombre TYPE VARCHAR(20);


CREATE TABLE IF NOT EXISTS razon_social (
                                            id BIGSERIAL PRIMARY KEY,
                                            nombre VARCHAR(20),
    descuento_sobre_lista VARCHAR(10),
    descuento_sobre_factura VARCHAR(10),
    proveedor_id BIGINT,
    CONSTRAINT fk_proveedor
    FOREIGN KEY(proveedor_id)
    REFERENCES proveedor(id)
    ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS cuenta_bancaria (
                                               id BIGSERIAL PRIMARY KEY,
                                               cbu VARCHAR(22),
    alias VARCHAR(20),
    tipo_cuenta VARCHAR(255),
    numero_cuenta VARCHAR(20),
    titular VARCHAR(20),
    razon_social_id BIGINT,
    CONSTRAINT fk_razon_social
    FOREIGN KEY(razon_social_id)
    REFERENCES razon_social(id)
    ON DELETE CASCADE
    );

SELECT setval('razon_social_id_seq', COALESCE((SELECT MAX(id) FROM razon_social), 1), true);

CREATE OR REPLACE FUNCTION fn_actualizar_secuencia_razon_social()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM setval('razon_social_id_seq', (SELECT max(id) FROM razon_social), true);
RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_secuencia_razon_social_statement ON razon_social;
CREATE TRIGGER trg_actualizar_secuencia_razon_social_statement
    AFTER INSERT ON razon_social
    FOR EACH STATEMENT
    EXECUTE FUNCTION fn_actualizar_secuencia_razon_social();


SELECT setval('cuenta_bancaria_id_seq', COALESCE((SELECT MAX(id) FROM cuenta_bancaria), 1), true);

CREATE OR REPLACE FUNCTION fn_actualizar_secuencia_cuenta_bancaria()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM setval('cuenta_bancaria_id_seq', (SELECT max(id) FROM cuenta_bancaria), true);
RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_secuencia_cuenta_bancaria_statement ON cuenta_bancaria;
CREATE TRIGGER trg_actualizar_secuencia_cuenta_bancaria_statement
    AFTER INSERT ON cuenta_bancaria
    FOR EACH STATEMENT
    EXECUTE FUNCTION fn_actualizar_secuencia_cuenta_bancaria();