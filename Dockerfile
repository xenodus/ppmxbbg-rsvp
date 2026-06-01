FROM golang:1.23-alpine AS build
WORKDIR /ppmxbbg-rsvp
COPY api ./api
WORKDIR /ppmxbbg-rsvp/api
RUN go mod download
RUN env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o main cmd/main.go

FROM gcr.io/distroless/static-debian12
COPY --from=build /ppmxbbg-rsvp/api/main /main
ENTRYPOINT ["/main"]
