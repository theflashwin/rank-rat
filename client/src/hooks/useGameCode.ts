import { useState, useRef, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../constants/createGameConstants";

interface DoesGameExistResponse {
    status: string;
    data: {
        does_game_exist: boolean;
    };
}

interface GenerateCodeResponse {
    status: string;
    data: {
        game_code: string;
    };
}

export const useGameCode = (onCodeGenerated: (code: string) => void) => {
    const [gameCodeError, setGameCodeError] = useState<string>("");
    const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);
    const [isLoadingCode, setIsLoadingCode] = useState<boolean>(true);
    const checkCodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const onCodeGeneratedRef = useRef(onCodeGenerated);

    // Keep callback ref up to date
    useEffect(() => {
        onCodeGeneratedRef.current = onCodeGenerated;
    }, [onCodeGenerated]);

    const checkCodeExists = async (code: string): Promise<void> => {
        const trimmedValue = code.trim();
        if (trimmedValue.length === 0) {
            return;
        }

        if (checkCodeTimeoutRef.current) {
            clearTimeout(checkCodeTimeoutRef.current);
        }

        checkCodeTimeoutRef.current = setTimeout(async () => {
            setIsCheckingCode(true);
            try {
                const response = await fetch(`${API_BASE_URL}/does-game-exist`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ room_id: trimmedValue }),
                });

                if (!response.ok) {
                    return;
                }

                const result = (await response.json()) as DoesGameExistResponse;
                if (result?.data?.does_game_exist) {
                    setGameCodeError("This game code already exists. Please choose a different one.");
                }
            } catch {
                // Silently fail - don't show error for network issues during typing
            } finally {
                setIsCheckingCode(false);
            }
        }, 500);
    };

    const fetchRandomCode = useCallback(async (): Promise<void> => {
        setIsLoadingCode(true);
        setGameCodeError("");
        try {
            const response = await fetch(`${API_BASE_URL}/generate-random-code`, {
                method: "GET",
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to generate random code:", response.status, errorText);
                throw new Error(`Failed to generate random code: ${response.status}`);
            }

            const result = (await response.json()) as GenerateCodeResponse;
            if (result?.data?.game_code) {
                onCodeGeneratedRef.current(result.data.game_code.toUpperCase());
            }
        } catch (error) {
            console.error("Error fetching random code:", error);
            throw error;
        } finally {
            setIsLoadingCode(false);
        }
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (checkCodeTimeoutRef.current) {
                clearTimeout(checkCodeTimeoutRef.current);
            }
        };
    }, []);

    return {
        gameCodeError,
        setGameCodeError,
        isCheckingCode,
        isLoadingCode,
        checkCodeExists,
        fetchRandomCode,
    };
};

