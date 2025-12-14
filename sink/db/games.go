package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"sink/structs"
)

var ErrGameNotFound = errors.New("game not found")

type GameStore struct {
	DB *sql.DB
}

func (store GameStore) UpsertGame(ctx context.Context, roomCode, gameName string, questions []structs.Question, candidates []structs.Candidate, leaderboard structs.Leaderboard) error {
	const stmt = `
	INSERT INTO games (id, game_name, questions, candidates, leaderboard, num_candidates)
	VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6)
	ON CONFLICT (id) DO UPDATE
	SET game_name = EXCLUDED.game_name,
		questions = EXCLUDED.questions,
		candidates = EXCLUDED.candidates,
		leaderboard = EXCLUDED.leaderboard,
		num_candidates = EXCLUDED.num_candidates;
	`

	questionsJSON, err := json.Marshal(questions)
	if err != nil {
		return fmt.Errorf("encode questions: %w", err)
	}

	candidatesJSON, err := json.Marshal(candidates)
	if err != nil {
		return fmt.Errorf("encode candidates: %w", err)
	}

	leaderboardJSON, err := json.Marshal(leaderboard)
	if err != nil {
		return fmt.Errorf("encode leaderboard: %w", err)
	}

	numCandidates := len(candidates)

	_, err = store.DB.ExecContext(
		ctx,
		stmt,
		roomCode,
		gameName,
		string(questionsJSON),
		string(candidatesJSON),
		string(leaderboardJSON),
		numCandidates,
	)

	return err
}

func (store GameStore) DoesGameExist(room_id string) bool {
	if store.DB == nil || room_id == "" {
		return false
	}

	const stmt = `SELECT EXISTS (SELECT 1 FROM games WHERE id = $1);`

	var exists bool
	err := store.DB.QueryRowContext(context.Background(), stmt, room_id).Scan(&exists)
	if err != nil {
		return false
	}

	return exists
}

func (store GameStore) GetGame(ctx context.Context, room_id string) (structs.Game, error) {

	if store.DB == nil || room_id == "" {
		return structs.Game{}, errors.New("cannot fetch game: invalid parameters")
	}

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
			return structs.Game{}, ErrGameNotFound
		}
		log.Printf("[db] Error scanning game: %v", err)
		return structs.Game{}, fmt.Errorf("error scanning game: %w", err)
	}

	if err := json.Unmarshal(questionsJSON, &game.Questions); err != nil {
		log.Printf("[db] Error decoding questions: %v", err)
		return structs.Game{}, fmt.Errorf("error decoding questions: %w", err)
	}

	if err := json.Unmarshal(candidatesJSON, &game.Candidates); err != nil {
		log.Printf("[db] Error decoding candidates: %v", err)
		return structs.Game{}, fmt.Errorf("error decoding candidates: %w", err)
	}

	if err := json.Unmarshal(leaderboardJSON, &game.Leaderboard); err != nil {
		log.Printf("[db] Error decoding leaderboard: %v", err)
		return structs.Game{}, fmt.Errorf("error decoding leaderboard: %w", err)
	}

	game.NumCandidates = numCandidates
	game.Dirty = false
	return game, nil
}
