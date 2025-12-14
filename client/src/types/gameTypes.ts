export interface Candidate {
    ID: number;
    First_Name: string;
    Last_Name: string;
    Picture: string;
    GamesPlayed: number;
}

export interface Question {
    ID: number;
    Val: string;
}

export interface Leaderboard {
    [questionID: number]: {
        [candidateId: number]: {
            Mu: number;
            Sigma: number;
        }
    }
}

export interface Game {
    ID: string;
    GameName: string;
    Questions: Question[];
    Candidates: Candidate[];
    Leaderboard: Leaderboard;
    NumCandidates: number;
  }