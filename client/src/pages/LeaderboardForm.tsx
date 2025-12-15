import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LeaderboardForm() {
    const [roomCode, setRoomCode] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const code = roomCode.trim().toLowerCase();
        if (!code) return;
        navigate(`/leaderboard/${encodeURIComponent(code)}`);
    };

    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
                <div className="max-w-md w-full space-y-6 bg-white/30 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl border border-white/20 text-white">
                    <div className="text-center">
                        <p className="text-sm uppercase tracking-[0.35em] text-white/70">Leaderboard</p>
                        <h1 className="mt-2 text-3xl font-extrabold bg-linear-to-r from-yellow-200 via-amber-200 to-yellow-100 bg-clip-text text-transparent">
                            Enter Game Code
                        </h1>
                        <p className="mt-2 text-sm text-white/70">View rankings for an existing game.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toLowerCase())}
                            placeholder="Game code"
                            className="
                                px-6 py-4 
                                rounded-2xl 
                                bg-white/90 
                                text-gray-900 
                                text-center 
                                placeholder-gray-400
                                font-mono 
                                tracking-[0.4em]
                                uppercase
                                text-2xl
                                focus:outline-none 
                                focus:ring-4 
                                focus:ring-blue-300 
                                border-2
                                border-transparent
                                focus:border-blue-500
                                transition
                                w-full
                            "
                        />
                        <button
                            type="submit"
                            className="w-full rounded-2xl bg-[#ff314a] px-4 py-3 text-base font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#e82b43] disabled:opacity-60"
                            disabled={!roomCode.trim()}
                        >
                            Go to leaderboard
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}