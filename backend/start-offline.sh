#!/bin/bash

# 1. Verificar si el servicio de Docker está respondiendo.
#    Se redirige la salida a /dev/null para no mostrar mensajes de error de Docker.
echo "Verificando el estado de Docker..."
docker info > /dev/null 2>&1

# 2. Comprobar el código de salida del último comando ($?).
#    Si es diferente de 0, significa que el comando falló y Docker no está corriendo.
if [ $? -ne 0 ]; then
    echo "Docker no está iniciado. Abriendo Docker Desktop..."

    # Comando para abrir Docker Desktop en Windows (funciona en Git Bash).
    # El comando 'start' lo abre en segundo plano sin bloquear el script.
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    # 3. Esperar activamente a que el servicio de Docker esté listo.
    #    Este bucle intentará conectar con Docker cada 2 segundos.
    echo -n "Esperando a que el servicio de Docker esté disponible..."
    while ! docker info > /dev/null 2>&1; do
        # Imprime un punto para dar feedback visual de que está esperando.
        echo -n "."
        sleep 2
    done

    # Añade un salto de línea para un formato más limpio.
    echo
    echo "¡Docker está listo!"
fi

# 4. Una vez que Docker está confirmado, levanta los servicios.
echo "Iniciando los servicios con docker-compose..."
docker-compose up -d

echo "Sistema OFFLINE iniciado. Accede en: http://localhost:8090"
