package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"sink/db"
)

type PresignUploadResponse struct {
	Status string `json:"status"`
	Data   struct {
		SignedURL string `json:"signed_url"`
	} `json:"data"`
}

func PresignUploadHandler(picture_store *db.PictureStore) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

		log.Printf("[sink] handling presign")

		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			Key         string `json:"key"`
			ContentType string `json:"content_type"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON payload", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		key := strings.TrimSpace(req.Key)
		if key == "" {
			http.Error(w, "key is required", http.StatusBadRequest)
			return
		}

		contentType := strings.TrimSpace(req.ContentType)
		if contentType == "" {
			contentType = "application/octet-stream" // default content type
		}

		signedURL, err := picture_store.PresignUpload(r.Context(), key, contentType)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to generate presigned URL: %v", err), http.StatusInternalServerError)
			return
		}

		resp := PresignUploadResponse{
			Status: "ok",
			Data: struct {
				SignedURL string `json:"signed_url"`
			}{
				SignedURL: signedURL,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
