import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message?.toString().trim();
  const readableMessage = message || "Something went wrong. Please try again.";
  const roomId = location.state?.roomId;

  return (
    <main className="min-h-screen w-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center px-6 py-10 bg-white/5 rounded-3xl shadow-lg shadow-rose-500/10 border border-white/10">
        <div className="text-6xl sm:text-7xl mb-4" aria-hidden="true">
          😔
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">We hit a snag</h1>
        <p className="text-base sm:text-lg text-slate-200 mb-6 leading-relaxed">
          {readableMessage}
        </p>
        {roomId && (
          <p className="text-sm text-slate-400 mb-4">Room ID: {roomId}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 transition text-white font-semibold shadow shadow-rose-500/30"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-white font-semibold border border-white/10 shadow shadow-slate-500/20"
          >
            Back home
          </button>
        </div>
      </div>
    </main>
  );
}

