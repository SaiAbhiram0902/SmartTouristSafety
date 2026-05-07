# Step 1: Build the application
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Step 2: Run the application
# Using eclipse-temurin because it's officially supported and reliable
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/SmartTouristSafety-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
