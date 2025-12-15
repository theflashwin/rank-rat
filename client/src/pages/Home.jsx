import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import trendingGames from "../data/trendingGames.json";

export default function Home() {
    const [roomCode, setRoomCode] = useState("");
    const navigate = useNavigate()
    const [showScrollHint, setShowScrollHint] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollHint(window.scrollY < 80);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="relative w-full min-h-screen overflow-hidden">
            {/* HERO CONTENT */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen gap-8 px-4 md:px-8 pb-12">
                <div className="text-center">
                    <h1
                        className="
                            text-white 
                            text-6xl md:text-[9rem] 
                            font-extrabold 
                            uppercase 
                            leading-none 
                            tracking-tight 
                            drop-shadow-[6px_10px_0px_#ff314a] 
                            select-none 
                            rotate-[-10deg] 
                            whitespace-pre-line
                        "
                    >
                        {"Vote on\nAnything"}
                    </h1>
                </div>

                {/* CTA Block */}
                <div className="flex flex-col items-center gap-6 mt-10">
                    {/* Input + Button */}
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 shadow-2xl">
                        <input
                            type="text"
                            placeholder="GAME CODE"
                            maxLength={8}
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
    w-72
  "
                            value={roomCode}
                            onChange={(event) => setRoomCode(event.target.value.toLowerCase())}
                        />


                        <button
                            onClick={() => {
                                const normalizedCode = roomCode.trim().toLowerCase();
                                if (!normalizedCode) {
                                    return;
                                }
                                navigate(`/game/${encodeURIComponent(normalizedCode)}`);
                            }}
                            className="
                                px-6 py-3 
                                rounded-xl 
                                bg-[#ff314a] 
                                text-white 
                                font-bold 
                                text-lg 
                                shadow-lg 
                                hover:bg-[#e82b43] 
                                transition
                                w-full sm:w-40
                            "
                        >
                            Join
                        </button>
                    </div>

                    {/* Create Game Link */}
                    <p className="text-white text-lg text-center">
                        Don’t have a game code?{" "}
                        <button  
                        onClick={() => {
                            navigate("/create-game")
                        }}
                        className="text-yellow-300 font-bold underline hover:text-yellow-200">
                            Create one now
                        </button>
                    </p>
                </div>

                {showScrollHint && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                        <div className="flex flex-col items-center text-white/80 animate-bounce transition-opacity duration-300">
                            <span className="text-xs uppercase tracking-[0.35em] mb-2">
                                Scroll for trending games
                            </span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Trending Games */}
            <section className="relative z-10 w-full px-4 md:px-8 pb-16">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between text-white">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                                Discover
                            </p>
                            <h2 className="text-3xl md:text-4xl font-extrabold uppercase">Trending Games</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingGames.map((gameCard) => (
                            <button
                                key={gameCard.code}
                                onClick={() => navigate(`/game/${encodeURIComponent(gameCard.code.toLowerCase())}`)}
                                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none"
                            >
                                <div className="aspect-video w-full overflow-hidden">
                                    <img
                                        src={gameCard.image}
                                        alt={gameCard.title}
                                        className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="p-4 flex items-center justify-between text-left text-white">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                                            Code: {gameCard.code}
                                        </p>
                                        <h3 className="text-xl font-bold">{gameCard.title}</h3>
                                    </div>
                                    <span className="text-sm font-semibold text-[#ff314a] group-hover:translate-x-1 transition">
                                        Play →
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
