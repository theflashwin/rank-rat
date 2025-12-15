import React, { useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from "react-router-dom";
import { useGame } from '../contexts/GameContext';
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";

export default function Leaderboard() {
    const { room_id: roomId } = useParams();
    const navigate = useNavigate();
    const { game, loading, error, fetchGame } = useGame();

    // Normalize roomId to lowercase to accept both lowercase and uppercase
    const normalizedRoomId = roomId ? roomId.toLowerCase() : null;

    // Update URL to lowercase if it's not already
    useEffect(() => {
        if (roomId && roomId !== normalizedRoomId) {
            navigate(`/leaderboard/${normalizedRoomId}`, { replace: true });
        }
    }, [roomId, normalizedRoomId, navigate]);

    useEffect(() => {
        if (normalizedRoomId) {
            fetchGame(normalizedRoomId);
        }
    }, [normalizedRoomId, fetchGame]);

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
                    <div className="text-white text-2xl font-semibold">No game data available</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            {/* <Background leftPoly={leftPoly} rightPoly={rightPoly} /> */}
            
            <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
                <div className="max-w-6xl w-full space-y-8">
                    {/* Header */}
                    <div className="text-center text-white">
                        <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                            Leaderboard
                        </p>
                        <h1 className="text-5xl md:text-6xl font-extrabold uppercase leading-tight mt-2">
                            {game.GameName}
                        </h1>
                        <p className="mt-4 text-lg text-white/80">
                            Select a question to view rankings
                        </p>
                    </div>

                    {/* Questions Grid */}
                    {game.Questions && game.Questions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                            {game.Questions.map((question, index) => (
                                <Link
                                    key={question.ID}
                                    to={`/leaderboard/${normalizedRoomId}/${question.ID}`}
                                    className="
                                        group
                                        relative
                                        bg-white/90
                                        backdrop-blur-xl
                                        rounded-2xl
                                        p-6
                                        shadow-2xl
                                        hover:shadow-3xl
                                        transition-all
                                        duration-300
                                        hover:scale-105
                                        hover:-translate-y-1
                                        border-2
                                        border-transparent
                                        hover:border-[#ff314a]
                                        cursor-pointer
                                    "
                                >
                                    {/* Question Number Badge */}
                                    <div className="absolute -top-3 -left-3 w-12 h-12 bg-[#ff314a] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {index + 1}
                                    </div>

                                    {/* Question Content */}
                                    <div className="pt-4">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#ff314a] transition-colors line-clamp-3">
                                            {question.Val}
                                        </h3>
                                        
                                        {/* View Rankings Link */}
                                        <div className="mt-4 flex items-center text-[#ff314a] font-semibold group-hover:translate-x-1 transition-transform">
                                            <span>View Rankings</span>
                                            <svg 
                                                className="w-5 h-5 ml-2" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M9 5l7 7-7 7" 
                                                />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Hover Effect Overlay */}
                                    <div className="absolute inset-0 bg-linear-to-br from-[#ff314a]/0 to-[#ff314a]/0 group-hover:from-[#ff314a]/5 group-hover:to-transparent rounded-2xl transition-all duration-300" />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-white/80 text-lg mt-12">
                            No questions available for this game.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}