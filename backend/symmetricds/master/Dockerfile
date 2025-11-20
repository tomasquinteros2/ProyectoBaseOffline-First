FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# Instalar herramientas necesarias
RUN apk add --no-cache \
    postgresql-client \
    bash \
    dos2unix \
    curl

# Copiar TODA la carpeta de SymmetricDS
COPY symmetricds/symmetric-ds-3.14.0 /app/symmetric-ds-3.14.0

# Crear enlace simbólico para que SymmetricDS encuentre los archivos
RUN ln -s /app/symmetric-ds-3.14.0 /app/bin

# Copiar archivo de configuración DEL MASTER
COPY symmetricds/master/engines/master.properties /app/symmetric-ds-3.14.0/engines/master.properties

# Verificar que master.properties fue copiado correctamente
RUN echo "=== Verificando master.properties ===" && \
    cat /app/symmetric-ds-3.14.0/engines/master.properties | grep -E "(sync\.url|registration\.url)" && \
    echo "✅ master.properties copiado correctamente"

# Copiar scripts
COPY symmetricds/insert_config.sql /app/insert_config.sql
COPY symmetricds/master/init-symmetric-master.sh /app/init-symmetric-master.sh

# Convertir line endings y permisos
RUN dos2unix /app/init-symmetric-master.sh && \
    chmod +x /app/init-symmetric-master.sh && \
    chmod +x /app/symmetric-ds-3.14.0/bin/sym

# Variables de entorno
ENV JAVA_OPTS="-Xmx1024m"

EXPOSE 31415

CMD ["/bin/bash", "/app/init-symmetric-master.sh"]
