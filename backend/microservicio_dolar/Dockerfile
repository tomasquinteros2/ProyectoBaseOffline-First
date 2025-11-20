ARG JAVA_VERSION=17
ARG MODULE=microservicio_dolar
ARG PORT=8082

FROM maven:3.9.9-eclipse-temurin-${JAVA_VERSION} AS build
ARG MODULE
WORKDIR /app
COPY pom.xml .
COPY ${MODULE}/pom.xml ./${MODULE}/
RUN mvn -q -B -f ./${MODULE}/pom.xml dependency:go-offline
COPY ${MODULE}/src ./${MODULE}/src
RUN mvn -q -B -f ./${MODULE}/pom.xml clean package -DskipTests

FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine AS runtime
ARG MODULE
ARG PORT
WORKDIR /app

ENV JAVA_TOOL_OPTIONS="\
-XX:+UseSerialGC \
-XX:+ClassUnloading \
-XX:ActiveProcessorCount=1 \
-XX:ThreadStackSize=512k \
-Xms96m -Xmx176m \
-XX:MaxMetaspaceSize=96m \
-XX:ReservedCodeCacheSize=48m \
-XX:MaxDirectMemorySize=32m \
-XX:+ExitOnOutOfMemoryError \
-Dspring.main.lazy-initialization=true \
-Dserver.tomcat.threads.max=16 \
-Dserver.port=\${PORT:8082} \
"

COPY --from=build /app/${MODULE}/target/*.jar /app/app.jar
EXPOSE ${PORT}
ENTRYPOINT ["sh","-c","java $JAVA_TOOL_OPTIONS -jar /app/app.jar"]