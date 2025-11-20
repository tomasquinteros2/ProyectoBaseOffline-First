#!/bin/bash
services=("eureka-service" "auth-service" "gateway" "microservicio_dolar" "microservicio_producto" "microservicio_proveedor" "microservicio_tipo_producto")

for service in "${services[@]}"; do
  echo "Construyendo $service..."
  docker build -t "offline-first/$service:latest" -f "$service/Dockerfile" .
done

echo "✅ Todas las imágenes construidas"
echo "Para iniciar: docker-compose up -d"