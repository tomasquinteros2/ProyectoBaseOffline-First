#!/bin/bash

# Script para levantar múltiples clientes
NUM_CLIENTS=${1:-2}

echo "Levantando $NUM_CLIENTS clientes..."

for i in $(seq 1 $NUM_CLIENTS); do
  PORT=$((8080 + i))
  echo "Iniciando cliente $i en puerto $PORT..."

  INSTANCE_ID=$i CLIENT_PORT=$PORT docker-compose up -d symmetricds-client

  # Renombrar el contenedor
  docker rename symmetricds_client_1 symmetricds_client_$i 2>/dev/null || true

  sleep 5
done

echo "Clientes iniciados. Verifica con: docker ps"
