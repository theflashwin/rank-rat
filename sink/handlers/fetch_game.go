package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sink/db"
	"sink/structs"
	"strings"
	"time"
)

type FetchGameResponse struct {
	Status string       `json:"status"`
	Data   structs.Game `json:"data"`
}

func FetchGameHandler(game_store *db.GameStore, picture_store *db.PictureStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract game_id from URL path: /fetch-game/<game_id>
		path := strings.TrimPrefix(r.URL.Path, "/")
		parts := strings.Split(path, "/")

		// Expected format: ["fetch-game", "<game_id>"]
		if len(parts) < 2 || parts[0] != "fetch-game" {
			http.Error(w, "invalid path format. Expected: /fetch-game/<game_id>", http.StatusBadRequest)
			return
		}

		gameID := strings.TrimSpace(parts[1])
		if gameID == "" {
			http.Error(w, "game_id is required", http.StatusBadRequest)
			return
		}

		gameID = strings.ToLower(gameID)

		game, err := game_store.GetGame(r.Context(), gameID)
		if err != nil {
			if errors.Is(err, db.ErrGameNotFound) {
				http.Error(w, "game not found", http.StatusNotFound)
				return
			}
			log.Printf("[sink] error fetching game %s: %v", gameID, err)
			http.Error(w, fmt.Sprintf("failed to fetch game: %v", err), http.StatusInternalServerError)
			return
		}

		// Presign candidate images
		for i := range game.Candidates {
			if game.Candidates[i].Picture != "" {
				newPicture, err := picture_store.PresignDownload(r.Context(), game.Candidates[i].Picture, time.Minute*20)
				if err != nil {
					log.Printf("[sink] could not presign candidate (%s %s)'s image: %v, skipping picture", game.Candidates[i].First_Name, game.Candidates[i].Last_Name, err)
					game.Candidates[i].Picture = ""
				} else {
					game.Candidates[i].Picture = newPicture
				}
			}
		}

		resp := FetchGameResponse{
			Status: "ok",
			Data:   game,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("[sink] failed to encode response: %v", err)
		}
	}
}
