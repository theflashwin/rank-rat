import type { FormValues, CandidateWithPicture, CreateGamePayload, BackgroundPolygons } from "../types/createGame";

export const generateSplitBackground = (): BackgroundPolygons => {
    const POINTS = 5;
    const ys = Array.from({ length: POINTS }, (_, index) =>
        Math.round((index / (POINTS - 1)) * 100)
    );
    const jagged = ys.map((y) => {
        const x = 45 + Math.random() * 10;
        return { x, y };
    });

    const leftPoly = [
        "0% 0%",
        `${jagged[0].x}% 0%`,
        ...jagged.map((point) => `${point.x}% ${point.y}%`),
        `${jagged[jagged.length - 1].x}% 100%`,
        "0% 100%",
    ].join(", ");

    const rightPoly = [
        `${jagged[0].x}% 0%`,
        "100% 0%",
        "100% 100%",
        `${jagged[jagged.length - 1].x}% 100%`,
        ...[...jagged].reverse().map((point) => `${point.x}% ${point.y}%`),
    ].join(", ");

    return { leftPoly, rightPoly };
};

export const buildPayload = (
    formValues: FormValues,
    candidatesWithPictures?: CandidateWithPicture[]
): CreateGamePayload => {
    const questions = formValues.questions
        .map((val) => val.trim())
        .filter((val) => val.length > 0);

    // Use candidatesWithPictures if provided (after S3 upload), otherwise use formValues.candidates
    const candidatesToProcess = candidatesWithPictures || formValues.candidates;
    
    const candidates = candidatesToProcess
        .map((candidate) => {
            const name = candidate.name?.trim() || "";
            const picture = candidate.picture?.trim() || "";
            
            if (!name) {
                return null;
            }
            
            const [firstName, ...rest] = name.split(" ");
            return {
                first_name: firstName ?? "",
                last_name: rest.join(" "),
                picture: picture,
            };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

    return {
        gameName: formValues.name.trim(),
        roomCode: formValues.gameCode.trim(),
        questions,
        candidates,
    };
};

