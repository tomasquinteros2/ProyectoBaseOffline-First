-- Sincroniza el esquema offline con el master (sección 4)

ALTER TABLE public.nro_comprobante ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.authority ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.usuario_authority ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.proveedor ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.tipo_producto ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.dolar ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.productos_relacionados ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);

ALTER TABLE sym_trigger
    ADD COLUMN IF NOT EXISTS last_update_column VARCHAR(50);

UPDATE sym_trigger
SET last_update_column = 'updated_at',
    last_update_time = NOW()
WHERE trigger_id IN ('producto_trigger','proveedor_trigger');