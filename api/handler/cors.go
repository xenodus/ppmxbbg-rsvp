package handler

import (
	"bytes"
	"encoding/json"
	"net/http"

	"ppmxbbg-rsvp/pkg/config"
)

func jsonResponseWithCORS(status int, payload any, origin, methods, allowHeaders string) (apiResponse, error) {
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		return corsResponseWithHeaders(apiResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       `{"error":"failed to encode response"}`,
		}, origin, methods, allowHeaders)
	}
	return corsResponseWithHeaders(apiResponse{
		StatusCode: status,
		Body:       buf.String(),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, origin, methods, allowHeaders)
}

func corsResponseWithHeaders(response apiResponse, origin, methods, allowHeaders string) (apiResponse, error) {
	if config.IsOriginAllowed(origin) {
		if response.Headers == nil {
			response.Headers = map[string]string{}
		}
		response.Headers["Access-Control-Allow-Origin"] = origin
		response.Headers["Access-Control-Allow-Methods"] = methods
		response.Headers["Access-Control-Allow-Headers"] = allowHeaders
		response.Headers["Vary"] = "Origin"
	}
	return response, nil
}
