-- #####################################################################
-- 1. GRUPOS DE NODOS
-- #####################################################################
INSERT INTO sym_node_group (node_group_id, description)
VALUES
    ('master_group', 'Master Node Group'),
    ('client_group', 'Client Node Group')
    ON CONFLICT (node_group_id) DO NOTHING;

-- #####################################################################
-- 2. ENLACES ENTRE GRUPOS (BIDIRECCIONAL)
-- #####################################################################
-- Master ESPERA (WAIT) datos de Clientes
INSERT INTO sym_node_group_link (source_node_group_id, target_node_group_id, data_event_action)
VALUES ('master_group', 'client_group', 'W')
    ON CONFLICT (source_node_group_id, target_node_group_id)
DO UPDATE SET data_event_action = 'W';

-- Cliente ENVÍA (PUSH) datos al Master
INSERT INTO sym_node_group_link (source_node_group_id, target_node_group_id, data_event_action)
VALUES ('client_group', 'master_group', 'P')
    ON CONFLICT (source_node_group_id, target_node_group_id)
DO UPDATE SET data_event_action = 'P';

-- #####################################################################
-- 3. CANALES (PRIORIZACIÓN Y THROUGHPUT)
-- #####################################################################
INSERT INTO sym_channel (channel_id, processing_order, max_batch_size, enabled, description)
VALUES
    ('config_channel', 1, 1000, 1, 'Configuración general (máxima prioridad)'),
    ('auth_channel', 2, 1000, 1, 'Datos de autenticación'),
    ('proveedor_channel', 3, 1000, 1, 'Datos de proveedores'),
    ('tipo_producto_channel', 4, 1000, 1, 'Tipos de producto'),
    ('dolar_channel', 5, 1000, 1, 'Cotizaciones del dólar'),
    ('producto_channel', 6, 2000, 1, 'Productos (mayor batch por volumen)'),
    ('venta_channel', 7, 500, 1, 'Ventas (cliente → master unidireccional)')
    ON CONFLICT (channel_id) DO UPDATE SET
    processing_order = EXCLUDED.processing_order,
                                    max_batch_size = EXCLUDED.max_batch_size,
                                    enabled = EXCLUDED.enabled,
                                    description = EXCLUDED.description;
-- #####################################################################
-- 4. AGREGAR COLUMNA DE CONTROL (PREVENCIÓN DE LOOPS)
-- #####################################################################
-- Esto ayuda a prevenir loops infinitos rastreando el nodo de origen

-- Agregar columna de control directamente a todas las tablas bidireccionales
ALTER TABLE public.nro_comprobante ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.authority ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.usuario_authority ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.proveedor ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.tipo_producto ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.dolar ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.producto ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);
ALTER TABLE public.productos_relacionados ADD COLUMN IF NOT EXISTS last_sync_node VARCHAR(50);

-- Verificar que se agregaron correctamente
DO $$
DECLARE
v_count INT;
BEGIN
SELECT COUNT(*)
INTO v_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'last_sync_node'
  AND table_name IN (
                     'nro_comprobante', 'usuario', 'authority', 'usuario_authority',
                     'proveedor', 'tipo_producto', 'dolar', 'producto', 'productos_relacionados'
    );

IF v_count < 9 THEN
        RAISE EXCEPTION ' Error: Solo se agregaron % de 9 columnas last_sync_node', v_count;
END IF;

    RAISE NOTICE ' Columnas de control agregadas correctamente: %/9', v_count;
END $$;

-- #####################################################################
-- 4.b Ajuste catálogo interno Symmetric
-- #####################################################################
ALTER TABLE sym_trigger
    ADD COLUMN IF NOT EXISTS last_update_column VARCHAR(50);

-- #####################################################################
-- 5. TRIGGERS (QUÉ TABLAS MONITOREAR)
-- #####################################################################

-- Triggers Bidireccionales (Master ↔ Clientes)
INSERT INTO sym_trigger (trigger_id, source_schema_name, source_table_name, channel_id,
                         sync_on_update, sync_on_insert, sync_on_delete,
                         excluded_column_names,  -- Excluye la columna de control
                         sync_on_incoming_batch,-- CRÍTICO: Evita bucles
                         last_update_column,last_update_time, create_time)
VALUES
    -- Configuración
    ('nro_comprobante_trigger', 'public', 'nro_comprobante', 'config_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now()),

    -- Autenticación
    ('usuario_trigger', 'public', 'usuario', 'auth_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now()),
    ('authority_trigger', 'public', 'authority', 'auth_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now()),
    ('usuario_authority_trigger', 'public', 'usuario_authority', 'auth_channel',
     1, 1, 1, 'last_sync_node', 0, NULL,now(), now()),

    -- Datos Maestros
    ('proveedor_trigger', 'public', 'proveedor', 'proveedor_channel',
     1, 1, 1, 'last_sync_node', 0, 'updated_at',now(), now()),
    ('tipo_producto_trigger', 'public', 'tipo_producto', 'tipo_producto_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now()),
    ('dolar_trigger', 'public', 'dolar', 'dolar_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now()),

    -- Productos (Core de tu negocio)
    ('producto_trigger', 'public', 'producto', 'producto_channel',
     1, 1, 1, 'last_sync_node', 0, 'updated_at', now(), now()),
    ('productos_relacionados_trigger', 'public', 'productos_relacionados', 'producto_channel',
     1, 1, 1, 'last_sync_node', 0, NULL, now(), now())
    ON CONFLICT (trigger_id) DO UPDATE SET
        sync_on_update        = EXCLUDED.sync_on_update,
        sync_on_insert        = EXCLUDED.sync_on_insert,
        sync_on_delete        = EXCLUDED.sync_on_delete,
        excluded_column_names = EXCLUDED.excluded_column_names,
        sync_on_incoming_batch= EXCLUDED.sync_on_incoming_batch,
        last_update_column    = EXCLUDED.last_update_column,
        last_update_time      = now();

-- Triggers Unidireccionales (Cliente → Master SOLAMENTE)
INSERT INTO sym_trigger (trigger_id, source_schema_name, source_table_name, channel_id,
                         sync_on_update, sync_on_insert, sync_on_delete,
                         last_update_time, create_time)
VALUES
    ('venta_trigger', 'public', 'venta', 'venta_channel',
     0, 1, 0, now(), now()),  -- Solo INSERT
    ('venta_item_trigger', 'public', 'venta_item', 'venta_channel',
     0, 1, 0, now(), now())   -- Solo INSERT
    ON CONFLICT (trigger_id) DO UPDATE SET
    sync_on_update = EXCLUDED.sync_on_update,
                                    sync_on_insert = EXCLUDED.sync_on_insert,
                                    sync_on_delete = EXCLUDED.sync_on_delete,
                                    last_update_time = now();

-- #####################################################################
-- 6. ROUTERS (A QUIÉN SE ENVÍA)
-- #####################################################################
INSERT INTO sym_router (router_id, source_node_group_id, target_node_group_id,
                        router_type, router_expression,
                        create_time, last_update_time)
VALUES
    -- Master distribuye a TODOS los clientes
    ('master_to_all_clients', 'master_group', 'client_group',
     'default', NULL, now(), now()),

    -- Cliente envía al Master
    ('client_to_master', 'client_group', 'master_group',
     'default', NULL, now(), now())
    ON CONFLICT (router_id) DO UPDATE SET
    router_expression = EXCLUDED.router_expression,
                                   last_update_time = now();

-- #####################################################################
-- 7. TRIGGER_ROUTERS (CONEXIÓN TRIGGER → ROUTER)
-- #####################################################################

-- ==================== MASTER → TODOS LOS CLIENTES ====================
INSERT INTO sym_trigger_router (trigger_id, router_id, initial_load_order, enabled,
                                last_update_time, create_time)
VALUES
    -- Configuración (prioridad 1)
    ('nro_comprobante_trigger', 'master_to_all_clients', 10, 1, now(), now()),

    -- Autenticación (prioridad 2)
    ('usuario_trigger', 'master_to_all_clients', 20, 1, now(), now()),
    ('authority_trigger', 'master_to_all_clients', 21, 1, now(), now()),
    ('usuario_authority_trigger', 'master_to_all_clients', 22, 1, now(), now()),

    -- Datos Maestros (prioridad 3-5)
    ('proveedor_trigger', 'master_to_all_clients', 30, 1, now(), now()),
    ('tipo_producto_trigger', 'master_to_all_clients', 40, 1, now(), now()),
    ('dolar_trigger', 'master_to_all_clients', 50, 1, now(), now()),

    -- Productos (prioridad 6)
    ('producto_trigger', 'master_to_all_clients', 60, 1, now(), now()),
    ('productos_relacionados_trigger', 'master_to_all_clients', 61, 1, now(), now())
    ON CONFLICT (trigger_id, router_id) DO UPDATE SET
    initial_load_order = EXCLUDED.initial_load_order,
                                               enabled = 1,
                                               last_update_time = now();

-- ==================== CLIENTE → MASTER ====================
INSERT INTO sym_trigger_router (trigger_id, router_id, initial_load_order, enabled,
                                last_update_time, create_time)
VALUES
    -- Configuración
    ('nro_comprobante_trigger', 'client_to_master', 10, 1, now(), now()),

    -- Autenticación
    ('usuario_trigger', 'client_to_master', 20, 1, now(), now()),
    ('authority_trigger', 'client_to_master', 21, 1, now(), now()),
    ('usuario_authority_trigger', 'client_to_master', 22, 1, now(), now()),

    -- Datos Maestros
    ('proveedor_trigger', 'client_to_master', 30, 1, now(), now()),
    ('tipo_producto_trigger', 'client_to_master', 40, 1, now(), now()),
    ('dolar_trigger', 'client_to_master', 50, 1, now(), now()),

    -- Productos
    ('producto_trigger', 'client_to_master', 60, 1, now(), now()),
    ('productos_relacionados_trigger', 'client_to_master', 61, 1, now(), now()),

    -- Ventas (SOLO Cliente → Master)
    ('venta_trigger', 'client_to_master', 100, 1, now(), now()),
    ('venta_item_trigger', 'client_to_master', 101, 1, now(), now())
    ON CONFLICT (trigger_id, router_id) DO UPDATE SET
    initial_load_order = EXCLUDED.initial_load_order,
                                               enabled = 1,
                                               last_update_time = now();

-- ==================== DESACTIVAR SYNC DE PARÁMETROS PARA MASTER ====================
-- CRÍTICO: Evita que el master entre en un bucle de recarga de configuración.
-- El master no necesita sincronizar sus propios cambios de parámetros.
INSERT INTO sym_trigger (trigger_id, source_schema_name, source_table_name, channel_id, sync_on_update, sync_on_insert, sync_on_delete, last_update_time, create_time)
VALUES ('sym_parameter_master_ignore', 'public', 'sym_parameter', 'config', 1, 1, 1, now(), now())
    ON CONFLICT (trigger_id) DO NOTHING;

INSERT INTO sym_trigger_router (trigger_id, router_id, initial_load_order, enabled, last_update_time, create_time)
VALUES ('sym_parameter_master_ignore', 'master_to_all_clients', 999, 0, now(), now()) -- enabled = 0 DESACTIVA el enrutamiento para el master
    ON CONFLICT (trigger_id, router_id) DO UPDATE SET
    enabled = 0,
                                               last_update_time = now();

-- #####################################################################
-- 8. RESOLUCIÓN DE CONFLICTOS
-- #####################################################################
INSERT INTO sym_conflict (
    conflict_id, source_node_group_id, target_node_group_id,
    target_channel_id, target_catalog_name, target_schema_name, target_table_name,
    detect_type, detect_expression, resolve_type, resolve_changes_only, resolve_row_only,
    ping_back, create_time, last_update_time
)
VALUES
    ('producto_conflict', 'client_group', 'master_group',
     'producto_channel', NULL, 'public', 'producto',
     'USE_TIMESTAMP', NULL, 'NEWER_WINS', 1, 1,
     'OFF', now(), now()),
    ('proveedor_conflict', 'client_group', 'master_group',
     'proveedor_channel', NULL, 'public', 'proveedor',
     'USE_TIMESTAMP', NULL, 'NEWER_WINS', 1, 1,
     'OFF', now(), now()),
    ('productos_relacionados_conflict', 'client_group', 'master_group',
     'producto_channel', NULL, 'public', 'productos_relacionados',
     'USE_PK_DATA', NULL, 'FALLBACK', 1, 1,
     'OFF', now(), now()),
    ('tipo_producto_conflict', 'client_group', 'master_group',
     'tipo_producto_channel', NULL, 'public', 'tipo_producto',
     'USE_PK_DATA', NULL, 'FALLBACK', 1, 1,
     'OFF', now(), now()),
    ('dolar_conflict', 'client_group', 'master_group',
     'dolar_channel', NULL, 'public', 'dolar',
     'USE_PK_DATA', NULL, 'FALLBACK', 1, 1,
     'OFF', now(), now()),
    ('usuario_conflict', 'client_group', 'master_group',
     'auth_channel', NULL, 'public', 'usuario',
     'USE_PK_DATA', NULL, 'MANUAL', 1, 1,
     'OFF', now(), now()),
    ('nro_comprobante_conflict', 'client_group', 'master_group',
     'config_channel', NULL, 'public', 'nro_comprobante',
     'USE_PK_DATA', NULL, 'FALLBACK', 1, 1,
     'OFF', now(), now())
    ON CONFLICT (conflict_id) DO UPDATE SET
    detect_type = EXCLUDED.detect_type,
                                     resolve_type = EXCLUDED.resolve_type,
                                     ping_back = EXCLUDED.ping_back,
                                     detect_expression = EXCLUDED.detect_expression,
                                     last_update_time = now();
-- #####################################################################
-- 9. PARÁMETROS DE RENDIMIENTO
-- #####################################################################
INSERT INTO sym_parameter (external_id, node_group_id, param_key, param_value, create_time, last_update_time)
VALUES
    -- Prevención de Loops Infinitos
    ('ALL', 'ALL', 'routing.data.gap.detection.enabled', 'true', now(), now()),
    ('ALL', 'ALL', 'sync.table.level.preview.enabled', 'true', now(), now()),

    -- Intervalos de Sincronización Optimizados
    ('ALL', 'ALL', 'job.routing.period.time.ms', '10000', now(), now()),

    -- Workers Concurrentes
    ('ALL', 'master_group', 'concurrent.workers', '5', now(), now()),
    ('ALL', 'client_group', 'concurrent.workers', '3', now(), now()),

    -- Tamaño de Batch
    ('ALL', 'ALL', 'routing.max.batch.size', '10000', now(), now()),
    ('ALL', 'ALL', 'transport.max.bytes.to.sync', '2097152', now(), now()),

    -- Números en WHERE (PostgreSQL)
    ('ALL', 'ALL', 'db.quote.numbers.in.where.enabled', 'false', now(), now()),

    -- Logging Detallado
    ('ALL', 'ALL', 'log.conflict.resolution', 'true', now(), now()),
    ('ALL', 'ALL', 'routing.log.stats.on.batch.error', 'true', now(), now()),
    ('ALL', 'ALL', 'db.log.sql', 'false', now(), now()),  -- Activar solo para debug

    -- Timeouts
    ('ALL', 'ALL', 'http.connection.timeout.ms', '30000', now(), now())
    ON CONFLICT (external_id, node_group_id, param_key) DO UPDATE SET
    param_value = EXCLUDED.param_value,
                                                               last_update_time = now();

-- #####################################################################
-- 10. CONFIGURACIÓN DE RED Y URLS
-- #####################################################################

-- Actualizar sync_url del nodo master a IP pública
UPDATE sym_node
SET sync_url = 'URL=http://'
WHERE node_id = 'master_node';

INSERT INTO sym_parameter (external_id, node_group_id, param_key, param_value, create_time, last_update_by, last_update_time)
VALUES ('GLOBAL', 'master_group', 'sync.url', 'URL=http://', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP)
    ON CONFLICT (external_id, node_group_id, param_key) DO UPDATE
                                                               SET param_value = EXCLUDED.param_value,
                                                               last_update_time = CURRENT_TIMESTAMP;

-- Configurar registration.url global para que los clientes sepan dónde registrarse
INSERT INTO sym_parameter (external_id, node_group_id, param_key, param_value, create_time, last_update_by, last_update_time)
VALUES ('GLOBAL', 'ALL', 'registration.url', 'URL=http://', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP)
    ON CONFLICT (external_id, node_group_id, param_key) DO UPDATE
                                                               SET param_value = EXCLUDED.param_value,
                                                               last_update_time = CURRENT_TIMESTAMP;


-- #####################################################################
-- 11. GESTIÓN DE SINCRONIZACIÓN Y CLIENTES DESCONECTADOS (CONSOLIDADO)
-- #####################################################################

-- Esta sección unifica la configuración para el manejo de clientes offline,
-- la retención de datos, y la resincronización automática para resolver
-- inconsistencias y asegurar que los clientes reciban los datos perdidos.

INSERT INTO sym_parameter (external_id, node_group_id, param_key, param_value, create_time, last_update_time)
VALUES
    -- === Retención de Datos (CRÍTICO) ===
    -- Mantiene los datos y batches por 7 días (10080 min) en el master,
    -- permitiendo que clientes desconectados se pongan al día.
    ('ALL', 'master_group', 'purge.retention.minutes', '10080', now(), now()),

    -- === Auto-Recarga para Clientes ===
    -- Habilita la recarga automática para clientes que se reconectan.
    ('ALL', 'client_group', 'auto.reload.enabled', 'true', now(), now()),
    -- Habilita la carga inicial para nuevos clientes.
    ('ALL', 'client_group', 'initial.load.create.first', 'true', now(), now()),
    -- Fuerza una recarga si el cliente estuvo offline por más de 60 minutos.
    ('ALL', 'client_group', 'initial.load.after.offline.minutes', '60', now(), now()),
    ('ALL', 'client_group', 'initial.load.delete.first', 'false', now(), now()), -- No borrar datos existentes en el cliente.

    -- === Detección de Nodos Offline ===
    -- Frecuencia con la que se revisa si un nodo está vivo.
    ('ALL', 'ALL', 'job.heartbeat.period.time.ms', '60000', now(), now()),
    -- Tiempo sin heartbeat para considerar un nodo offline (60 minutos).
    ('ALL', 'ALL', 'offline.node.detection.period.minutes', '60', now(), now()),
    -- Mecanismo de detección.
    ('ALL', 'ALL', 'node.offline.detection.type', 'heartbeat', now(), now()),

    -- === Comportamiento de Push y Pull ===
    -- El master intenta activamente enviar datos (push) cada 120 segundos.
    ('ALL', 'master_group', 'job.push.period.time.ms', '120000', now(), now()),
    -- El cliente busca activamente datos (pull) cada 30 segundos para reducir la carga.
    ('ALL', 'ALL', 'job.pull.period.time.ms', '30000', now(), now()),
    -- No omitir batches para nodos offline, los acumula.
    ('ALL', 'master_group', 'outgoing.batches.skip.by.node.offline', 'false', now(), now()),

    -- === Prevención de Bucles de Sincronización ===
    -- **CRÍTICO**: Evita que el master re-dispare triggers con datos que acaba de recibir.
    ('MASTER', 'master_group', 'sync.triggers.fire.on.load', 'false', now(), now()),

    -- === ESTABILIDAD DEL MASTER (NUEVO Y CRÍTICO) ===
    -- Evita que el master enrute cambios de sus propias tablas de configuración.
    ('ALL', 'master_group', 'start.route.job.after.sync.triggers.minutes', '-1', now(), now()),

    -- === Timeouts y Rendimiento ===
    -- Timeout extendido para clientes, útil durante cargas iniciales pesadas.
    ('ALL', 'client_group', 'http.timeout.ms', '600000', now(), now()),
    -- Timeout estándar para el master.
    ('ALL', 'master_group', 'http.timeout.ms', '300000', now(), now()),
    -- Habilitar compresión para reducir el uso de red.
    ('ALL', 'master_group', 'http.compression', 'true', now(), now()),
    -- Workers de push concurrentes en el master.
    ('ALL', 'master_group', 'push.thread.per.server.count', '5', now(), now()),
    -- Máximo de batches a enviar en una sola sesión de push.
    ('ALL', 'master_group', 'push.maximum.number.of.batches.to.sync', '5000', now(), now()),

    -- === Otros Parámetros de Sincronización ===
    -- Habilitar auto-registro de clientes.
    ('ALL', 'client_group', 'auto.registration', 'true', now(), now()),
    -- Reintentar batches con error indefinidamente.
    ('ALL', 'master_group', 'outgoing.batches.error.millis', '0', now(), now())

    ON CONFLICT (external_id, node_group_id, param_key) DO UPDATE SET
    param_value = EXCLUDED.param_value,
                                                               last_update_time = now();

-- #####################################################################
-- 12. HABILITAR RECARGA EN CANALES Y ROUTERS
-- #####################################################################

-- Asegurar que los canales principales soporten recarga de datos.
UPDATE sym_channel
SET reload_flag = 1
WHERE channel_id IN (
                     'config_channel', 'auth_channel', 'proveedor_channel',
                     'tipo_producto_channel', 'dolar_channel', 'producto_channel'
    );

-- Habilitar Push en el router principal del master a los clientes.
UPDATE sym_router
SET sync_on_insert = 1,
    sync_on_update = 1,
    sync_on_delete = 1
WHERE router_id = 'master_to_all_clients';


-- #####################################################################
-- 13. VERIFICACIÓN DE CONFIGURACIÓN
-- #####################################################################
-- Ejecuta estas queries para verificar que todo está OK

-- Verificar Triggers
SELECT trigger_id, source_table_name, channel_id, sync_on_insert, sync_on_update, sync_on_delete
FROM sym_trigger
ORDER BY channel_id, trigger_id;

-- Verificar Routers
SELECT tr.trigger_id, tr.router_id, t.source_table_name, r.source_node_group_id, r.target_node_group_id
FROM sym_trigger_router tr
         JOIN sym_trigger t ON tr.trigger_id = t.trigger_id
         JOIN sym_router r ON tr.router_id = r.router_id
ORDER BY tr.initial_load_order;

-- Verificar Conflictos
SELECT conflict_id, target_table_name, detect_type, resolve_type, ping_back
FROM sym_conflict
ORDER BY conflict_id;

-- Verificar Parámetros Críticos
SELECT param_key, node_group_id, param_value
FROM sym_parameter
WHERE param_key IN (
                    'purge.retention.minutes',
                    'auto.reload.enabled',
                    'initial.load.force.reload.after.offline.minutes',
                    'sync.triggers.fire.on.load',
                    'job.push.period.time.ms',
                    'job.pull.period.time.ms'
    )
ORDER BY node_group_id, param_key;
-- #####################################################################
-- 14. FORZAR ACTUALIZACIÓN DE DEFINICIONES (CRÍTICO)
-- #####################################################################
-- Esto actualiza la fecha de los triggers, obligando a SymmetricDS a
-- re-leer la estructura de la tabla (incluyendo la columna last_sync_node)
-- antes de que se conecte el primer cliente.

UPDATE sym_trigger
SET last_update_time = current_timestamp;