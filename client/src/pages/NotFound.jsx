import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-[#0b0c1f] text-white">
            <div className="absolute inset-0 opacity-70">
                <div className="pointer-events-none h-full w-full bg-linear-to-br from-[#ff314a1a] via-transparent to-[#2563eb1a]" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center space-y-4">
                    <div className="flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full bg-white/15 flex items-center justify-center text-3xl">
                            🧭
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold">Page not found</h1>
                    <p className="text-white/80">
                        We couldn’t find what you were looking for. Check the URL or head back to the homepage.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4 pt-2">
                        <Link
                            to="/"
                            className="rounded-2xl bg-[#ff314a] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#e82b43]"
                        >
                            Go home
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10 transition"
                        >
                            Go back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}