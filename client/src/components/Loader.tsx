import React from "react";

interface LoaderProps {
    message?: string;
}

export default function Loader({ message = "Loading..." }: LoaderProps) {
    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-3 text-white">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                    <div className="text-2xl font-semibold">{message}</div>
                </div>
            </div>
        </div>
    );
}

