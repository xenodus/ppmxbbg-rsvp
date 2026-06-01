package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log"
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

type apiResponse struct {
	StatusCode int
	Body       string
	Headers    map[string]string
}

// RSVP handles HTTP API Gateway v2 events (payload format 2.0).
func RSVP(ctx context.Context, request events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	method := request.RequestContext.HTTP.Method
	origin := request.Headers["origin"]

	if method == http.MethodOptions {
		return toV2(corsResponse(apiResponse{StatusCode: http.StatusNoContent}, origin, "GET, POST, OPTIONS"))
	}

	switch method {
	case http.MethodGet:
		return toV2(handleGet(ctx, request.QueryStringParameters, origin))
	case http.MethodPost:
		return toV2(handlePost(ctx, request.Body, origin))
	default:
		return toV2(corsResponse(apiResponse{
			StatusCode: http.StatusMethodNotAllowed,
			Body:       `{"error":"method not allowed"}`,
		}, origin, "GET, POST, OPTIONS"))
	}
}

func handleGet(ctx context.Context, params map[string]string, origin string) (apiResponse, error) {
	id := ""
	if params != nil {
		id = strings.TrimSpace(params["id"])
	}
	if id == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	guest, err := store.GetGuest(ctx, id)
	if errors.Is(err, store.ErrGuestNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "guest not found"}, origin)
	}
	if err != nil {
		log.Printf("get guest %s: %v", id, err)
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to load guest"}, origin)
	}

	return jsonResponse(http.StatusOK, guest, origin)
}

func handlePost(ctx context.Context, body string, origin string) (apiResponse, error) {
	var guest store.Guest
	if err := json.Unmarshal([]byte(body), &guest); err != nil {
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
		log.Printf("save guest %s: %v", guest.ID, err)
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to save guest"}, origin)
	}

	updated, err := store.GetGuest(ctx, guest.ID)
	if err != nil {
		return jsonResponse(http.StatusOK, map[string]string{"status": "saved"}, origin)
	}

	return jsonResponse(http.StatusOK, updated, origin)
}

func jsonResponse(status int, payload any, origin string) (apiResponse, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		return corsResponse(apiResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error":"failed to encode response"}`,
		}, origin, "GET, POST, OPTIONS")
	}

	return corsResponse(apiResponse{
		StatusCode: status,
		Body:       buf.String(),
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}, origin, "GET, POST, OPTIONS")
}

func corsResponse(response apiResponse, origin, methods string) (apiResponse, error) {
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

func toV2(response apiResponse, err error) (events.APIGatewayV2HTTPResponse, error) {
	if err != nil {
		return events.APIGatewayV2HTTPResponse{}, err
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: response.StatusCode,
		Body:       response.Body,
		Headers:    response.Headers,
	}, nil
}
