# File: `diagnose_client_sync.sh`
#!/bin/bash

echo "========================================="
echo "DIAGNÓSTICO DE SINCRONIZACIÓN CLIENTE"
echo "========================================="

echo ""
echo "1. Estado del nodo cliente:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT node_id, node_group_id, sync_enabled, sync_url FROM sym_node;"

echo ""
echo "2. Identidad del cliente:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT * FROM sym_node_identity;"

echo ""
echo "3. Triggers del cliente:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT trigger_id, source_table_name, channel_id FROM sym_trigger WHERE inactive_time IS NULL ORDER BY trigger_id;"

echo ""
echo "4. Batches salientes del cliente:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT batch_id, node_id, channel_id, status, error_flag, create_time FROM sym_outgoing_batch ORDER BY create_time DESC LIMIT 5;"

echo ""
echo "5. Errores de sincronización:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT * FROM sym_outgoing_error ORDER BY create_time DESC LIMIT 3;"

echo ""
echo "6. Parámetros de push:"
docker exec -it postgres_db_offline psql -U admin -d ecopila_db_offline -c "SELECT param_key, param_value FROM sym_parameter WHERE param_key LIKE '%push%' ORDER BY param_key;"

echo ""
echo "7. Test de conectividad cliente→master:"
docker exec -it symmetricds_client curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://symmetricds_master:31415/api/engine/status

echo ""
echo "========================================="
echo "FIN DEL DIAGNÓSTICO"
echo "========================================="
