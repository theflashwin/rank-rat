import React from "react";
import { Outlet } from "react-router-dom";
import { GameProvider } from "../contexts/GameContext";

export default function LeaderboardWrapper() {
    return (
        <GameProvider>
            <Outlet/>
        </GameProvider>
    )
}