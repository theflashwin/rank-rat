import React, { useState } from "react";
import { Link } from "react-router-dom";

const defaultLinks = [
  { label: "Home", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
];

// Generate snowflake data - outside component to avoid linter warnings
function generateSnowflakes() {
  return Array.from({ length: 30 }, (_, i) => {
    const duration = 8 + Math.random() * 6; // 8-14 seconds
    const delay = Math.random() * duration; // Delay up to full duration for seamless loop
    const initialY = Math.random() * -56; // Start at random position above view (-56px to 0px)
    return {
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${-delay}s`, // Negative delay to start at different points
      initialY: `${initialY}px`,
      fontSize: `${8 + Math.random() * 8}px`,
    };
  });
}

// Pre-generate snowflakes once
const SNOWFLAKES = generateSnowflakes();

export default function Navbar({ links = defaultLinks }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-[200] h-14 flex items-center justify-between px-6 sm:px-10 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-sm shadow-sky-500/5">
        {/* Snow falling animation - localized to logo area */}
        <div className="absolute left-0 top-0 h-14 w-56 pointer-events-none overflow-hidden">
          {SNOWFLAKES.map((snowflake) => (
            <div
              key={snowflake.id}
              className="snowflake"
              style={{
                left: snowflake.left,
                top: snowflake.initialY,
                animationDuration: snowflake.animationDuration,
                animationDelay: snowflake.animationDelay,
                fontSize: snowflake.fontSize,
              }}
            >
              ❄
            </div>
          ))}
        </div>

        <Link
          to="/"
          className="relative z-10 text-xl font-bold tracking-tight flex items-center gap-1 group"
          onClick={closeMenu}
        >
          <span className="bg-linear-to-r from-[#dc2626] via-[#ef4444] to-[#f87171] bg-clip-text text-transparent">
            Rank
          </span>
          <span className="relative bg-linear-to-r from-[#16a34a] via-[#22c55e] to-[#4ade80] bg-clip-text text-transparent">
            Rat
            <span className="absolute top-0.5 -right-1 text-xs">🎄</span>
          </span>
        </Link>

        <ul className="hidden md:flex gap-8 text-sm font-medium">
          {links.map(({ label, href }) => (
            <li key={href}>
              <Link
                to={href}
                className="text-slate-300 hover:text-white transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={toggleMenu}
          className="md:hidden inline-flex items-center justify-center text-slate-300 hover:text-white transition-colors focus:outline-none"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </nav>

      {isOpen && (
        <div className="md:hidden absolute top-14 inset-x-0 z-40 bg-white/5 backdrop-blur-md ring-1 ring-white/10 shadow-sm shadow-sky-500/5">
          <ul className="flex flex-col p-4 gap-4">
            {links.map(({ label, href }) => (
              <li key={`mobile-${href}`}>
                <Link
                  to={href}
                  className="block text-slate-300 hover:text-white transition-colors"
                  onClick={closeMenu}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

