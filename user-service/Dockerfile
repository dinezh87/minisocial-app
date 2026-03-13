FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go mod tidy
RUN go build -o user-service


FROM gcr.io/distroless/base
COPY --from=builder /app/user-service /
EXPOSE 8080
CMD ["/user-service"]