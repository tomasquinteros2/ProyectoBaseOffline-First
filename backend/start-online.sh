#!/bin/bash
docker-compose -f docker-compose.online.yml up -d
echo "Sistema ONLINE iniciado. Accede en: http://localhost:9090"