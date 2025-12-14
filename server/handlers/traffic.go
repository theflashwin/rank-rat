package handlers

import (
	"encoding/json"
	"net/http"
	"runtime"
)

func TrafficResponse() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp := struct {
			Status string `json:"status"`
			Data   struct {
				NumGoroutines int `json:"num_goroutines"`
			} `json:"data"`
		}{
			Status: "ok",
		}

		resp.Data.NumGoroutines = runtime.NumGoroutine()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}
