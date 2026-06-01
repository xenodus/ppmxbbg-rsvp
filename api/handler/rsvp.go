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

type inboundRequest struct {
	Method  string
	Query   map[string]string
	Body    string
	Origin  string
	UseV2   bool
}

// RSVP handles both HTTP API payload format 1.0 and 2.0 events.
func RSVP(ctx context.Context, raw json.RawMessage) (json.RawMessage, error) {
	in, err := parseInbound(raw)
	if err != nil {
		resp, encErr := encodeResponse(false, apiResponse{
			StatusCode: http.StatusBadRequest,
			Body:       `{"error":"invalid request"}`,
		}, nil)
		return resp, encErr
	}

	resp, err := dispatch(ctx, in)
	return encodeResponse(in.UseV2, resp, err)
}

func parseInbound(raw json.RawMessage) (inboundRequest, error) {
	var meta struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(raw, &meta); err != nil {
		return inboundRequest{}, err
	}

	if meta.Version == "2.0" {
		var req events.APIGatewayV2HTTPRequest
		if err := json.Unmarshal(raw, &req); err != nil {
			return inboundRequest{}, err
		}

		method := req.RequestContext.HTTP.Method
		if method == "" {
			method = methodFromRouteKey(req.RouteKey)
		}

		return inboundRequest{
			Method: method,
			Query:  req.QueryStringParameters,
			Body:   req.Body,
			Origin: headerOrigin(req.Headers),
			UseV2:  true,
		}, nil
	}

	var req events.APIGatewayProxyRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		return inboundRequest{}, err
	}

	return inboundRequest{
		Method: req.HTTPMethod,
		Query:  req.QueryStringParameters,
		Body:   req.Body,
		Origin: headerOrigin(req.Headers),
		UseV2:  false,
	}, nil
}

func methodFromRouteKey(routeKey string) string {
	parts := strings.SplitN(routeKey, " ", 2)
	if len(parts) != 2 {
		return ""
	}
	return strings.ToUpper(parts[0])
}

func headerOrigin(headers map[string]string) string {
	if headers == nil {
		return ""
	}
	if origin := headers["origin"]; origin != "" {
		return origin
	}
	return headers["Origin"]
}

func dispatch(ctx context.Context, in inboundRequest) (apiResponse, error) {
	switch in.Method {
	case http.MethodOptions:
		return corsResponse(apiResponse{StatusCode: http.StatusNoContent}, in.Origin, "GET, POST, OPTIONS")
	case http.MethodGet:
		return handleGet(ctx, in.Query, in.Origin)
	case http.MethodPost:
		return handlePost(ctx, in.Body, in.Origin)
	default:
		log.Printf("unsupported method %q", in.Method)
		return corsResponse(apiResponse{
			StatusCode: http.StatusMethodNotAllowed,
			Body:       `{"error":"method not allowed"}`,
		}, in.Origin, "GET, POST, OPTIONS")
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

func encodeResponse(useV2 bool, resp apiResponse, err error) (json.RawMessage, error) {
	if err != nil {
		return nil, err
	}

	if useV2 {
		return json.Marshal(events.APIGatewayV2HTTPResponse{
			StatusCode: resp.StatusCode,
			Body:       resp.Body,
			Headers:    resp.Headers,
		})
	}

	return json.Marshal(events.APIGatewayProxyResponse{
		StatusCode: resp.StatusCode,
		Body:       resp.Body,
		Headers:    resp.Headers,
	})
}
