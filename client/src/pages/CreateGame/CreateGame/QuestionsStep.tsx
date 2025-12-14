import React from "react";

interface QuestionsStepProps {
    questions: string[];
    onUpdate: (index: number, value: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}

export default function QuestionsStep({
    questions,
    onUpdate,
    onAdd,
    onRemove,
}: QuestionsStepProps) {
    return (
        <div className="space-y-4">
            {questions.map((question, index) => (
                <div
                    key={`question-${index}`}
                    className="flex flex-col gap-2 rounded-xl bg-white/80 p-4 shadow-inner text-gray-800"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                            Question {index + 1}
                        </span>
                        {questions.length > 1 && (
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="text-sm font-semibold text-red-500 hover:text-red-400"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        value={question}
                        onChange={(event) => onUpdate(index, event.target.value)}
                        placeholder="e.g. What's the best movie snack?"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-lg text-gray-900 placeholder-gray-500 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
            ))}

            <button
                type="button"
                onClick={onAdd}
                className="w-full rounded-xl border-2 border-dashed border-gray-400 px-4 py-3 text-lg font-semibold text-gray-700 hover:border-gray-300 hover:bg-white/60"
            >
                + Add another question
            </button>
        </div>
    );
}

