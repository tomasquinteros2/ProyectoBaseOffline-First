#!/bin/sh
set -e

DB_HOST="postgres-db"
DB_PORT="5432"
DB_USER="admin"
DB_NAME="ecopila_db_online"
export PGPASSWORD="password"

SYMMETRIC_HOME="/app/symmetric-ds-3.14.0"
SYM_BIN="${SYMMETRIC_HOME}/bin/sym"
ENGINES_DIR="${SYMMETRIC_HOME}/engines"

echo "=========================================="
echo "SymmetricDS Master - Inicialización"
echo "=========================================="
echo "--> [$(date)] Host: ${DB_HOST}:${DB_PORT}"
echo "--> [$(date)] Base de datos: ${DB_NAME}"
echo "--> [$(date)] SymmetricDS Home: ${SYMMETRIC_HOME}"
echo ""

# Verificar que SymmetricDS existe
if [ ! -f "$SYM_BIN" ]; then
  echo " SymmetricDS no encontrado en $SYM_BIN"
  exit 1
fi

# Verificar que master.properties existe
if [ ! -f "${ENGINES_DIR}/master.properties" ]; then
  echo "master.properties no encontrado en ${ENGINES_DIR}/"
  echo "Contenido del directorio engines:"
  ls -la ${ENGINES_DIR}/
  exit 1
fi

echo "--> [$(date)] Esperando a PostgreSQL..."

MAX_TRIES=30
COUNTER=0

while ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  COUNTER=$((COUNTER + 1))
  if [ $COUNTER -ge $MAX_TRIES ]; then
    echo " PostgreSQL no está disponible después de $MAX_TRIES intentos"
    exit 1
  fi
  echo "Intento ${COUNTER}/${MAX_TRIES} - Esperando PostgreSQL..."
  sleep 2
done

echo " PostgreSQL está listo"
echo ""

echo "--> [$(date)] Verificando configuración existente..."
EXISTING_CONFIG=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='sym_node';" 2>/dev/null | tr -d ' ')

echo "Tablas SymmetricDS encontradas: ${EXISTING_CONFIG:-0}"

if [ "$EXISTING_CONFIG" = "0" ] || [ -z "$EXISTING_CONFIG" ]; then
  echo ""
  echo "--> [$(date)] Primera inicialización detectada"
  echo "--> [$(date)] Iniciando SymmetricDS para crear esquema..."

  $SYM_BIN --port 31415 --server &
  SYMMETRIC_PID=$!

  echo "PID de SymmetricDS: $SYMMETRIC_PID"
  echo "Esperando a que SymmetricDS cree el esquema..."
  sleep 45

  kill $SYMMETRIC_PID 2>/dev/null || true
  sleep 5

  echo ""
  echo "--> [$(date)] Insertando configuración personalizada..."
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /app/insert_config.sql; then
    echo " Configuración insertada correctamente"
  else
    echo " Error al insertar configuración"
    exit 1
  fi
else
  echo "ℹ  Esquema existente detectado. Saltando inicialización."
fi

echo ""
echo "=========================================="
echo "Verificación de Configuración"
echo "=========================================="
echo " URL de sincronización configurada en master.properties:"
grep "sync.url" ${ENGINES_DIR}/master.properties
echo ""

echo "=========================================="
echo "Iniciando SymmetricDS Master"
echo "=========================================="
echo "--> Puerto: 31415"
echo "--> Grupo: master_group"
echo "--> External ID: master_node"
echo ""

exec $SYM_BIN --port 31415 --server