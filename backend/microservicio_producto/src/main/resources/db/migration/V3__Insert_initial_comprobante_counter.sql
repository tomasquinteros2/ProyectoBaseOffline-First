INSERT INTO nro_comprobante (id, prefijo, numero, fecha_generacion)
VALUES (1, 'AA', 0, NOW())
    ON CONFLICT (id) DO NOTHING;

SELECT setval('nro_comprobante_id_seq', COALESCE((SELECT MAX(id) FROM nro_comprobante), 1), true);

