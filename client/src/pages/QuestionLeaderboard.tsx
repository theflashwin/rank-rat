import React, { useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useGame } from "../contexts/GameContext";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";

export default function QuestionLeaderboard() {
    const { room_id, q_id } = useParams();
    const navigate = useNavigate();
    const { game, loading, error, fetchGame } = useGame();

    // Normalize roomId to lowercase to accept both lowercase and uppercase
    const normalizedRoomId = room_id ? room_id.toLowerCase() : null;

    // Update URL to lowercase if it's not already
    useEffect(() => {
        if (room_id && room_id !== normalizedRoomId) {
            navigate(`/leaderboard/${normalizedRoomId}/${q_id}`, { replace: true });
        }
    }, [room_id, normalizedRoomId, q_id, navigate]);

    useEffect(() => {
        if (normalizedRoomId) {
            fetchGame(normalizedRoomId);
        }
    }, [normalizedRoomId, fetchGame]);

    const questionId = useMemo(() => Number(q_id), [q_id]);
    const question = useMemo(
        () => game?.Questions?.find((q) => q.ID === questionId),
        [game?.Questions, questionId]
    );

    const sortedCandidates = useMemo(() => {
        if (!game?.Candidates || !Number.isFinite(questionId)) return [];
        const leaderboard = game.Leaderboard?.[questionId] || {};

        return [...game.Candidates]
            .map((candidate) => {
                const rating = leaderboard?.[candidate.ID];
                return {
                    ...candidate,
                    rating,
                    mu: rating?.Mu ?? 25,
                    sigma: rating?.Sigma ?? 8,
                };
            })
            .sort((a, b) => b.mu - a.mu);
    }, [game?.Candidates, game?.Leaderboard, questionId]);

    if (loading) {
        return <Loader message="Loading game data..." />;
    }

    if (error) {
        return <ErrorState message={error} />;
    }

    if (!game) {
        return (
            <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-white text-2xl font-semibold">
                        No game data available
                    </div>
                </div>
            </div>
        );
    }

    if (!Number.isFinite(questionId)) {
        return <ErrorState message="Invalid question ID." />;
    }

    // Check if question exists in the game
    if (!question) {
        return <ErrorState message="Question ID does not exist in the game." />;
    }

    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
                <div className="max-w-5xl w-full space-y-10">
                    {/* Header */}
                    <div className="text-center text-white space-y-3">
                        <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                            Question Ranking
                        </p>
                        <h1 className="text-4xl md:text-5xl font-extrabold uppercase leading-tight">
                            {question?.Val || "Question"}
                        </h1>
                        <p className="text-white/75">
                            Rankings are based on question-specific Mu (higher is better).
                        </p>
                    </div>

                    {/* Rankings */}
                    {sortedCandidates.length > 0 ? (
                        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                            <div className="grid grid-cols-1 divide-y divide-white/10">
                                {sortedCandidates.map((candidate, idx) => (
                                    <div
                                        key={candidate.ID}
                                        className="flex items-center gap-4 py-4 px-2"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#ff314a] to-[#2563eb] text-white font-bold flex items-center justify-center shadow-lg">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-lg font-semibold text-white">
                                                {candidate.First_Name} {candidate.Last_Name}
                                            </div>
                                            <div className="text-sm text-white/70">
                                                Mu {candidate.mu.toFixed(2)}{" "}
                                                <span className="text-white/50">·</span>{" "}
                                                Sigma {candidate.sigma.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-white">
                                                {candidate.mu.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-white/60">
                                                Games: {candidate.GamesPlayed ?? 0}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-white/80 text-lg">
                            No ratings for this question yet.
                        </div>
                    )}

                    <div className="flex justify-center">
                        <Link
                            to={`/leaderboard/${normalizedRoomId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white font-semibold border border-white/20 hover:bg-white/25 transition"
                        >
                            ← Back to questions
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}