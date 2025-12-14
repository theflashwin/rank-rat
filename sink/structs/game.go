package structs

import (
	"time"
)

type Question struct {
	ID  int
	Val string
}

type Rating struct {
	Mu    float64
	Sigma float64
}

type Candidate struct {
	ID          int
	First_Name  string
	Last_Name   string
	Picture     string
	GamesPlayed int
}

type Leaderboard map[int]map[int]Rating

type Round struct {
	GameID     string
	Question   Question
	Candidates []Candidate
}

type Vote struct {
	GameID     string
	QuestionID int
	WinnerID   int
}

type Game struct {

	// Postgres attributes
	ID            string
	GameName      string
	Questions     []Question
	Candidates    []Candidate
	Leaderboard   Leaderboard
	NumCandidates int8

	// Go side flags for caching
	Dirty      bool
	LastAcsess time.Time
}
