# GeoSurePath Dockerfile v1.2.0
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew assemble

# Stage 2: Build Traccar Frontend (React)
FROM node:22-alpine AS web-build
WORKDIR /app/traccar-web
COPY traccar-web/package*.json ./
RUN npm install --legacy-peer-deps
COPY traccar-web/ .
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# Stage 3: Run Traccar
FROM eclipse-temurin:21-jre-alpine
WORKDIR /opt/traccar
RUN apk add --no-cache curl && mkdir logs

# Copy backend
# build.gradle explicitly sets jar output to target/ (line 20) and libs to target/lib/
COPY --from=build /app/target/*.jar ./tracker-server.jar
COPY --from=build /app/target/lib ./lib
COPY --from=build /app/schema ./schema
COPY --from=build /app/templates ./templates

# Copy frontend
COPY --from=web-build /app/traccar-web/build ./modern

# Copy configuration
COPY docker/traccar.xml ./conf/traccar.xml

EXPOSE 8082
# Use environment variable for Java Options to support performance tuning
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -XX:+UseG1GC -Djava.net.preferIPv4Stack=true -jar tracker-server.jar conf/traccar.xml"]
