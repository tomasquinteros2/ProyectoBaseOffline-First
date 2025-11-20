#!/bin/sh
# init-symmetric-master.sh (Versión Limpia)

set -e

# --- Variables ---
SYM_ADMIN="/app/symmetric-ds-3.14.0/bin/symadmin"
DB_SQL="/app/symmetric-ds-3.14.0/bin/dbsql"
SYM_ENGINE="master"
CONFIG_SQL_FILE="/app/symmetric-ds-3.14.0/conf/insert_config.sql"
PG_HOST="postgres-db"
PG_USER="admin"
PG_DB="ecopila_db_online"
INIT_FLAG_FILE="/app/symmetric-ds-3.14.0/data/.initialized"

# --- Iniciar directamente si ya está inicializado ---
if [ -f "$INIT_FLAG_FILE" ]; then
    echo "SymmetricDS Master ya está inicializado. Iniciando servidor..."
    exec /app/symmetric-ds-3.14.0/bin/sym --port 31415 --server
fi

# --- Esperar a que PostgreSQL esté listo ---
echo "Esperando a que PostgreSQL en $PG_HOST esté disponible..."
export PGPASSWORD=password
until pg_isready -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -q; do
  echo "PostgreSQL no está listo todavía. Esperando 5 segundos..."
  sleep 5
done
echo "✅ PostgreSQL está listo."

# --- Inicializar SymmetricDS ---
echo "Primera ejecución: Creando tablas de SymmetricDS..."
$SYM_ADMIN --engine "$SYM_ENGINE" create-sym-tables

echo "Insertando configuración desde $CONFIG_SQL_FILE..."
$DB_SQL --engine "$SYM_ENGINE" < "$CONFIG_SQL_FILE"

echo "✅ Configuración de SymmetricDS insertada."

# --- Crear el flag y limpiar ---
touch "$INIT_FLAG_FILE"
echo "✅ Inicialización completada. Se creó el flag en $INIT_FLAG_FILE."

echo "Iniciando el servidor SymmetricDS Master..."

# --- Iniciar el servidor ---
exec /app/symmetric-ds-3.14.0/bin/sym --port 31415 --server
