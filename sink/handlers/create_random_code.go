package handlers

import (
	"encoding/json"
	"net/http"
	"sink/db"
	"sink/middlewares"
)

type CreateRandomCodeResponse struct {
	Status string `json:"status"`
	Data   struct {
		GameCode string `json:"game_code"`
	} `json:"data"`
}

func CreateRandomCode(store *db.GameStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		candidate_code, err := middlewares.GenerateRandomCode()

		if err != nil {
			http.Error(w, "method crashed", http.StatusInternalServerError)
			return
		}

		for store.DoesGameExist(candidate_code) {

			candidate_code, err = middlewares.GenerateRandomCode()

			if err != nil {
				http.Error(w, "method crashed", http.StatusInternalServerError)
				return
			}

		}

		resp := CreateRandomCodeResponse{
			Status: "ok",
			Data: struct {
				GameCode string `json:"game_code"`
			}{
				GameCode: candidate_code,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)

	}
}
