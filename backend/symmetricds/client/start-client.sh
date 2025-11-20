# symmetricds/client/start-client.sh
#!/bin/bash
set -euo pipefail

DB_HOST="postgres-db-offline"
DB_PORT="5432"
DB_USER="--username--"
DB_NAME="--database--"
export PGPASSWORD="--password--"

SCHEMA_SQL="/app/insert_offline_schema.sql"
SCHEMA_FLAG="/app/data/.offline_schema_applied"
SYM_BIN="/app/bin/sym"
ENGINE_TEMPLATE="/app/engines/client.properties.template"
ENGINE_FILE="/app/engines/client.properties"

echo "================================="
echo "SymmetricDS Client - Inicialización"
echo "================================="
echo "--> Host DB: ${DB_HOST}:${DB_PORT}"
echo "--> Base: ${DB_NAME}"
echo ""

if ! command -v psql >/dev/null 2>&1; then
  echo "psql no está instalado en la imagen (instala postgresql-client y reconstruye symmetricds-client)."
  exit 1
fi

echo "--> Esperando a PostgreSQL..."
MAX_TRIES=30
COUNTER=0
while ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q'; do
  COUNTER=$((COUNTER + 1))
  if [ $COUNTER -ge $MAX_TRIES ]; then
    echo "PostgreSQL no respondió tras ${MAX_TRIES} intentos"
    exit 1
  fi
  echo "Intento ${COUNTER}/${MAX_TRIES} - esperando 2s..."
  sleep 2
done
echo "PostgreSQL listo"
echo ""

echo "--> Verificando esquema offline..."
COLUMN_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema='public'
    AND column_name='last_sync_node'
    AND table_name IN (
      'nro_comprobante','usuario','authority','usuario_authority',
      'proveedor','tipo_producto','dolar','producto','productos_relacionados'
    );
" | tr -d ' ')

if [ ! -f "$SCHEMA_FLAG" ] || [ "${COLUMN_COUNT:-0}" -lt 9 ]; then
  echo "⏳ Aplicando schema offline personalizado..."
  psql "postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" -f "$SCHEMA_SQL"
  touch "$SCHEMA_FLAG"
  echo "Schema alineado (flag en ${SCHEMA_FLAG})"
else
  echo "ℹPersonalización ya aplicada (${COLUMN_COUNT}/9 columnas detectadas)."
fi
echo ""

MAC_ADDRESS=$(tr -d ":" </sys/class/net/eth0/address)
EXTERNAL_ID="client_node_${MAC_ADDRESS}"
sed "s/{{EXTERNAL_ID}}/${EXTERNAL_ID}/g" "$ENGINE_TEMPLATE" > "$ENGINE_FILE"

echo "Configuración aplicada:"
grep -E "(external.id|registration.url|sync.url)" "$ENGINE_FILE"
echo ""

echo "Iniciando SymmetricDS Client..."
exec "$SYM_BIN" --port 8081 --server
