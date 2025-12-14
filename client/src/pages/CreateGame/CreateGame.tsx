import React, { useEffect, useMemo, useState } from "react";
import { STEP_TITLES } from "../../constants/createGameConstants";
import { generateSplitBackground, buildPayload } from "../../utils/createGameUtils";
import { uploadCandidatePictures } from "../../utils/s3Upload";
import { useCreateGameForm } from "../../hooks/useCreateGameForm";
import { useGameCode } from "../../hooks/useGameCode";
import { API_BASE_URL } from "../../constants/createGameConstants";
import StepProgress from "./CreateGame/StepProgress";
import FormNavigation from "./CreateGame/FormNavigation";
import BasicsStep from "./CreateGame/BasicsStep";
import QuestionsStep from "./CreateGame/QuestionsStep";
import CandidatesStep from "./CreateGame/CandidatesStep";
import type { FormValues, Candidate } from "../../types/createGame";
import { fireConfettiBurst } from "../../utils/confetti";

interface CreateGameResponse {
    message?: string;
}

const createValidators = (formValues: FormValues, gameCodeError: string) => [
    () =>
        formValues.name.trim().length > 0 &&
        formValues.gameCode.trim().length > 0 &&
        gameCodeError === "",
    () => formValues.questions.some((question) => question.trim().length > 0),
    () =>
        formValues.candidates.some(
            (candidate) => (candidate.name?.trim() || "").length > 0
        ),
    () => true, // Result tab is display-only
];

export default function CreateGame() {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [resultStatus, setResultStatus] = useState<"success" | "error" | null>(null);
    const [resultMessage, setResultMessage] = useState<string>("");

    useEffect(() => {
        if (resultStatus === "success") {
            fireConfettiBurst();
        }
    }, [resultStatus]);
    
    const { formValues, setFormValues, updateField, updateListField, addListField, removeListField } = useCreateGameForm();
    
    const {
        gameCodeError,
        setGameCodeError,
        isCheckingCode,
        isLoadingCode,
        checkCodeExists,
        fetchRandomCode,
    } = useGameCode((code: string) => {
        setFormValues((previous) => ({
            ...previous,
            gameCode: code,
        }));
    });

    const { leftPoly, rightPoly } = useMemo(generateSplitBackground, []);

    const validators = createValidators(formValues, gameCodeError);
    const stepIsValid = validators[currentStep]();

    // Fetch random code on mount
    useEffect(() => {
        const initializeCode = async () => {
            try {
                await fetchRandomCode();
            } catch {
                setErrorMessage("Failed to generate game code. Please enter one manually.");
            }
        };
        initializeCode();
    }, [fetchRandomCode]);

    const handleFieldChange = (field: keyof FormValues, value: string) => {
        updateField(field, value);
        if (field === "gameCode") {
            setGameCodeError("");
            checkCodeExists(value);
        }
    };

    const handleGenerateNewCode = async () => {
        try {
            await fetchRandomCode();
        } catch {
            setErrorMessage("Failed to generate game code. Please try again.");
        }
    };

    const goToNextStep = () => {
        if (!stepIsValid) {
            return;
        }
        setStatusMessage("");
        setCurrentStep((previous) => Math.min(previous + 1, STEP_TITLES.length - 1));
    };

    const goToPreviousStep = () => {
        setStatusMessage("");
        setCurrentStep((previous) => Math.max(previous - 1, 0));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!stepIsValid || isSubmitting) {
            return;
        }

        setStatusMessage("");
        setErrorMessage("");
        setResultStatus(null);
        setResultMessage("");
        setIsSubmitting(true);

        try {
            // Step 1: Upload candidate pictures to S3
            setStatusMessage("Uploading pictures...");
            const candidatesWithPictures = await uploadCandidatePictures(
                formValues.candidates,
                formValues.gameCode.trim()
            );

            // Step 2: Build payload with S3 paths
            const payload = buildPayload(formValues, candidatesWithPictures);

            // Step 3: Submit game creation
            setStatusMessage("Creating game...");
            const response = await fetch(`${API_BASE_URL}/create-game`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to create game.");
            }

            const result = (await response.json()) as CreateGameResponse;
            const message = result?.message ?? "Game created successfully!";
            setStatusMessage(message);
            setResultStatus("success");
            setResultMessage(message);
            setCurrentStep(STEP_TITLES.length - 1);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unexpected error occurred.";
            setErrorMessage(message);
            setResultStatus("error");
            setResultMessage(message);
            setCurrentStep(STEP_TITLES.length - 1);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepContent = () => {
        if (currentStep === 0) {
            return (
                <BasicsStep
                    formValues={formValues}
                    gameCodeError={gameCodeError}
                    isCheckingCode={isCheckingCode}
                    isLoadingCode={isLoadingCode}
                    onFieldChange={handleFieldChange}
                    onGenerateNewCode={handleGenerateNewCode}
                />
            );
        }

        if (currentStep === 1) {
            return (
                <QuestionsStep
                    questions={formValues.questions}
                    onUpdate={(index: number, value: string) => updateListField("questions", index, value)}
                    onAdd={() => addListField("questions")}
                    onRemove={(index: number) => removeListField("questions", index)}
                />
            );
        }

        return (
            <CandidatesStep
                candidates={formValues.candidates}
                onUpdate={(index: number, value: Candidate) => updateListField("candidates", index, value)}
                onAdd={() => addListField("candidates")}
                onRemove={(index: number) => removeListField("candidates", index)}
                onReplace={(next) =>
                    setFormValues((previous) => ({
                        ...previous,
                        candidates: next,
                    }))
                }
            />
        );
    };

    const renderResultContent = () => {
        if (resultStatus === "success") {
            return (
                <div className="flex flex-col items-center gap-4 text-center text-emerald-700">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                        ✅
                    </div>
                    <h2 className="text-3xl font-extrabold text-emerald-800">Game Created!</h2>
                    <p className="text-lg text-emerald-700">
                        {resultMessage || "Your game was created successfully."}
                    </p>
                </div>
            );
        }

        if (resultStatus === "error") {
            return (
                <div className="flex flex-col items-center gap-4 text-center text-rose-700">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
                        ⚠️
                    </div>
                    <h2 className="text-3xl font-extrabold text-rose-800">Something went wrong</h2>
                    <p className="text-lg text-rose-700">
                        {resultMessage || "We couldn't create your game. Please try again."}
                    </p>
                </div>
            );
        }

        return (
            <div className="text-center text-gray-600">
                Submit the form to see the result here.
            </div>
        );
    };

    return (
        <div className="relative w-full min-h-screen overflow-hidden pt-16 md:pt-20">
            {/* <Background leftPoly={leftPoly} rightPoly={rightPoly} /> */}

            <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12">
                <div className="max-w-3xl w-full space-y-8">
                    <div className="text-center text-white">
                        <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                            Create Game
                        </p>
                        <h1 className="text-5xl font-extrabold uppercase leading-tight drop-shadow-[6px_10px_0px_#ff314a]">
                            Build Your Vote
                        </h1>
                        <p className="mt-2 text-lg text-white/80">
                            Set the stage, craft the questions, and reveal the contenders.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="rounded-3xl bg-white/90 p-8 shadow-2xl backdrop-blur-xl space-y-8"
                    >
                        <StepProgress currentStep={currentStep} />

                        {currentStep === STEP_TITLES.length - 1 ? (
                            renderResultContent()
                        ) : (
                            <>
                                {renderStepContent()}

                                <FormNavigation
                                    currentStep={currentStep}
                                    stepIsValid={stepIsValid}
                                    isSubmitting={isSubmitting}
                                    isSubmitStep={currentStep === STEP_TITLES.length - 2}
                                    hideNavigation={currentStep === STEP_TITLES.length - 1}
                                    onPrevious={goToPreviousStep}
                                    onNext={goToNextStep}
                                    onSubmit={handleSubmit}
                                />

                                {errorMessage && (
                                    <p className="text-center text-sm font-semibold text-rose-500">
                                        {errorMessage}
                                    </p>
                                )}
                                {statusMessage && (
                                    <p className="text-center text-sm font-semibold text-emerald-600">
                                        {statusMessage}
                                    </p>
                                )}
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

