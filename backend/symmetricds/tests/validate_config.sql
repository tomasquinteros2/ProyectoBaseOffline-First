-- File: `symmetricds/tests/validate_config.sql`
-- ========================================
-- TESTS DE VALIDACIÓN DE CONFIGURACIÓN
-- ========================================

-- Test 1: Verificar que existen los grupos de nodos
DO $$
DECLARE
v_master_count INT;
    v_client_count INT;
BEGIN
SELECT COUNT(*) INTO v_master_count FROM sym_node_group WHERE node_group_id = 'master_group';
SELECT COUNT(*) INTO v_client_count FROM sym_node_group WHERE node_group_id = 'client_group';

IF v_master_count = 0 THEN
        RAISE EXCEPTION '❌ FALLO: No existe master_group';
END IF;

    IF v_client_count = 0 THEN
        RAISE EXCEPTION '❌ FALLO: No existe client_group';
END IF;

    RAISE NOTICE '✅ Test 1 PASÓ: Grupos de nodos configurados correctamente';
END $$;

-- Test 2: Verificar enlaces bidireccionales
DO $$
DECLARE
v_master_to_client INT;
    v_client_to_master INT;
BEGIN
SELECT COUNT(*) INTO v_master_to_client
FROM sym_node_group_link
WHERE source_node_group_id = 'master_group'
  AND target_node_group_id = 'client_group'
  AND data_event_action = 'W';

SELECT COUNT(*) INTO v_client_to_master
FROM sym_node_group_link
WHERE source_node_group_id = 'client_group'
  AND target_node_group_id = 'master_group'
  AND data_event_action = 'P';

IF v_master_to_client = 0 THEN
        RAISE EXCEPTION '❌ FALLO: Link master→client no configurado';
END IF;

    IF v_client_to_master = 0 THEN
        RAISE EXCEPTION '❌ FALLO: Link client→master no configurado';
END IF;

    RAISE NOTICE '✅ Test 2 PASÓ: Enlaces bidireccionales OK';
END $$;

-- Test 3: Verificar que todos los canales existen
DO $$
DECLARE
v_channel_count INT;
BEGIN
SELECT COUNT(*) INTO v_channel_count
FROM sym_channel
WHERE channel_id IN ('config_channel', 'auth_channel', 'proveedor_channel',
                     'tipo_producto_channel', 'dolar_channel', 'producto_channel',
                     'venta_channel');

IF v_channel_count < 7 THEN
        RAISE EXCEPTION '❌ FALLO: Faltan canales. Encontrados: %, Esperados: 7', v_channel_count;
END IF;

    RAISE NOTICE '✅ Test 3 PASÓ: Todos los canales existen (%)' , v_channel_count;
END $$;

-- Test 4: Verificar triggers bidireccionales con sync_on_incoming_batch = 0
DO $$
DECLARE
v_bad_triggers INT;
BEGIN
SELECT COUNT(*) INTO v_bad_triggers
FROM sym_trigger
WHERE trigger_id IN (
                     'nro_comprobante_trigger', 'usuario_trigger', 'authority_trigger',
                     'usuario_authority_trigger', 'proveedor_trigger', 'tipo_producto_trigger',
                     'dolar_trigger', 'producto_trigger', 'productos_relacionados_trigger'
    )
  AND (sync_on_incoming_batch IS NULL OR sync_on_incoming_batch != 0);

IF v_bad_triggers > 0 THEN
        RAISE EXCEPTION '❌ FALLO: % triggers bidireccionales sin sync_on_incoming_batch=0', v_bad_triggers;
END IF;

    RAISE NOTICE '✅ Test 4 PASÓ: Triggers bidireccionales previenen loops';
END $$;

-- Test 5: Verificar triggers unidireccionales (ventas)
DO $$
DECLARE
v_venta_count INT;
BEGIN
SELECT COUNT(*) INTO v_venta_count
FROM sym_trigger
WHERE trigger_id IN ('venta_trigger', 'venta_item_trigger')
  AND sync_on_insert = 1
  AND sync_on_update = 0
  AND sync_on_delete = 0;

IF v_venta_count < 2 THEN
        RAISE EXCEPTION '❌ FALLO: Triggers de venta mal configurados';
END IF;

    RAISE NOTICE '✅ Test 5 PASÓ: Triggers unidireccionales de venta OK';
END $$;

-- Test 6: Verificar routers
DO $$
DECLARE
v_master_to_client INT;
    v_client_to_master INT;
BEGIN
SELECT COUNT(*) INTO v_master_to_client
FROM sym_router
WHERE router_id = 'master_to_all_clients'
  AND source_node_group_id = 'master_group'
  AND target_node_group_id = 'client_group';

SELECT COUNT(*) INTO v_client_to_master
FROM sym_router
WHERE router_id = 'client_to_master'
  AND source_node_group_id = 'client_group'
  AND target_node_group_id = 'master_group';

IF v_master_to_client = 0 OR v_client_to_master = 0 THEN
        RAISE EXCEPTION '❌ FALLO: Routers no configurados';
END IF;

    RAISE NOTICE '✅ Test 6 PASÓ: Routers configurados correctamente';
END $$;

-- Test 7: Verificar trigger_routers para master→client
DO $$
DECLARE
v_count INT;
BEGIN
SELECT COUNT(*) INTO v_count
FROM sym_trigger_router
WHERE router_id = 'master_to_all_clients'
  AND enabled = 1;

IF v_count < 9 THEN
        RAISE EXCEPTION '❌ FALLO: Faltan trigger_routers master→client. Encontrados: %', v_count;
END IF;

    RAISE NOTICE '✅ Test 7 PASÓ: Trigger_routers master→client OK (%)' , v_count;
END $$;

-- Test 8: Verificar trigger_routers para client→master (incluye ventas)
DO $$
DECLARE
v_count INT;
BEGIN
SELECT COUNT(*) INTO v_count
FROM sym_trigger_router
WHERE router_id = 'client_to_master'
  AND enabled = 1;

IF v_count < 11 THEN
        RAISE EXCEPTION '❌ FALLO: Faltan trigger_routers client→master. Encontrados: %', v_count;
END IF;

    RAISE NOTICE '✅ Test 8 PASÓ: Trigger_routers client→master OK (incluye ventas: %)' , v_count;
END $$;

-- Test 9: Verificar resolución de conflictos
DO $$
DECLARE
v_conflicts INT;
BEGIN
SELECT COUNT(*) INTO v_conflicts FROM sym_conflict;

IF v_conflicts < 7 THEN
        RAISE EXCEPTION '❌ FALLO: Faltan configuraciones de conflictos. Encontrados: %', v_conflicts;
END IF;

    RAISE NOTICE '✅ Test 9 PASÓ: Configuración de conflictos OK (%)' , v_conflicts;
END $$;

-- Test 10: Verificar parámetros críticos
DO $$
DECLARE
v_param_count INT;
BEGIN
SELECT COUNT(*) INTO v_param_count
FROM sym_parameter
WHERE param_key IN (
                    'purge.retention.minutes',
                    'auto.reload.enabled',
                    'sync.triggers.fire.on.load',
                    'job.push.period.time.ms',
                    'job.pull.period.time.ms'
    );

IF v_param_count < 4 THEN
        RAISE EXCEPTION '❌ FALLO: Faltan parámetros críticos. Encontrados: %', v_param_count;
END IF;

    RAISE NOTICE '✅ Test 10 PASÓ: Parámetros críticos configurados (%)' , v_param_count;
END $$;

-- Test 11: Verificar columnas de control
DO $$
DECLARE
v_missing_columns TEXT[];
    v_table TEXT;
BEGIN
    v_missing_columns := ARRAY[]::TEXT[];

    FOREACH v_table IN ARRAY ARRAY[
        'nro_comprobante', 'usuario', 'authority', 'usuario_authority',
        'proveedor', 'tipo_producto', 'dolar', 'producto', 'productos_relacionados'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = v_table
              AND column_name = 'last_sync_node'
        ) THEN
            v_missing_columns := array_append(v_missing_columns, v_table);
END IF;
END LOOP;

    IF array_length(v_missing_columns, 1) > 0 THEN
        RAISE EXCEPTION '❌ FALLO: Tablas sin columna last_sync_node: %', v_missing_columns;
END IF;

    RAISE NOTICE '✅ Test 11 PASÓ: Todas las tablas tienen columna de control';
END $$;

-- Test 12: Verificar que el nodo master está registrado
DO $$
DECLARE
v_master_node INT;
BEGIN
SELECT COUNT(*) INTO v_master_node
FROM sym_node
WHERE node_id = 'master_node'
  AND node_group_id = 'master_group';

IF v_master_node = 0 THEN
        RAISE EXCEPTION '❌ FALLO: Nodo master no registrado';
END IF;

    RAISE NOTICE '✅ Test 12 PASÓ: Nodo master registrado correctamente';
END $$;

-- RESUMEN FINAL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TODOS LOS TESTS PASARON';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Configuración de SymmetricDS validada correctamente';
END $$;
