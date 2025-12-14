package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"server/structs"
)

var ErrGameNotFound = errors.New("game not found")

type GameStore struct {
	DB *sql.DB
}

// RatingUpdate represents a single leaderboard rating change.
type RatingUpdate struct {
	QuestionID  int
	CandidateID int
	Rating      structs.Rating
}

func (store GameStore) LoadGame(ctx context.Context, room_id string) (*structs.Game, error) {

	const query = `
		SELECT
			id,
			game_name,
			questions,
			candidates,
			leaderboard,
			num_candidates
		FROM games
		WHERE id = $1
		LIMIT 1`

	row := store.DB.QueryRowContext(ctx, query, room_id)

	var (
		game            structs.Game
		questionsJSON   []byte
		candidatesJSON  []byte
		leaderboardJSON []byte
		numCandidates   int8
	)

	if err := row.Scan(&game.ID, &game.GameName, &questionsJSON, &candidatesJSON, &leaderboardJSON, &numCandidates); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("[db] Game not found %v", err)
			return nil, ErrGameNotFound
		}

		log.Printf("[db] Error scanning: %v", err)
		return nil, err
	}

	if err := json.Unmarshal(questionsJSON, &game.Questions); err != nil {
		log.Printf("[db] Error decoding questions: %v", err)
		return nil, err
	}

	if err := json.Unmarshal(candidatesJSON, &game.Candidates); err != nil {
		log.Printf("[db] Error decoding candidates: %v", err)
		return nil, err
	}

	if err := json.Unmarshal(leaderboardJSON, &game.Leaderboard); err != nil {
		log.Printf("[db] Error decoding leaderboard: %v", err)
		return nil, err
	}

	game.NumCandidates = numCandidates
	game.Dirty = false
	return &game, nil

}

// UpdateCandidateRating updates a specific candidate's rating within the leaderboard JSON blob.
func (store GameStore) UpdateCandidateRating(ctx context.Context, gameID string, questionID, candidateID int, rating structs.Rating) error {
	update := RatingUpdate{
		QuestionID:  questionID,
		CandidateID: candidateID,
		Rating:      rating,
	}
	return store.UpdateCandidateRatings(ctx, gameID, []RatingUpdate{update})
}

// UpdateCandidateRatings applies multiple rating updates in a single database write.
func (store GameStore) UpdateCandidateRatings(ctx context.Context, gameID string, updates []RatingUpdate) error {
	if len(updates) == 0 {
		return nil
	}

	game, err := store.LoadGame(ctx, gameID)
	if err != nil {
		return err
	}

	if game.Leaderboard == nil {
		game.Leaderboard = make(structs.Leaderboard)
	}

	for _, update := range updates {
		if update.QuestionID <= 0 || update.CandidateID <= 0 {
			return fmt.Errorf("questionID and candidateID must be positive")
		}

		if _, ok := game.Leaderboard[update.QuestionID]; !ok {
			game.Leaderboard[update.QuestionID] = make(map[int]structs.Rating)
		}

		game.Leaderboard[update.QuestionID][update.CandidateID] = update.Rating
	}

	leaderboardJSON, err := json.Marshal(game.Leaderboard)
	if err != nil {
		return fmt.Errorf("encode leaderboard: %w", err)
	}

	const updateStmt = `
		UPDATE games
		SET leaderboard = $1
		WHERE id = $2`

	if _, err := store.DB.ExecContext(ctx, updateStmt, string(leaderboardJSON), gameID); err != nil {
		return fmt.Errorf("persist leaderboard: %w", err)
	}

	return nil
}
