import { STEP_TITLES } from "../../../constants/createGameConstants";
import React from "react";

interface FormNavigationProps {
    currentStep: number;
    stepIsValid: boolean;
    isSubmitting: boolean;
    isSubmitStep: boolean;
    hideNavigation?: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onSubmit: (event: React.FormEvent) => void;
}

export default function FormNavigation({
    currentStep,
    stepIsValid,
    isSubmitting,
    isSubmitStep,
    hideNavigation = false,
    onPrevious,
    onNext,
    onSubmit,
}: FormNavigationProps) {
    if (hideNavigation) return null;

    const isFirstStep = currentStep === 0;

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
            <button
                type="button"
                onClick={onPrevious}
                disabled={isFirstStep}
                className="rounded-xl border border-gray-300 px-5 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Back
            </button>

            {isSubmitStep ? (
                <button
                    type="submit"
                    onClick={onSubmit}
                    disabled={!stepIsValid || isSubmitting}
                    className="ml-auto rounded-xl bg-[#ff314a] px-6 py-3 text-base font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#e82b43] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? "Saving..." : "Create Game"}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!stepIsValid || isSubmitting}
                    className="ml-auto rounded-xl bg-[#316bd6] px-6 py-3 text-base font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#274fa5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Next
                </button>
            )}
        </div>
    );
}

