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
	Path    string
	Query   map[string]string
	Body    string
	Origin  string
	Headers map[string]string
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
			Path:   normalizePath(req.RawPath, req.RequestContext.Stage),
			Query:  req.QueryStringParameters,
			Body:   req.Body,
			Origin:  headerOrigin(req.Headers),
			Headers: req.Headers,
			UseV2:   true,
		}, nil
	}

	var req events.APIGatewayProxyRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		return inboundRequest{}, err
	}

	return inboundRequest{
		Method: req.HTTPMethod,
		Path:   normalizePath(req.Path, req.RequestContext.Stage),
		Query:  req.QueryStringParameters,
		Body:   req.Body,
		Origin:  headerOrigin(req.Headers),
		Headers: req.Headers,
		UseV2:   false,
	}, nil
}

func normalizePath(path, stage string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if idx := strings.Index(path, "?"); idx >= 0 {
		path = path[:idx]
	}
	return stripAPIStage(path, stage)
}

// stripAPIStage removes a leading /{stage} segment from HTTP API paths when the
// invoke URL includes a named stage (e.g. .../prod/admin/login → /admin/login).
func stripAPIStage(path, stage string) string {
	stage = strings.TrimSpace(stage)
	if stage == "" || stage == "$default" {
		return path
	}
	prefix := "/" + stage
	if path == prefix {
		return "/"
	}
	if strings.HasPrefix(path, prefix+"/") {
		return path[len(prefix):]
	}
	return path
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
	if isAdminPath(in.Path) {
		return dispatchAdmin(ctx, in)
	}

	switch in.Method {
	case http.MethodOptions:
		return corsResponse(apiResponse{StatusCode: http.StatusNoContent}, in.Origin, "GET, POST, OPTIONS")
	case http.MethodGet:
		switch in.Path {
		case "/guest":
			return handleGetInvite(ctx, in.Query, in.Origin)
		default:
			return jsonResponse(http.StatusNotFound, errorResponse{Error: "not found"}, in.Origin)
		}
	case http.MethodPost:
		switch in.Path {
		case "/guest":
			return handlePost(ctx, in.Body, in.Origin)
		default:
			return jsonResponse(http.StatusNotFound, errorResponse{Error: "not found"}, in.Origin)
		}
	default:
		log.Printf("unsupported method %q on %q", in.Method, in.Path)
		return corsResponse(apiResponse{
			StatusCode: http.StatusMethodNotAllowed,
			Body:       `{"error":"method not allowed"}`,
		}, in.Origin, "GET, POST, OPTIONS")
	}
}

func handleGetInvite(ctx context.Context, params map[string]string, origin string) (apiResponse, error) {
	id := ""
	if params != nil {
		id = strings.TrimSpace(params["id"])
	}
	if id == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	invite, err := store.GetInvite(ctx, id)
	if errors.Is(err, store.ErrInviteNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin)
	}
	if err != nil {
		log.Printf("get invite %s: %v", id, err)
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to load invite"}, origin)
	}

	return jsonResponse(http.StatusOK, invite, origin)
}

func handlePost(ctx context.Context, body string, origin string) (apiResponse, error) {
	var probe struct {
		DeclineAll     *bool `json:"decline_all"`
		RequireParking *bool `json:"require_parking"`
	}
	if err := json.Unmarshal([]byte(body), &probe); err != nil {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin)
	}

	if probe.DeclineAll != nil && *probe.DeclineAll {
		return handleDeclineAll(ctx, body, origin)
	}

	if probe.RequireParking != nil {
		return handlePostInvite(ctx, body, origin)
	}

	return handlePostGuest(ctx, body, origin)
}

func handleDeclineAll(ctx context.Context, body string, origin string) (apiResponse, error) {
	var req struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin)
	}

	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	if err := store.DeclineAllGuests(ctx, req.ID); errors.Is(err, store.ErrInviteNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin)
	} else if err != nil {
		log.Printf("decline all guests for invite %s: %v", req.ID, err)
		return jsonResponse(http.StatusInternalServerError, errorResponse{Error: "failed to save response"}, origin)
	}

	updated, err := store.GetInvite(ctx, req.ID)
	if err != nil {
		return jsonResponse(http.StatusOK, map[string]string{"status": "saved"}, origin)
	}

	return jsonResponse(http.StatusOK, updated, origin)
}

func handlePostInvite(ctx context.Context, body string, origin string) (apiResponse, error) {
	var update store.InviteUpdate
	if err := json.Unmarshal([]byte(body), &update); err != nil {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin)
	}

	update.ID = strings.TrimSpace(update.ID)
	if update.ID == "" {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	if err := store.SaveInvite(ctx, update); errors.Is(err, store.ErrInviteNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin)
	} else if err != nil {
		log.Printf("save invite %s: %v", update.ID, err)
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: err.Error()}, origin)
	}

	updated, err := store.GetInvite(ctx, update.ID)
	if err != nil {
		return jsonResponse(http.StatusOK, map[string]string{"status": "saved"}, origin)
	}

	return jsonResponse(http.StatusOK, updated, origin)
}

func handlePostGuest(ctx context.Context, body string, origin string) (apiResponse, error) {
	var update store.GuestUpdate
	if err := json.Unmarshal([]byte(body), &update); err != nil {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin)
	}

	if update.ID == 0 {
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin)
	}

	if err := store.SaveGuest(ctx, update); errors.Is(err, store.ErrGuestNotFound) {
		return jsonResponse(http.StatusNotFound, errorResponse{Error: "guest not found"}, origin)
	} else if err != nil {
		log.Printf("save guest %d: %v", update.ID, err)
		return jsonResponse(http.StatusBadRequest, errorResponse{Error: err.Error()}, origin)
	}

	return jsonResponse(http.StatusOK, map[string]string{"status": "saved"}, origin)
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
