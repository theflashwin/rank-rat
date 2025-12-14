export interface Candidate {
    name: string;
    picture?: string;
    pictureFile?: File | null;
}

export interface FormValues {
    name: string;
    gameCode: string;
    questions: string[];
    candidates: Candidate[];
}

export interface CandidateWithPicture extends Candidate {
    picture: string;
}

export interface CreateGamePayload {
    gameName: string;
    roomCode: string;
    questions: string[];
    candidates: {
        first_name: string;
        last_name: string;
        picture: string;
    }[];
}

export interface BackgroundPolygons {
    leftPoly: string;
    rightPoly: string;
}

