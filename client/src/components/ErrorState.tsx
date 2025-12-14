import React from "react";

interface ErrorStateProps {
    message?: string;
}

export default function ErrorState({ message = "Something went wrong." }: ErrorStateProps) {
    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3 text-white text-center max-w-md px-4">
                    <div className="h-12 w-12 rounded-full bg-rose-500/20 text-2xl flex items-center justify-center border border-rose-500/50">
                        ⚠️
                    </div>
                    <div className="text-2xl font-semibold">Error</div>
                    <div className="text-white/80">{message}</div>
                </div>
            </div>
        </div>
    );
}

