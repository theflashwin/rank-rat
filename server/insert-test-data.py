#!/usr/bin/env python3
"""
Populate the `games` table with a sample entry for local testing.

Usage:
    python insert-test-data.py [room_id]

The script uses the connection string stored in the DB_DSN environment
variable (default: postgres://dev:dev@localhost:5432/devdb).
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict

import psycopg2
from psycopg2.extras import Json


DEFAULT_DSN = "postgres://dev:dev@localhost:5432/devdb"


def build_sample_game() -> Dict[str, Any]:
    """Return a sample game payload compatible with server/structs/game.go."""
    candidates = [
        {
            "id": 1,
            "first_name": "Avery",
            "last_name": "Stone",
            "picture": "https://picsum.photos/seed/avery/120",
            "games_played": 12,
        },
        {
            "id": 2,
            "first_name": "Brook",
            "last_name": "Lee",
            "picture": "https://picsum.photos/seed/brook/120",
            "games_played": 9,
        },
        {
            "id": 3,
            "first_name": "Casey",
            "last_name": "Reid",
            "picture": "https://picsum.photos/seed/casey/120",
            "games_played": 15,
        },
    ]

    return {
        "game_name": "Team Showdown",
        "questions": [
            {"id": 1, "val": "Who should be the next team lead?"},
            {"id": 2, "val": "Pick the best project idea."},
        ],
        "candidates": candidates,
        # Leaderboard maps question_id -> {candidate_id: {"mu": .., "sigma": ..}}
        "leaderboard": {
            "1": {
                1: {"mu": 28.5, "sigma": 7.2},
                2: {"mu": 24.3, "sigma": 6.1},
                3: {"mu": 22.9, "sigma": 5.8},
            },
            "2": {
                1: {"mu": 25.0, "sigma": 6.4},
                2: {"mu": 29.1, "sigma": 7.0},
                3: {"mu": 23.8, "sigma": 5.6},
            },
        },
        "num_candidates": len(candidates),
    }


def upsert_game(room_id: str, dsn: str) -> None:
    payload = build_sample_game()

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO games (id, game_name, questions, candidates, leaderboard, num_candidates)
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::int)
                ON CONFLICT (id) DO UPDATE
                SET game_name = EXCLUDED.game_name,
                    questions = EXCLUDED.questions,
                    candidates = EXCLUDED.candidates,
                    leaderboard = EXCLUDED.leaderboard,
                    num_candidates = EXCLUDED.num_candidates;
                """,
                (
                    room_id,
                    payload["game_name"],
                    Json(payload["questions"]),
                    Json(payload["candidates"]),
                    Json(payload["leaderboard"]),
                    payload["num_candidates"],
                ),
            )

    print(f"Inserted sample game '{room_id}' into database {dsn}")


def main() -> None:
    room_id = sys.argv[1] if len(sys.argv) > 1 else "room-1"
    dsn = os.environ.get("DB_DSN", DEFAULT_DSN)

    try:
        upsert_game(room_id, dsn)
    except psycopg2.Error as exc:
        print(f"[ERROR] Could not insert game: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()

