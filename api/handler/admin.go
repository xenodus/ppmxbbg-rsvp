package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"ppmxbbg-rsvp/pkg/auth"
	"ppmxbbg-rsvp/pkg/idgen"
	"ppmxbbg-rsvp/store"
)

const adminCORSMethods = "GET, POST, PATCH, DELETE, OPTIONS"
const adminCORSHeaders = "Content-Type, Authorization"

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
}

type createInviteRequest struct {
	Guests []string `json:"guests"`
	IsSent *bool    `json:"is_sent"`
}

type createInviteResponse struct {
	Invite *store.AdminInvite `json:"invite"`
}

func isAdminPath(path string) bool {
	return path == "/admin/login" || path == "/admin/invites"
}

func dispatchAdmin(ctx context.Context, in inboundRequest) (apiResponse, error) {
	if in.Method == http.MethodOptions {
		return corsResponseWithHeaders(apiResponse{StatusCode: http.StatusNoContent}, in.Origin, adminCORSMethods, adminCORSHeaders)
	}

	switch in.Path {
	case "/admin/login":
		if in.Method == http.MethodPost {
			return handleAdminLogin(in.Body, in.Origin)
		}
	case "/admin/invites":
		switch in.Method {
		case http.MethodGet:
			if err := requireAdmin(in.Headers); err != nil {
				return adminUnauthorized(in.Origin, err)
			}
			return handleAdminListInvites(ctx, in.Query, in.Origin)
		case http.MethodPost:
			if err := requireAdmin(in.Headers); err != nil {
				return adminUnauthorized(in.Origin, err)
			}
			return handleAdminCreateInvite(ctx, in.Body, in.Origin)
		case http.MethodPatch:
			if err := requireAdmin(in.Headers); err != nil {
				return adminUnauthorized(in.Origin, err)
			}
			return handleAdminPatchInvite(ctx, in.Body, in.Origin)
		case http.MethodDelete:
			if err := requireAdmin(in.Headers); err != nil {
				return adminUnauthorized(in.Origin, err)
			}
			return handleAdminDeleteInvite(ctx, in.Query, in.Origin)
		}
	}

	return jsonResponseWithCORS(http.StatusNotFound, errorResponse{Error: "not found"}, in.Origin, adminCORSMethods, adminCORSHeaders)
}

func handleAdminLogin(body, origin string) (apiResponse, error) {
	var req loginRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "username and password are required"}, origin, adminCORSMethods, adminCORSHeaders)
	}

	err := auth.CheckCredentials(req.Username, req.Password)
	if errors.Is(err, auth.ErrAdminNotConfigured) {
		return jsonResponseWithCORS(http.StatusServiceUnavailable, errorResponse{Error: "admin login is not configured"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	if errors.Is(err, auth.ErrInvalidCredentials) {
		return jsonResponseWithCORS(http.StatusUnauthorized, errorResponse{Error: "invalid username or password"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	if err != nil {
		return jsonResponseWithCORS(http.StatusInternalServerError, errorResponse{Error: "login failed"}, origin, adminCORSMethods, adminCORSHeaders)
	}

	token, expires, err := auth.IssueToken(req.Username)
	if err != nil {
		log.Printf("admin login issue token: %v", err)
		return jsonResponseWithCORS(http.StatusInternalServerError, errorResponse{Error: "login failed"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	return jsonResponseWithCORS(http.StatusOK, loginResponse{Token: token, ExpiresAt: auth.FormatExpires(expires)}, origin, adminCORSMethods, adminCORSHeaders)
}

func handleAdminListInvites(ctx context.Context, params map[string]string, origin string) (apiResponse, error) {
	if params != nil {
		if id := strings.TrimSpace(params["id"]); id != "" {
			invite, err := store.GetInvite(ctx, id)
			if errors.Is(err, store.ErrInviteNotFound) {
				return jsonResponseWithCORS(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin, adminCORSMethods, adminCORSHeaders)
			}
			if err != nil {
				return jsonResponseWithCORS(http.StatusInternalServerError, errorResponse{Error: "failed to load invite"}, origin, adminCORSMethods, adminCORSHeaders)
			}
			adminInvite, err := store.EnrichAdminInvite(ctx, invite)
			if err != nil {
				return jsonResponseWithCORS(http.StatusOK, invite, origin, adminCORSMethods, adminCORSHeaders)
			}
			return jsonResponseWithCORS(http.StatusOK, adminInvite, origin, adminCORSMethods, adminCORSHeaders)
		}
	}

	invites, err := store.ListInvites(ctx)
	if err != nil {
		log.Printf("admin list invites: %v", err)
		return jsonResponseWithCORS(http.StatusInternalServerError, errorResponse{Error: "failed to list invites"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	return jsonResponseWithCORS(http.StatusOK, invites, origin, adminCORSMethods, adminCORSHeaders)
}

func handleAdminCreateInvite(ctx context.Context, body, origin string) (apiResponse, error) {
	var req createInviteRequest
	if err := json.Unmarshal([]byte(body), &req); err != nil {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	invite, err := store.CreateInvite(ctx, idgen.NewInviteID(), store.CreateInviteInput{Guests: req.Guests, IsSent: req.IsSent})
	if err != nil {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: err.Error()}, origin, adminCORSMethods, adminCORSHeaders)
	}
	return jsonResponseWithCORS(http.StatusCreated, createInviteResponse{Invite: invite}, origin, adminCORSMethods, adminCORSHeaders)
}

func handleAdminPatchInvite(ctx context.Context, body, origin string) (apiResponse, error) {
	var patch store.AdminInvitePatch
	if err := json.Unmarshal([]byte(body), &patch); err != nil {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "invalid request body"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	patch.ID = strings.TrimSpace(patch.ID)
	if patch.ID == "" {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	if err := store.UpdateInviteAdmin(ctx, patch); errors.Is(err, store.ErrInviteNotFound) {
		return jsonResponseWithCORS(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin, adminCORSMethods, adminCORSHeaders)
	} else if err != nil {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: err.Error()}, origin, adminCORSMethods, adminCORSHeaders)
	}
	invites, _ := store.ListInvites(ctx)
	for _, item := range invites {
		if item.ID == patch.ID {
			return jsonResponseWithCORS(http.StatusOK, item, origin, adminCORSMethods, adminCORSHeaders)
		}
	}
	return jsonResponseWithCORS(http.StatusOK, map[string]string{"status": "saved"}, origin, adminCORSMethods, adminCORSHeaders)
}

func handleAdminDeleteInvite(ctx context.Context, params map[string]string, origin string) (apiResponse, error) {
	id := ""
	if params != nil {
		id = strings.TrimSpace(params["id"])
	}
	if id == "" {
		return jsonResponseWithCORS(http.StatusBadRequest, errorResponse{Error: "id is required"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	if err := store.DeleteInvite(ctx, id); errors.Is(err, store.ErrInviteNotFound) {
		return jsonResponseWithCORS(http.StatusNotFound, errorResponse{Error: "invite not found"}, origin, adminCORSMethods, adminCORSHeaders)
	} else if err != nil {
		return jsonResponseWithCORS(http.StatusInternalServerError, errorResponse{Error: "failed to delete invite"}, origin, adminCORSMethods, adminCORSHeaders)
	}
	return jsonResponseWithCORS(http.StatusOK, map[string]string{"status": "deleted"}, origin, adminCORSMethods, adminCORSHeaders)
}

func requireAdmin(headers map[string]string) error {
	if headers == nil {
		return auth.ErrInvalidToken
	}
	h := headers["authorization"]
	if h == "" {
		h = headers["Authorization"]
	}
	token := auth.BearerToken(h)
	if token == "" {
		return auth.ErrInvalidToken
	}
	return auth.ValidateToken(token)
}

func adminUnauthorized(origin string, err error) (apiResponse, error) {
	msg := "unauthorized"
	if errors.Is(err, auth.ErrAdminNotConfigured) {
		msg = "admin is not configured"
	}
	return jsonResponseWithCORS(http.StatusUnauthorized, errorResponse{Error: msg}, origin, adminCORSMethods, adminCORSHeaders)
}
