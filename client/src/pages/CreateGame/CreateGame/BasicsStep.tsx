import React from "react";

import type { FormValues } from "../../../types/createGame";

interface BasicsStepProps {
    formValues: FormValues;
    gameCodeError: string;
    isCheckingCode: boolean;
    isLoadingCode: boolean;
    onFieldChange: (field: keyof FormValues, value: string) => void;
    onGenerateNewCode: () => void;
}

export default function BasicsStep({
    formValues,
    gameCodeError,
    isCheckingCode,
    isLoadingCode,
    onFieldChange,
    onGenerateNewCode,
}: BasicsStepProps) {
    return (
        <div className="grid gap-6">
            <label className="flex flex-col gap-2 text-gray-700">
                <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                    Game name
                </span>
                <input
                    type="text"
                    value={formValues.name}
                    onChange={(event) => onFieldChange("name", event.target.value)}
                    placeholder="e.g. NBA Voting 25-26"
                    className="rounded-xl border border-gray-300 px-4 py-3 text-lg shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
            </label>

            <label className="flex flex-col gap-2 text-gray-700">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                        Game code
                    </span>
                    <div className="flex items-center gap-2">
                        {isLoadingCode && (
                            <span className="text-xs text-gray-500">Generating...</span>
                        )}
                        {isCheckingCode && !isLoadingCode && (
                            <span className="text-xs text-gray-500">Checking...</span>
                        )}
                        <button
                            type="button"
                            onClick={onGenerateNewCode}
                            disabled={isLoadingCode}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate New
                        </button>
                    </div>
                </div>
                <input
                    type="text"
                    maxLength={8}
                    value={formValues.gameCode}
                    onChange={(event) =>
                        onFieldChange("gameCode", event.target.value.toUpperCase())
                    }
                    placeholder={isLoadingCode ? "Generating code..." : "8 character code"}
                    disabled={isLoadingCode}
                    className={`rounded-xl border px-4 py-3 text-lg font-mono tracking-[0.4em] uppercase shadow-sm focus:outline-none focus:ring-2 ${
                        gameCodeError
                            ? "border-red-500 focus:border-red-500 focus:ring-red-300"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-300"
                    } ${isLoadingCode ? "bg-gray-100 cursor-not-allowed" : ""}`}
                />
                {gameCodeError && (
                    <p className="text-sm font-semibold text-red-500 mt-1">
                        {gameCodeError}
                    </p>
                )}
            </label>
        </div>
    );
}

