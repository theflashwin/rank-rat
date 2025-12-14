import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8080";
const FLY_OUT_DURATION = 500;
const RECONNECT_DELAY_MS = 2000;

function buildWsUrl(roomId) {
  if (!roomId) return "";
  const trimmedRoom = roomId.trim();
  if (!trimmedRoom) return "";

  try {
    const url = new URL(WS_BASE_URL);
    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";
    const basePath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}/ws/${encodeURIComponent(trimmedRoom)}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    const normalizedBase = WS_BASE_URL.replace(/\/+$/, "");
    return `${normalizedBase}/ws/${encodeURIComponent(trimmedRoom)}`;
  }
}

function normalizeCandidate(candidate = {}) {
  const firstName = candidate.First_Name ?? candidate.first_name ?? "";
  const lastName = candidate.Last_Name ?? candidate.last_name ?? "";
  const id =
    typeof candidate.ID === "number" && candidate.ID !== 0
      ? candidate.ID
      : candidate.id ?? `${firstName}-${lastName}-${Math.random()}`;

  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || "Anonymous",
    major: candidate.Major ?? candidate.major ?? "Brother",
    picture: candidate.Picture ?? candidate.picture ?? "",
  };
}

function normalizeRound(raw, fallbackRoomId) {
  const candidates = Array.isArray(raw?.Candidates) ? raw.Candidates : [];
  return {
    gameId: raw?.GameID ?? fallbackRoomId ?? "",
    questionId: raw?.Question?.ID ?? 0,
    question: raw?.Question?.Val ?? raw?.Question?.value ?? "",
    candidates: candidates.map(normalizeCandidate),
  };
}

export default function Game() {
  const { room_id: roomId } = useParams();
  const navigate = useNavigate();

  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [fadeOutDone, setFadeOutDone] = useState(false);
  const [titleRevealed, setTitleRevealed] = useState(false);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState("idle");

  const socketRef = useRef(null);
  const titleTimerRef = useRef();
  const titleAnimatedRef = useRef(false);
  const submitTimerRef = useRef();
  const reconnectTimerRef = useRef();
  const shouldReconnectRef = useRef(true);
  const hasReceivedRoundRef = useRef(false);

  const question = round?.question ?? "";
  const players = useMemo(() => round?.candidates ?? [], [round]);
  const currentGameId = round?.gameId ?? roomId ?? "";
  const currentQuestionId = round?.questionId ?? 0;

  const connect = useCallback(function connectSocket() {
    if (!roomId) {
      setError("Missing room id in the route.");
      setIsLoading(false);
      setConnectionState("error");
      return;
    }

    const wsUrl = buildWsUrl(roomId);
    if (!wsUrl) {
      setError("Unable to derive websocket URL. Set VITE_WS_BASE_URL.");
      setIsLoading(false);
      setConnectionState("error");
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    window.clearTimeout(reconnectTimerRef.current);
    hasReceivedRoundRef.current = false;
    setRound(null);
    setSelectedWinner(null);
    setFadeOutDone(false);
    setIsSubmitting(false);
    setIsLoading(true);
    setError("");
    setConnectionState("connecting");

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const normalized = normalizeRound(data, roomId);

        if (!normalized.questionId || normalized.candidates.length === 0) {
          setError("Server sent an incomplete round. Waiting for the next one...");
          return;
        }

        hasReceivedRoundRef.current = true;
        setRound(normalized);
        setIsLoading(false);
        setIsSubmitting(false);
        setSelectedWinner(null);
        setFadeOutDone(false);
        if (!titleAnimatedRef.current) {
          window.clearTimeout(titleTimerRef.current);
          titleTimerRef.current = window.setTimeout(() => {
            titleAnimatedRef.current = true;
            setTitleRevealed(true);
          }, 50);
        } else {
          setTitleRevealed(true);
        }
      } catch (err) {
        setError(`Failed to parse round: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    };

    ws.onerror = (err) => {
      console.log(err);
      if (!hasReceivedRoundRef.current) {
        shouldReconnectRef.current = false;
        setError("This game does not exist.");
        setConnectionState("error");
        setIsLoading(false);
      } else {
        setError("WebSocket error. Attempting to reconnect...");
      }
    };

    ws.onclose = () => {
      if (!hasReceivedRoundRef.current) {
        shouldReconnectRef.current = false;
        setConnectionState("error");
        setIsLoading(false);
        setError("This game does not exist.");
        return;
      }

      setConnectionState("closed");
      setIsLoading(true);
      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connectSocket();
        }, RECONNECT_DELAY_MS);
      }
    };
  }, [roomId]);

  const submitResultAfterFly = useCallback(() => {
    if (!selectedWinner || !round) {
      return;
    }

    if (!currentQuestionId) {
      setError("No active question to vote on.");
      setSelectedWinner(null);
      return;
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Connection lost. Reconnecting before sending vote...");
      setSelectedWinner(null);
      return;
    }

    const envelope = {
      type: "VOTE",
      data: {
        GameID: currentGameId,
        QuestionID: currentQuestionId,
        WinnerID: selectedWinner.id,
      },
    };

    try {
      setIsSubmitting(true);
      socket.send(JSON.stringify(envelope));
    } catch (err) {
      setIsSubmitting(false);
      setError(`Failed to send vote: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, [selectedWinner, round, currentQuestionId, currentGameId]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      window.clearTimeout(titleTimerRef.current);
      window.clearTimeout(submitTimerRef.current);
      window.clearTimeout(reconnectTimerRef.current);

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  useEffect(() => {
    if (!error) return;
    navigate("/error", { replace: true, state: { message: error, roomId } });
  }, [error, navigate, roomId]);

  useEffect(() => {
    if (!selectedWinner) return;

    window.clearTimeout(submitTimerRef.current);
    submitTimerRef.current = window.setTimeout(() => {
      setFadeOutDone(true);
      submitResultAfterFly();
    }, FLY_OUT_DURATION);

    return () => window.clearTimeout(submitTimerRef.current);
  }, [selectedWinner, submitResultAfterFly]);

  const handleCardClick = (player) => {
    if (isLoading || isSubmitting || !round) return;
    setSelectedWinner(player);
    setFadeOutDone(false);
  };

  const uniquePlayers = useMemo(() => {
    if (!players.length) {
      return players;
    }
    const seen = new Set();
    return players.filter((player) => {
      if (seen.has(player.id)) {
        return false;
      }
      seen.add(player.id);
      return true;
    });
  }, [players]);

  const titleShouldHide = selectedWinner && !fadeOutDone;
  const showLoader = isLoading || isSubmitting || !round;

  return (
    <>
      <main className="relative flex flex-col items-center justify-start pt-24 min-h-screen w-screen m-0 overflow-auto bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 rotate-180 bg-slate-950 bg-[radial-gradient(circle_farthest-side,rgba(255,0,182,.15),rgba(255,255,255,0))]" />

        {showLoader && (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4" />
            <p className="text-lg">
              {isSubmitting ? "Submitting result..." : connectionState === "connecting" ? "Connecting..." : "Loading matchup..."}
            </p>
          </div>
        )}

        {!showLoader && (
          <>
            {question && (
              <h1
                className={`title-fly mb-8 text-3xl sm:text-4xl md:text-5xl font-bold drop-shadow-lg text-center px-4 lg:mt-28 ${
                  titleRevealed && !titleShouldHide ? "title-visible" : "title-hidden"
                } ${titleShouldHide ? "title-exit" : ""}`}
              >
                {question}
              </h1>
            )}

            <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl px-4 mb-12">
              {uniquePlayers.map((player, index) => (
                <div
                  key={`${player.id}-${currentQuestionId}-${index}`}
                  onClick={() => handleCardClick(player)}
                  className={`cursor-pointer w-full transition duration-500 ${
                    selectedWinner?.id === player.id ? "card-selected" : ""
                  } ${selectedWinner && selectedWinner.id !== player.id ? "card-exit" : "card-enter"}`}
                >
                  <BrotherCard
                    name={player.name}
                    major={player.major}
                    firstName={player.firstName}
                    lastName={player.lastName}
                    picture={player.picture}
                  />
                </div>
              ))}
            </section>
          </>
        )}

        {error && (
          <p className="text-sm text-rose-300 mt-6 px-4 text-center max-w-xl">{error}</p>
        )}
      </main>
    </>
  );
}

function BrotherCard({
  name = "Anonymous",
  firstName = "anonymous",
  lastName = "user",
  picture = "",
}) {
  const defaultImage = "https://placehold.co/400x400/png?text=Profile";
  const safeFirst = firstName || "anonymous";
  const safeLast = lastName || "user";
  const fallbackPath = `brother-pictures/${safeFirst.toLowerCase()}-${safeLast.toLowerCase()}.jpg`;
  const computedSrc = picture || fallbackPath;
  const [image, setImage] = useState(computedSrc);

  useEffect(() => {
    setImage(computedSrc);
  }, [computedSrc]);

  const handleImageError = () => {
    setImage(defaultImage);
  };

  return (
    <div className="relative w-full max-w-full sm:max-w-xs overflow-hidden rounded-3xl bg-white/10 backdrop-blur-md shadow-lg shadow-sky-500/10 transition-transform duration-300 group hover:-translate-y-1">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-sky-400/40 via-indigo-500/40 to-fuchsia-500/40 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
      <img
        src={image}
        alt={name}
        onError={handleImageError}
        className="w-full aspect-4/3 sm:aspect-square object-cover rounded-t-3xl"
      />
      <div className="p-4 sm:p-5 text-center relative z-10">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{name}</h2>
      </div>
    </div>
  );
}
