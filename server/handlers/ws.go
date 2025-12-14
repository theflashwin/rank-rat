package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"

	"server/db"
	"server/structs"

	"github.com/mafredri/go-trueskill"
)

// aliasing
type Game = structs.Game

// cache entries for LRU approximation
type cachedEntry struct {
	key  string
	game *Game
}

// incoming message types
type MessageType string

const (
	Vote MessageType = "VOTE"
)

// Message Envelope
type Envelope struct {
	Type MessageType     `json:"type"`
	Data json.RawMessage `json:"data"`
}

// global variables - shared for each go routine
var (
	cache         sync.Map
	cacheSize     uint64
	gameStore     db.GameStore
	picture_store *db.PictureStore
)

// constants
const (
	MAX_CACHE_SIZE         uint64 = 10000 // at any point in time we store a max of 10,000 games
	LRU_SAMPLE_SIZE        uint64 = 100
	DEFAULT_NUM_CANDIDATES int    = 4
)

// TrueSkill params
const (
	MU    float64 = 25.0
	SIGMA float64 = MU / 3.0
	BETA  float64 = SIGMA / 2.0
	TAU   float64 = SIGMA / 100.0
	DRAW  float64 = 0.00
)

var tsEnv trueskill.Config

// websocket upgrader
var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func init() {
	// Get postgres connection string from environment variable
	connString := os.Getenv("POSTGRES_CONN_STRING")
	if connString == "" {
		connString = "postgres://dev:dev@localhost:5432/devdb?sslmode=disable"
	}

	sqlDB, err := sql.Open("postgres", connString)

	if err != nil {
		log.Fatalf("[handler] failed to open DB: %v", err)
	}

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("[handler] failed to ping DB: %v", err)
	}

	gameStore = db.GameStore{DB: sqlDB}

	tsEnv = trueskill.New(
		trueskill.Mu(MU),
		trueskill.Sigma(SIGMA),
		trueskill.Beta(BETA),
		trueskill.Tau(TAU),
		trueskill.DrawProbabilityZero(),
	)

}

func sampleEntries(k int) []cachedEntry {
	if k <= 0 {
		return nil
	}

	var samples []cachedEntry
	i := 0

	cache.Range(func(key, value any) bool {
		game, ok := value.(*Game)
		if !ok {
			return true
		}

		roomID, ok := key.(string)
		if !ok {
			return true
		}

		if i < k {
			samples = append(samples, cachedEntry{key: roomID, game: game})
		} else {
			j := rand.IntN(i + 1)
			if j < k {
				samples[j] = cachedEntry{key: roomID, game: game}
			}
		}
		i++
		return true
	})
	return samples
}

func cacheInsert(roomID string, game *Game) {
	game.LastAcsess = time.Now()

	if atomic.LoadUint64(&cacheSize) >= MAX_CACHE_SIZE {
		evictRandomLRU()
	}

	if _, loaded := cache.LoadOrStore(roomID, game); loaded {
		cache.Store(roomID, game)
	} else {
		atomic.AddUint64(&cacheSize, 1)
	}
}

func evictRandomLRU() {
	samples := sampleEntries(int(LRU_SAMPLE_SIZE))
	if len(samples) == 0 {
		return
	}

	oldest := samples[0]
	for _, entry := range samples[1:] {
		if entry.game.LastAcsess.Before(oldest.game.LastAcsess) {
			oldest = entry
		}
	}

	cache.Delete(oldest.key)
	atomic.AddUint64(&cacheSize, ^uint64(0))
}

// Websocket returns the handler responsible for the /ws endpoint.
func Websocket(port int, picture_store_in *db.PictureStore) http.HandlerFunc {

	picture_store = picture_store_in

	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("[server %d] Incoming request path=%s\n", port, r.URL.Path)

		roomID, err := parseRoomID(r.URL.Path)
		if err != nil {
			fmt.Printf("[server %d] invalid websocket path\n", port)
			http.Error(w, "invalid websocket path", http.StatusBadRequest)
			return
		}

		game, err := getGame(r.Context(), roomID)
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, db.ErrGameNotFound) {
				status = http.StatusNotFound
			}
			fmt.Printf("[server %d] couldn't load room\n", port)
			http.Error(w, "unable to load room", status)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[upgrader] websocket upgrade failed: %v", err)
			return
		}

		ctx, cancel := context.WithCancel(context.Background())
		go handleConnection(conn, game, roomID, ctx, cancel)
	}
}

func parseRoomID(path string) (string, error) {
	const prefix = "/ws/"
	if !strings.HasPrefix(path, prefix) {
		return "", fmt.Errorf("path missing /ws/ prefix")
	}

	roomID := strings.TrimPrefix(path, prefix)
	if roomID == "" || strings.Contains(roomID, "/") {
		return "", fmt.Errorf("invalid room id")
	}

	return roomID, nil
}

func getGame(ctx context.Context, roomID string) (*Game, error) {
	if val, ok := cache.Load(roomID); ok {
		if game, ok := val.(*Game); ok {
			game.LastAcsess = time.Now()
			return game, nil
		}
	}

	game, err := gameStore.LoadGame(ctx, roomID)
	if err != nil {
		log.Printf("[game getter] Error Loading the game")
		return nil, err
	}

	cacheInsert(roomID, game)
	return game, nil
}

func min(a int, b int) int {
	if a < b {
		return a
	}
	return b
}

func dedupeCandidates(candidates []structs.Candidate) []structs.Candidate {
	if len(candidates) <= 1 {
		return candidates
	}

	seen := make(map[string]struct{})
	result := make([]structs.Candidate, 0, len(candidates))

	for _, candidate := range candidates {
		key := candidateKey(candidate)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, candidate)
	}

	return result
}

func candidateKey(candidate structs.Candidate) string {
	if candidate.ID != 0 {
		return strconv.Itoa(candidate.ID)
	}
	first := strings.ToLower(strings.TrimSpace(candidate.First_Name))
	last := strings.ToLower(strings.TrimSpace(candidate.Last_Name))
	return first + "|" + last
}

func parseEnvelope(msgType int, payload []byte) (Envelope, error) {

	if msgType != websocket.TextMessage {
		return Envelope{}, fmt.Errorf("unsupported frame opcode %d", msgType)
	}

	var env Envelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return Envelope{}, err
	}

	return env, nil

}

func sampleRound(game *Game, ctx context.Context) structs.Round {
	numQuestions := len(game.Questions)
	// uniqueCandidates := dedupeCandidates(game.Candidates)
	uniqueCandidates := game.Candidates
	totalCandidates := len(uniqueCandidates)

	if numQuestions == 0 || totalCandidates == 0 {
		return structs.Round{GameID: game.ID}
	}

	// choose some question at random
	questionIdx := rand.IntN(numQuestions)
	question := game.Questions[questionIdx]

	// determine how many unique candidates we can show
	// roundSize := int(game.NumCandidates)
	roundSize := DEFAULT_NUM_CANDIDATES
	if roundSize <= 0 {
		roundSize = totalCandidates
	}
	roundSize = min(roundSize, totalCandidates)

	// choose candidates at random
	var candidates []structs.Candidate
	for _, idx := range rand.Perm(totalCandidates)[:roundSize] {

		// create a copy of the candidate with a presigned URL
		new_candidate := uniqueCandidates[idx]

		// Only generate presigned URL if there's a picture key
		if new_candidate.Picture != "" {
			new_picture, err := picture_store.PresignDownload(ctx, new_candidate.Picture, 20*time.Minute)
			if err != nil {
				log.Printf("[server] [ws] could not sign an image for key '%s': %v", new_candidate.Picture, err)
				// Continue without picture rather than skipping the candidate
				new_candidate.Picture = ""
			} else {
				new_candidate.Picture = new_picture
			}
		}

		candidates = append(candidates, new_candidate)
	}

	return structs.Round{GameID: game.ID, Question: question, Candidates: candidates}

}

func parseVote(payload json.RawMessage) (structs.Vote, error) {
	if len(payload) == 0 {
		return structs.Vote{}, fmt.Errorf("empty vote payload")
	}

	var vote structs.Vote
	if err := json.Unmarshal(payload, &vote); err != nil {
		return structs.Vote{}, fmt.Errorf("invalid vote payload: %w", err)
	}

	if vote.GameID == "" {
		return structs.Vote{}, fmt.Errorf("vote missing game_id")
	}

	if vote.QuestionID == 0 {
		return structs.Vote{}, fmt.Errorf("vote missing question_id")
	}

	if vote.WinnerID == 0 {
		return structs.Vote{}, fmt.Errorf("vote missing winner_id")
	}

	return vote, nil
}

func handleVote(game *Game, round *structs.Round, vote *structs.Vote, ctx context.Context) {
	questionID := vote.QuestionID

	// Winner
	wRaw := game.Leaderboard[questionID][vote.WinnerID]
	winner := trueskill.NewPlayer(wRaw.Mu, wRaw.Sigma)

	// Losers
	var losers []trueskill.Player
	var loserIDs []int

	for _, c := range round.Candidates {
		if c.ID == vote.WinnerID {
			continue
		}
		lr := game.Leaderboard[questionID][c.ID]
		losers = append(losers, trueskill.NewPlayer(lr.Mu, lr.Sigma))
		loserIDs = append(loserIDs, c.ID)
	}

	// Need at least one loser to run TrueSkill; otherwise skip update.
	if len(losers) == 0 {
		log.Printf("[handler] skipping rating update: only one candidate present for question=%d", questionID)
		return
	}

	// Build player slice: [winner, loser1, loser2, ...]
	players := []trueskill.Player{winner}
	players = append(players, losers...)

	// Run TrueSkill update (winner beats all others)
	newSkills, _ := tsEnv.AdjustSkills(players, false)

	// rating updates for the postgres db
	var ratingUpdates []db.RatingUpdate

	// Write winner back to cache
	nw := newSkills[0]
	game.Leaderboard[questionID][vote.WinnerID] = structs.Rating{
		Mu:    nw.Mu(),
		Sigma: nw.Sigma(),
	}
	ratingUpdates = append(ratingUpdates,
		db.RatingUpdate{QuestionID: questionID,
			CandidateID: vote.WinnerID,
			Rating:      structs.Rating{Mu: nw.Mu(), Sigma: nw.Sigma()},
		})

	// Write losers back to cache
	for i, id := range loserIDs {

		nr := newSkills[i+1] // +1 because index 0 is winner

		game.Leaderboard[questionID][id] = structs.Rating{
			Mu:    nr.Mu(),
			Sigma: nr.Sigma(),
		}

		ratingUpdates = append(ratingUpdates, db.RatingUpdate{QuestionID: questionID,
			CandidateID: id,
			Rating:      structs.Rating{Mu: nr.Mu(), Sigma: nr.Sigma()},
		})

	}

	// do the db update off the critical path
	go func() {
		if err := gameStore.UpdateCandidateRatings(ctx, game.ID, ratingUpdates); err != nil {
			log.Printf("[handler] failed to persist ratings for game=%s: %v", game.ID, err)
		}
	}()

}

func handleConnection(conn *websocket.Conn, game *Game, roomID string, ctx context.Context, cancel context.CancelFunc) {
	defer conn.Close()
	defer cancel()

	log.Printf("[handler] websocket connected room=%s game=%s", roomID, game.ID)

	// send initial round
	var round structs.Round = sampleRound(game, ctx)

	if err := conn.WriteJSON(round); err != nil {
		log.Printf("[handler] failed to send initial round room=%s: %v", roomID, err)
		return
	}

	for {

		msgType, payload, err := conn.ReadMessage()

		// handle read errors
		if err != nil {
			log.Printf("[handler] read error room=%s: %v", roomID, err)
			break
		}

		env, err := parseEnvelope(msgType, payload)

		if err != nil {
			log.Printf("[handler] bad message: %v", err)
			continue
		}

		switch env.Type {
		case Vote:

			vote, err := parseVote(env.Data)

			if err != nil {
				log.Printf("[handler] invalid vote payload: %v", err)
				continue
			}

			log.Printf("[handler] received vote: %+v", vote)

			handleVote(game, &round, &vote, ctx)

		default:
			log.Printf("[handler] unknown message type %s", env.Type)
		}

		// send back some data
		round = sampleRound(game, ctx)

		if err := conn.WriteJSON(round); err != nil {
			log.Printf("[handler] failed to send round room=%s: %v", roomID, err)
			return
		}

	}

}
