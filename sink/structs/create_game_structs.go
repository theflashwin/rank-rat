package structs

type CreateGameRequest struct {
	GameName   string            `json:"gameName"`
	RoomCode   string            `json:"roomCode"`
	Questions  []string          `json:"questions"`
	Candidates []CandidateFields `json:"candidates"`
}

type CandidateFields struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Picture   string `json:"picture"`
}

type CreateGameResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
