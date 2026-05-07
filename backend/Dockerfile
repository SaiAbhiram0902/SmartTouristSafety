# Step 1: Build
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Step 2: Run
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/SmartTouristSafety-backend-1.0.0.jar app.jar
EXPOSE 8080
# Spring Boot will automatically pick up the $PORT variable from Render
ENTRYPOINT ["java", "-jar", "app.jar"]
