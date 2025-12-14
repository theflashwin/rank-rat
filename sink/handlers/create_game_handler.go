package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"sink/db"
	"sink/middlewares"
	"sink/structs"
)

const (
	initialMu    float64 = 25.0
	initialSigma         = initialMu / 3.0
)

func CreateGameHandler(store *db.GameStore, redis_store *db.RedisStore) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		defer r.Body.Close()

		var payload structs.CreateGameRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid JSON payload", http.StatusBadRequest)
			return
		}

		payload.GameName = strings.TrimSpace(payload.GameName)
		payload.RoomCode = strings.TrimSpace(payload.RoomCode)

		if payload.GameName == "" || payload.RoomCode == "" {
			http.Error(w, "gameName and roomCode are required", http.StatusBadRequest)
			return
		}

		questions := buildQuestions(payload.Questions)
		if len(questions) == 0 {
			http.Error(w, "at least one question is required", http.StatusBadRequest)
			return
		}

		candidates := buildCandidates(payload.Candidates)
		if len(candidates) == 0 {
			http.Error(w, "at least one candidate is required", http.StatusBadRequest)
			return
		}

		leaderboard := buildLeaderboard(questions, candidates)

		// find game server mapping
		server, err := middlewares.GetLowestTrafficServer()
		if err != nil || strings.TrimSpace(server) == "" {
			err_msg := fmt.Sprintf("unable to store game: %v", err)
			http.Error(w, err_msg, http.StatusInternalServerError)
			return
		}

		// store in redis
		if err := redis_store.SetRoomServer(r.Context(), payload.RoomCode, server); err != nil {
			log.Printf("[sink] failed to set global room mapping %v", err)
			http.Error(w, "unable to store game", http.StatusInternalServerError)
			return
		}

		if err := store.UpsertGame(r.Context(), payload.RoomCode, payload.GameName, questions, candidates, leaderboard); err != nil {
			log.Printf("[sink] failed to store game %s: %v", payload.RoomCode, err)
			http.Error(w, "unable to store game", http.StatusInternalServerError)
			return
		}

		resp := structs.CreateGameResponse{
			Status:  "stored",
			Message: fmt.Sprintf("game %s saved", payload.RoomCode),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("[sink] failed to encode response: %v", err)
		}
	})
}

func buildQuestions(raw []string) []structs.Question {
	var results []structs.Question
	id := 1

	for _, q := range raw {
		val := strings.TrimSpace(q)
		if val == "" {
			continue
		}
		results = append(results, structs.Question{ID: id, Val: val})
		id++
	}

	return results
}

func buildCandidates(raw []structs.CandidateFields) []structs.Candidate {
	var results []structs.Candidate
	id := 1

	for _, candidate := range raw {
		first := strings.TrimSpace(candidate.FirstName)
		last := strings.TrimSpace(candidate.LastName)
		if first == "" && last == "" {
			continue
		}

		results = append(results, structs.Candidate{
			ID:         id,
			First_Name: first,
			Last_Name:  last,
			Picture:    strings.TrimSpace(candidate.Picture),
		})
		id++
	}

	return results
}

func buildLeaderboard(questions []structs.Question, candidates []structs.Candidate) structs.Leaderboard {
	board := make(structs.Leaderboard, len(questions))

	for _, question := range questions {
		entries := make(map[int]structs.Rating, len(candidates))
		for _, candidate := range candidates {
			entries[candidate.ID] = structs.Rating{Mu: initialMu, Sigma: initialSigma}
		}
		board[question.ID] = entries
	}

	return board
}
