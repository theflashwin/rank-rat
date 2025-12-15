package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"sink/db"
)

type DoesGameExistResponse struct {
	Status string `json:"status"`
	Data   struct {
		GameExists bool `json:"does_game_exist"`
	} `json:"data"`
}

func DoesGameExist(store *db.GameStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			RoomID string `json:"room_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON payload", http.StatusBadRequest)
			return
		}

		defer r.Body.Close()

		roomID := strings.TrimSpace(req.RoomID)
		roomID = strings.ToLower(roomID)
		if roomID == "" {
			http.Error(w, "room_id is required", http.StatusBadRequest)
			return
		}

		resp := DoesGameExistResponse{
			Status: "ok",
			Data: struct {
				GameExists bool `json:"does_game_exist"`
			}{GameExists: store.DoesGameExist(roomID)},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
