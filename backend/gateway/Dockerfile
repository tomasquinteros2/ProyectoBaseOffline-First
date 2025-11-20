ARG JAVA_VERSION=17
ARG MODULE=gateway
ARG PORT=8090

FROM maven:3.9.9-eclipse-temurin-${JAVA_VERSION} AS build
ARG MODULE
WORKDIR /app

COPY pom.xml .
COPY ${MODULE}/pom.xml ./${MODULE}/
RUN mvn -q -B -f ./${MODULE}/pom.xml dependency:go-offline

COPY ${MODULE}/src ./${MODULE}/src
RUN mvn -q -B -f ./${MODULE}/pom.xml clean package -DskipTests

FROM eclipse-temurin:${JAVA_VERSION}-jre-jammy AS runtime
ARG MODULE
ARG PORT
WORKDIR /app

ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xms128m -Xmx256m -XX:MaxMetaspaceSize=96m -XX:MaxDirectMemorySize=64m -XX:+ExitOnOutOfMemoryError -Dspring.main.lazy-initialization=true -Dreactor.netty.ioWorkerCount=2 -Dserver.port=\${PORT:8090}"

COPY --from=build /app/${MODULE}/target/*.jar /app/app.jar

EXPOSE ${PORT}
ENTRYPOINT [ "sh", "-c", "java $JAVA_TOOL_OPTIONS -jar /app/app.jar" ]