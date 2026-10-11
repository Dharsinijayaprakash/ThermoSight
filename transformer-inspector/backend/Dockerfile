# ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
# If Gradle wrapper is present:
RUN ./gradlew clean bootJar -x test

# ---- run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
# Copy fat jar
COPY --from=build /app/build/libs/*-SNAPSHOT.jar /app/app.jar
# Expose default port
EXPOSE 8080
# JVM opts: tune memory if needed
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]