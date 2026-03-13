FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY . .
RUN mvn package -DskipTests
FROM eclipse-temurin:17-jre
COPY --from=builder /build/target/*.jar app.jar
EXPOSE 8080
CMD ["java","-jar","/app.jar"]