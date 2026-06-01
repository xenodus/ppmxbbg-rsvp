package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"strings"

	"ppmxbbg-rsvp/pkg/config"
	"ppmxbbg-rsvp/store"

	"github.com/aws/aws-lambda-go/events"
)

type errorResponse struct {
	Error string `json:"error"`
}

func RSVP(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	origin := request.Headers["origin"]

	if request.HTTPMethod == "OPTIONS" {
		return corsResponse(events.APIGatewayProxyResponse{StatusCode: http.StatusNoContent}, origin, "GET, POST, OPTIONS")
	}

	switch request.HTTPMethod {
	case http.MethodGet:
		return handleGet(ctx, request, origin)
	case http.MethodPost:
		return handlePost(ctx, request, origin)
	default:
		return corsResponse(events.APIGatewayProxyResponse{
			StatusCode: http.StatusMethodNotAllowed,
			Body:       `{"error":"method not allowed"}`,
		}, origin, "GET, POST, OPTIONS")
	}
}

func handleGet(ctx context.Context, request events.APIGatewayProxyRequest, origin string) (events.APIGatewayProxyResponse, error) {
	id := strings.TrimSpace(request.QueryStringParameters["id"])
	if id == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	guest, err := store.GetGuest(ctx, id)
	if errors.Is(err, store.ErrGuestNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "guest not found"}, origin)
	}
	if err != nil {
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to load guest"}, origin)
	}

	return jsonResponse(http.StatusOK, guest, origin)
}

func handlePost(ctx context.Context, request events.APIGatewayProxyRequest, origin string) (events.APIGatewayProxyResponse, error) {
	var guest store.Guest
	if err := json.Unmarshal([]byte(request.Body), &guest); err != nil {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin)
	}

	guest.ID = strings.TrimSpace(guest.ID)
	guest.Name = strings.TrimSpace(guest.Name)

	if guest.ID == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}
	if guest.Name == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "name is required"}, origin)
	}

	if err := store.SaveGuest(ctx, guest); errors.Is(err, store.ErrGuestNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "guest not found"}, origin)
	} else if err != nil {
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to save guest"}, origin)
	}

	updated, err := store.GetGuest(ctx, guest.ID)
	if err != nil {
		return jsonResponse(http.StatusOK, map[string]string{"status": "saved"}, origin)
	}

	return jsonResponse(http.StatusOK, updated, origin)
}

func jsonResponse(status int, payload any, origin string) (events.APIGatewayProxyResponse, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		return corsResponse(events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error":"failed to encode response"}`,
		}, origin, "GET, POST, OPTIONS")
	}

	return corsResponse(events.APIGatewayProxyResponse{
		StatusCode: status,
		Body:       buf.String(),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}, origin, "GET, POST, OPTIONS")
}

func corsResponse(response events.APIGatewayProxyResponse, origin, methods string) (events.APIGatewayProxyResponse, error) {
	allowed := config.GetAllowedOrigins()
	if origin != "" && slices.Contains(allowed, origin) {
		if response.Headers == nil {
			response.Headers = map[string]string{}
		}
		response.Headers["Access-Control-Allow-Origin"] = origin
		response.Headers["Access-Control-Allow-Methods"] = methods
		response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
		response.Headers["Vary"] = "Origin"
	}

	return response, nil
}
