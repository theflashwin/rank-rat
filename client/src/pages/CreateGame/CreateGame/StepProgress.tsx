import React from "react";

import { STEP_TITLES, STEP_DESCRIPTIONS } from "../../../constants/createGameConstants";

interface StepProgressProps {
    currentStep: number;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-gray-500">
                <span>
                    Step {currentStep + 1} of {STEP_TITLES.length}
                </span>
                <span>{STEP_TITLES[currentStep]}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                    className="h-full bg-[#ff314a] transition-all duration-500"
                    style={{
                        width: `${((currentStep + 1) / STEP_TITLES.length) * 100}%`,
                    }}
                />
            </div>
            <p className="text-sm text-gray-600">
                {STEP_DESCRIPTIONS[currentStep]}
            </p>
        </div>
    );
}

