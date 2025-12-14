import React, { useRef, useState } from "react";
import JSZip from "jszip";
import type { Candidate } from "../../../types/createGame";

interface CandidatesStepProps {
    candidates: Candidate[];
    onUpdate: (index: number, value: Candidate) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onReplace: (next: Candidate[]) => void;
}

export default function CandidatesStep({
    candidates,
    onUpdate,
    onAdd,
    onRemove,
    onReplace,
}: CandidatesStepProps) {
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const zipInputRef = useRef<HTMLInputElement | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (e.g., max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert("Image size must be less than 5MB");
            return;
        }

        const candidate = candidates[index];
        const candidateName = candidate.name || "";
        
        const currentCandidate: Candidate = {
            ...candidate,
            name: candidateName,
            pictureFile: file,
        };
        
        onUpdate(index, currentCandidate);
    };

    const getPreviewUrl = (candidate: Candidate): string | null => {
        if (candidate.pictureFile) {
            return URL.createObjectURL(candidate.pictureFile);
        }
        return null;
    };

    const toDisplayName = (filename: string) => {
        return filename
            .replace(/\.[^.]+$/, "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    const handleZipChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setIsImporting(true);
        try {
            const zip = await JSZip.loadAsync(file);
            const allowedExt = new Set(["jpg", "jpeg", "png"]);
            const collected: Candidate[] = [...candidates];

            const entries = Object.values(zip.files);
            for (const entry of entries) {
                if (entry.dir) continue;
                const ext = entry.name.split(".").pop()?.toLowerCase() || "";
                if (!allowedExt.has(ext)) continue;

                const blob = await entry.async("blob");
                const mime =
                    ext === "png"
                        ? "image/png"
                        : "image/jpeg";
                const candidateFile = new File([blob], entry.name, { type: mime });
                collected.push({
                    name: toDisplayName(entry.name),
                    pictureFile: candidateFile,
                });
            }

            if (collected.length === candidates.length) {
                alert("No valid images found in the zip (accepted: jpg, jpeg, png).");
                return;
            }

            onReplace(collected);
        } catch (error) {
            console.error("Failed to import zip", error);
            alert("Could not read the zip file. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl bg-white/90 p-4 shadow-inner text-gray-800 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">Bulk import</h3>
                        <button
                            type="button"
                            onClick={() => setShowInfo((prev) => !prev)}
                            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-100"
                            aria-label="About bulk import"
                        >
                            i
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => zipInputRef.current?.click()}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60"
                        disabled={isImporting}
                    >
                        {isImporting ? "Importing..." : "Upload zip"}
                    </button>
                    <input
                        ref={zipInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleZipChange}
                        className="hidden"
                    />
                </div>
                {showInfo && (
                    <div className="rounded-lg border border-gray-200 bg-white/80 p-3 text-sm text-gray-700">
                        Upload a .zip file and we’ll add a candidate for every JPG or PNG
                        inside. We’ll use the image file name as the candidate name, and the
                        image as their picture.
                    </div>
                )}
            </div>

            {candidates.map((candidate, index) => {
                const candidateName = candidate.name || "";
                const previewUrl = getPreviewUrl(candidate);
                
                return (
                    <div
                        key={`candidate-${index}`}
                        className="flex flex-col gap-3 rounded-xl bg-white/80 p-4 shadow-inner text-gray-800"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">
                                Candidate {index + 1}
                            </span>
                            {candidates.length > 1 && (
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
                            value={candidateName}
                            onChange={(event) => {
                                const currentCandidate: Candidate = {
                                    ...candidate,
                                    name: event.target.value,
                                };
                                onUpdate(index, currentCandidate);
                            }}
                            placeholder="e.g. Team Salsa"
                            className="rounded-xl border border-gray-300 px-4 py-3 text-lg text-gray-900 placeholder-gray-500 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                Picture (optional)
                            </label>
                            <input
                                ref={(el) => {
                                    if (el) fileInputRefs.current[index] = el;
                                }}
                                type="file"
                                accept="image/*"
                                onChange={(event) => handleFileChange(index, event)}
                                className="rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {previewUrl && (
                                <div className="mt-2">
                                    <img
                                        src={previewUrl}
                                        alt={candidateName || "Candidate preview"}
                                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            <button
                type="button"
                onClick={onAdd}
                className="w-full rounded-xl border-2 border-dashed border-gray-400 px-4 py-3 text-lg font-semibold text-gray-700 hover:border-gray-300 hover:bg-white/60"
            >
                + Add another candidate
            </button>
        </div>
    );
}

