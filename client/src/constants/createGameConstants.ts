export const STEP_TITLES = ["Basics", "Questions", "Candidates", "Result"] as const;

export const STEP_DESCRIPTIONS = [
    "Give your game a memorable name and an easy-to-share code.",
    "Add the prompts your voters will respond to. You can add as many as you like.",
    "List every candidate or option that players can vote for.",
    "See whether your game was created successfully.",
] as const;

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

