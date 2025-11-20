# File: `symmetricds/tests/run_tests.sh`
#!/bin/bash
set -e

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-ecopila_db_online}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
export PGPASSWORD="${POSTGRES_PASSWORD:-password}"

echo "=========================================="
echo "Ejecutando Tests de Configuración"
echo "=========================================="
echo "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Base de datos: ${POSTGRES_DB}"
echo ""

if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /app/tests/validate_config.sql; then
    echo ""
    echo "✅ Validación completada exitosamente"
    exit 0
else
    echo ""
    echo "❌ La validación falló"
    exit 1
fi
