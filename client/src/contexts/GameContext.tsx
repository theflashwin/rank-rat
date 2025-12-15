import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import axios from 'axios'
import { Game } from "../types/gameTypes";
import { API_BASE_URL } from "../constants/createGameConstants";

interface GameContextType {
    game: Game | null;
    loading: boolean;
    error: string | null;
    currentRoomId: string | null;
    fetchGame: (gameId: string) => Promise<void>;
    clearGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {

    const context = useContext(GameContext);

    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider')
    }

    return context

}

interface GameProviderProps {
    children: ReactNode
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [failedRoomId, setFailedRoomId] = useState<string | null>(null);

    const fetchGame = useCallback(async (gameId: string) => {
        if (!gameId) {
            setError("Game ID is required");
            return;
        }

        // Normalize gameId to uppercase for case-insensitive lookup
        const normalizedGameId = gameId.toUpperCase();

        // Don't refetch if we already have the game for this room_id
        if (game && currentRoomId === normalizedGameId && game.ID === normalizedGameId) {
            return;
        }

        // Don't refetch if we already failed for this room_id (prevents infinite loops)
        if (failedRoomId === normalizedGameId) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_BASE_URL}/fetch-game/${normalizedGameId}`);
            
            if (response.data.status === 'ok' && response.data.data) {
                setGame(response.data.data);
                setCurrentRoomId(normalizedGameId);
                setFailedRoomId(null); // Clear failed state on success
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    setError('Game not found');
                } else {
                    setError(err.response?.data?.message || err.message || 'Failed to fetch game');
                }
            } else {
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            }
            setGame(null);
            setCurrentRoomId(null);
            setFailedRoomId(normalizedGameId); // Remember which room_id failed
        } finally {
            setLoading(false);
        }
    }, [game, currentRoomId, failedRoomId]);

    const clearGame = useCallback(() => {
        setGame(null)
        setError(null)
        setCurrentRoomId(null)
        setFailedRoomId(null)
    }, [])

    const value: GameContextType = {
        game,
        loading,
        error,
        currentRoomId,
        fetchGame,
        clearGame
    }

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}